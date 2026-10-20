import { useCallback, useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { FaClockRotateLeft, FaPlus, FaTrash, FaVideo, FaWandMagicSparkles } from "react-icons/fa6";
import { getActivitiesByEvent } from "../../../services/activityService";
import {
  CaseAdminSession,
  CaseCalibration,
  CaseSessionSummary,
  CaseStage,
  ClinicalCase,
  deleteClinicalCase,
  fetchClinicalCaseAdminSession,
  fetchClinicalCaseCalibration,
  fetchClinicalCaseSessions,
  fetchClinicalCases,
  generateClinicalCase,
  generateClinicalCaseFollowup,
  refreshClinicalCaseResources,
  updateClinicalCase,
} from "../../../services/clinicalCaseService";
import { toastError, toastSaved } from "../../../utils/toast";
import CaseStageEditor, { emptyStage } from "./CaseStageEditor";
import CaseReviewPanel from "./CaseReviewPanel";

interface Props {
  organizationId: string;
  eventId: string;
}

function errorMessage(error: any) {
  const msg = error?.response?.data?.message;
  return (Array.isArray(msg) ? msg.join(", ") : msg) || error?.message || "Error inesperado";
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);

const MOVE_LABEL: Record<string, string> = {
  open: "Inicio",
  clarify: "Aclara datos",
  deepen: "Profundiza",
  hint: "Pista",
  confront_unsafe: "Confronta riesgo",
  advance: "Avanza etapa",
  close_stage: "Cierra etapa (modela)",
  challenge: "Hace reconsiderar",
  question_necessity: "Cuestiona indicación",
  summary: "Retroalimentación",
};

/**
 * Casos clínicos del curso (agente socrático): generar con IA, revisar y
 * editar, habilitar para los estudiantes y ver sus intentos.
 */
export default function ClinicalCasesTab({ organizationId, eventId }: Props) {
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [loading, setLoading] = useState(false);

  // Generar
  const [generateOpen, setGenerateOpen] = useState(false);
  const [activities, setActivities] = useState<{ value: string; label: string }[]>([]);
  const [genActivity, setGenActivity] = useState<string | null>(null);
  const [genStages, setGenStages] = useState<number | string>(4);
  const [genInstructions, setGenInstructions] = useState("");
  const [generating, setGenerating] = useState(false);

  // Editar
  const [editing, setEditing] = useState<ClinicalCase | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Seguimiento a largo plazo
  const [fuYears, setFuYears] = useState<number | string>(5);
  const [fuStages, setFuStages] = useState<number | string>(3);
  const [fuInstructions, setFuInstructions] = useState("");
  const [generatingFollowup, setGeneratingFollowup] = useState(false);

  // Intentos
  const [sessionsCase, setSessionsCase] = useState<ClinicalCase | null>(null);
  const [sessions, setSessions] = useState<CaseSessionSummary[] | null>(null);
  const [detail, setDetail] = useState<CaseAdminSession | null>(null);
  const [calibration, setCalibration] = useState<CaseCalibration | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCases(await fetchClinicalCases(organizationId, eventId));
    } catch (error) {
      toastError("No se pudieron cargar los casos", errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [organizationId, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const openGenerate = async () => {
    setGenerateOpen(true);
    if (!activities.length) {
      try {
        const list = await getActivitiesByEvent(eventId);
        setActivities(list.map((a) => ({ value: a._id, label: a.name })));
      } catch {
        /* se puede generar con todo el curso */
      }
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const created = await generateClinicalCase(organizationId, eventId, {
        activity_id: genActivity,
        num_stages: Number(genStages) || 4,
        instructions: genInstructions.trim() || undefined,
      });
      toastSaved("Caso generado", "Revísalo antes de habilitarlo para los estudiantes.");
      setGenerateOpen(false);
      setGenInstructions("");
      await load();
      setEditing(created);
    } catch (error) {
      toastError("No se pudo generar el caso", errorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const toggleEnabled = async (c: ClinicalCase, enabled: boolean) => {
    try {
      await updateClinicalCase(organizationId, c._id, { enabled });
      setCases((prev) => prev.map((x) => (x._id === c._id ? { ...x, enabled } : x)));
    } catch (error) {
      toastError("No se pudo actualizar", errorMessage(error));
    }
  };

  const handleDelete = async (c: ClinicalCase) => {
    if (!window.confirm(`¿Eliminar el caso "${c.title}"? Los intentos de los estudiantes se conservan.`))
      return;
    try {
      await deleteClinicalCase(organizationId, c._id);
      setCases((prev) => prev.filter((x) => x._id !== c._id));
    } catch (error) {
      toastError("No se pudo eliminar", errorMessage(error));
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const saved = await updateClinicalCase(organizationId, editing._id, {
        title: editing.title,
        summary: editing.summary,
        presentation: editing.presentation,
        stages: editing.stages,
        followup_stages: editing.followup_stages || [],
        followup_horizon: editing.followup_horizon || "",
        reviewed: editing.reviewed,
        reviewed_by: editing.reviewed_by,
      });
      setCases((prev) => prev.map((x) => (x._id === saved._id ? { ...x, ...saved } : x)));
      setEditing(null);
      toastSaved("Caso guardado");
    } catch (error) {
      toastError("No se pudo guardar", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // Guarda lo editado y vuelve a buscar "dónde estudiarlo" de todos los pasos
  const handleRefreshResources = async () => {
    if (!editing) return;
    setRefreshing(true);
    try {
      await updateClinicalCase(organizationId, editing._id, editableFields(editing));
      const updated = await refreshClinicalCaseResources(organizationId, editing._id);
      setEditing(updated);
      setCases((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
      toastSaved("Recursos actualizados", "Se buscaron de nuevo en los videos del curso.");
    } catch (error) {
      toastError("No se pudieron buscar los recursos", errorMessage(error));
    } finally {
      setRefreshing(false);
    }
  };

  const loadCalibration = (caseId: string) =>
    fetchClinicalCaseCalibration(organizationId, caseId)
      .then(setCalibration)
      .catch(() => setCalibration(null));

  const openSessions = async (c: ClinicalCase) => {
    setSessionsCase(c);
    setSessions(null);
    setDetail(null);
    setCalibration(null);
    loadCalibration(c._id);
    try {
      setSessions(await fetchClinicalCaseSessions(organizationId, c._id));
    } catch (error) {
      toastError("No se pudieron cargar los intentos", errorMessage(error));
      setSessions([]);
    }
  };

  // Tras una revisión docente: actualiza el intento, la lista y la calibración
  const handleReviewed = async (updated: CaseAdminSession) => {
    setDetail(updated);
    if (!sessionsCase) return;
    loadCalibration(sessionsCase._id);
    try {
      setSessions(await fetchClinicalCaseSessions(organizationId, sessionsCase._id));
    } catch {
      /* la lista se refresca al reabrir */
    }
  };

  const openDetail = async (id: string) => {
    try {
      setDetail(await fetchClinicalCaseAdminSession(organizationId, id));
    } catch (error) {
      toastError("No se pudo cargar el intento", errorMessage(error));
    }
  };

  // ─── Edición de etapas ──────────────────────────────────────────────────
  const editableFields = (c: ClinicalCase) => ({
    title: c.title,
    summary: c.summary,
    presentation: c.presentation,
    stages: c.stages,
    followup_stages: c.followup_stages || [],
    followup_horizon: c.followup_horizon || "",
  });

  const setStage = (s: number, patch: Partial<CaseStage>) =>
    setEditing((prev) =>
      prev ? { ...prev, stages: prev.stages.map((x, i) => (i === s ? { ...x, ...patch } : x)) } : prev
    );
  const setFollowupStage = (s: number, patch: Partial<CaseStage>) =>
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            followup_stages: (prev.followup_stages || []).map((x, i) =>
              i === s ? { ...x, ...patch } : x
            ),
          }
        : prev
    );

  // Pasos que pueden condicionar un control: los de la parte aguda y los de
  // controles anteriores
  const conditionOptions = (c: ClinicalCase, upTo: number) => [
    ...c.stages.flatMap((st, si) =>
      st.expected
        .filter((it) => it.id && it.text)
        .map((it) => ({ value: it.id as string, label: `Etapa ${si + 1}: ${it.text}` }))
    ),
    ...(c.followup_stages || []).slice(0, upTo).flatMap((st, si) =>
      st.expected
        .filter((it) => it.id && it.text)
        .map((it) => ({
          value: it.id as string,
          label: `Control ${si + 1}${st.time_label ? ` (${st.time_label})` : ""}: ${it.text}`,
        }))
    ),
  ];

  // Guarda lo editado y genera (o regenera) el seguimiento a largo plazo
  const handleGenerateFollowup = async () => {
    if (!editing) return;
    if (
      editing.followup_stages?.length &&
      !window.confirm("¿Reemplazar el seguimiento actual por uno nuevo generado con IA?")
    )
      return;
    setGeneratingFollowup(true);
    try {
      await updateClinicalCase(organizationId, editing._id, editableFields(editing));
      const updated = await generateClinicalCaseFollowup(organizationId, editing._id, {
        years: Number(fuYears) || 5,
        num_stages: Number(fuStages) || 3,
        instructions: fuInstructions.trim() || undefined,
      });
      setEditing(updated);
      setCases((prev) => prev.map((x) => (x._id === updated._id ? { ...x, ...updated } : x)));
      toastSaved("Seguimiento generado", "Revisa los controles y las consecuencias.");
    } catch (error) {
      toastError("No se pudo generar el seguimiento", errorMessage(error));
    } finally {
      setGeneratingFollowup(false);
    }
  };

  const itemText = (snapshot: CaseAdminSession["case_snapshot"], stage: number, id: string) =>
    snapshot.stages[stage]?.expected.find((i) => i.id === id)?.text || id;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Title order={4}>Casos clínicos</Title>
          <Text size="sm" c="dimmed">
            El estudiante resuelve el caso etapa por etapa con un tutor socrático que lo guía con
            preguntas sin decirle si acertó. Al final ve su porcentaje en diagnóstico y acciones.
          </Text>
        </div>
        <Button leftSection={<FaWandMagicSparkles size={14} />} onClick={openGenerate}>
          Generar caso con IA
        </Button>
      </Group>

      <Alert color="yellow" variant="light">
        Los casos generados con IA son de prueba: revisa la presentación y los pasos esperados
        antes de habilitarlos. Cuando un profesional certificado lo valide, márcalo como
        "Revisado".
      </Alert>

      {loading ? (
        <Loader />
      ) : !cases.length ? (
        <Text c="dimmed" size="sm">
          Este curso aún no tiene casos clínicos.
        </Text>
      ) : (
        cases.map((c) => (
          <Card key={c._id} withBorder radius="md" p="md">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <div style={{ minWidth: 0 }}>
                <Text fw={600}>{c.title}</Text>
                {c.summary && (
                  <Text size="sm" c="dimmed">
                    {c.summary}
                  </Text>
                )}
                <Group gap={6} mt={6}>
                  <Badge size="sm" variant="light">
                    {c.stages.length} etapas
                  </Badge>
                  {!c.stages.some((st) => st.expected.some((i) => i.category === "diagnosis")) && (
                    <Badge size="sm" variant="light" color="orange">
                      Sin paso de diagnóstico
                    </Badge>
                  )}
                  {!!c.followup_stages?.length && (
                    <Badge size="sm" variant="light" color="indigo">
                      Seguimiento {c.followup_horizon || ""} · {c.followup_stages.length} controles
                    </Badge>
                  )}
                  <Badge size="sm" variant="light" color={c.source === "ai" ? "violet" : "gray"}>
                    {c.source === "ai" ? "Generado por IA" : "Manual"}
                  </Badge>
                  <Badge size="sm" variant="light" color={c.reviewed ? "teal" : "orange"}>
                    {c.reviewed ? `Revisado${c.reviewed_by ? ` · ${c.reviewed_by}` : ""}` : "Sin revisar"}
                  </Badge>
                  <Badge size="sm" variant="outline" color="gray">
                    {c.completed_sessions || 0}/{c.sessions || 0} intentos terminados
                  </Badge>
                </Group>
              </div>
              <Stack gap="xs" align="flex-end">
                <Switch
                  label="Visible"
                  checked={c.enabled}
                  onChange={(e) => toggleEnabled(c, e.currentTarget.checked)}
                />
                <Group gap="xs">
                  <Button size="xs" variant="light" onClick={() => setEditing(c)}>
                    Revisar / editar
                  </Button>
                  <Button size="xs" variant="default" onClick={() => openSessions(c)}>
                    Intentos
                  </Button>
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(c)} aria-label="Eliminar">
                    <FaTrash size={14} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Group>
          </Card>
        ))
      )}

      {/* ─── Generar ─── */}
      <Modal
        opened={generateOpen}
        onClose={() => !generating && setGenerateOpen(false)}
        title="Generar caso clínico con IA"
        centered
      >
        <Stack>
          <Select
            label="Basado en"
            description="La IA usa la transcripción y los documentos del contenido elegido"
            placeholder="Todo el curso"
            data={activities}
            value={genActivity}
            onChange={setGenActivity}
            clearable
            searchable
          />
          <NumberInput
            label="Etapas de la enfermedad"
            min={2}
            max={6}
            value={genStages}
            onChange={setGenStages}
          />
          <Textarea
            label="Indicaciones (opcional)"
            placeholder="Ej: paciente adulto mayor con comorbilidad renal; enfocar en el ajuste del tratamiento"
            autosize
            minRows={2}
            value={genInstructions}
            onChange={(e) => setGenInstructions(e.currentTarget.value)}
          />
          <Text size="xs" c="dimmed">
            Puede tardar hasta un minuto. El caso queda oculto hasta que lo habilites.
          </Text>
          <Button onClick={handleGenerate} loading={generating}>
            Generar
          </Button>
        </Stack>
      </Modal>

      {/* ─── Editar ─── */}
      <Modal
        opened={!!editing}
        onClose={() => !saving && setEditing(null)}
        title="Revisar caso clínico"
        size="xl"
      >
        {editing && (
          <Stack gap="md">
            <TextInput
              label="Título (para el estudiante)"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.currentTarget.value })}
            />
            <TextInput
              label="Resumen (sin revelar el diagnóstico)"
              value={editing.summary}
              onChange={(e) => setEditing({ ...editing, summary: e.currentTarget.value })}
            />
            <Textarea
              label="Presentación del paciente"
              autosize
              minRows={3}
              value={editing.presentation}
              onChange={(e) => setEditing({ ...editing, presentation: e.currentTarget.value })}
            />

            {editing.stages.map((stage, s) => (
              <CaseStageEditor
                key={stage.id || s}
                stage={stage}
                index={s}
                canRemove={editing.stages.length > 1}
                onRemove={() =>
                  setEditing({ ...editing, stages: editing.stages.filter((_, i) => i !== s) })
                }
                onChange={(patch) => setStage(s, patch)}
              />
            ))}
            <Group>
              <Button
                variant="light"
                leftSection={<FaPlus size={12} />}
                onClick={() => setEditing({ ...editing, stages: [...editing.stages, emptyStage()] })}
              >
                Agregar etapa
              </Button>
              <Button
                variant="default"
                leftSection={<FaVideo size={12} />}
                loading={refreshing}
                disabled={saving}
                onClick={handleRefreshResources}
              >
                Buscar recursos en los videos
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              Cada paso enlaza la actividad y el minuto del video donde se explica: el estudiante
              los ve en la retroalimentación final para estudiar lo que le faltó.
            </Text>

            <Divider
              my="sm"
              label="Parte 2 · Seguimiento a largo plazo"
              labelPosition="center"
            />
            <Text size="xs" c="dimmed">
              Al terminar el caso, el estudiante acompaña al paciente en controles a lo largo de los
              años. Si omite un paso, su consecuencia aparece en el siguiente control, y los pasos
              condicionales solo se esperan si antes se omitió algo (p. ej. referir a oftalmología
              si no pidió el tamizaje).
            </Text>
            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Stack gap="xs">
                <Group align="flex-end" grow>
                  <NumberInput label="Años de seguimiento" min={1} max={10} value={fuYears} onChange={setFuYears} />
                  <NumberInput label="Controles" min={2} max={5} value={fuStages} onChange={setFuStages} />
                  <Button
                    leftSection={<FaWandMagicSparkles size={13} />}
                    loading={generatingFollowup}
                    disabled={saving}
                    onClick={handleGenerateFollowup}
                  >
                    {editing.followup_stages?.length ? "Regenerar con IA" : "Generar seguimiento con IA"}
                  </Button>
                </Group>
                <Textarea
                  placeholder="Indicaciones (opcional): ej. mala adherencia al año; enfocar en complicaciones microvasculares"
                  autosize
                  minRows={1}
                  value={fuInstructions}
                  onChange={(e) => setFuInstructions(e.currentTarget.value)}
                />
                <Text size="xs" c="dimmed">
                  La IA también propone las consecuencias a largo plazo de omitir pasos de la parte
                  aguda. Puede tardar hasta un minuto.
                </Text>
              </Stack>
            </Paper>
            {!!editing.followup_stages?.length && (
              <TextInput
                label="Horizonte (lo ve el estudiante)"
                placeholder="Ej: 5 años"
                value={editing.followup_horizon || ""}
                onChange={(e) => setEditing({ ...editing, followup_horizon: e.currentTarget.value })}
                maw={240}
              />
            )}
            {(editing.followup_stages || []).map((stage, s) => (
              <CaseStageEditor
                key={stage.id || `f${s}`}
                followup
                stage={stage}
                index={s}
                conditionOptions={conditionOptions(editing, s)}
                canRemove
                onRemove={() =>
                  setEditing({
                    ...editing,
                    followup_stages: (editing.followup_stages || []).filter((_, i) => i !== s),
                  })
                }
                onChange={(patch) => setFollowupStage(s, patch)}
              />
            ))}
            <Button
              variant="light"
              leftSection={<FaClockRotateLeft size={12} />}
              style={{ alignSelf: "flex-start" }}
              onClick={() =>
                setEditing({
                  ...editing,
                  followup_stages: [...(editing.followup_stages || []), emptyStage(true)],
                })
              }
            >
              Agregar control
            </Button>

            <Paper withBorder p="sm" radius="md">
              <Group align="flex-end">
                <Switch
                  label="Revisado por un profesional certificado"
                  checked={editing.reviewed}
                  onChange={(e) => setEditing({ ...editing, reviewed: e.currentTarget.checked })}
                />
                <TextInput
                  placeholder="Nombre del profesional"
                  value={editing.reviewed_by}
                  onChange={(e) => setEditing({ ...editing, reviewed_by: e.currentTarget.value })}
                  style={{ flex: 1 }}
                />
              </Group>
            </Paper>

            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditing(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} loading={saving}>
                Guardar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* ─── Intentos ─── */}
      <Modal
        opened={!!sessionsCase}
        onClose={() => setSessionsCase(null)}
        title={detail ? `Intento de ${detail.user_name || detail.email}` : `Intentos · ${sessionsCase?.title || ""}`}
        size="xl"
      >
        {detail ? (
          <Stack gap="sm">
            <Button size="xs" variant="subtle" style={{ alignSelf: "flex-start" }} onClick={() => setDetail(null)}>
              ← Volver a la lista
            </Button>
            <Group gap="xs">
              <Badge variant="light" color="grape">Dx {pct(detail.scores?.diagnosis)}</Badge>
              <Badge variant="light">Acciones {pct(detail.scores?.actions)}</Badge>
              <Badge variant="light" color="teal">General {pct(detail.scores?.overall)}</Badge>
              {detail.part === "followup" && (
                <Badge variant="light" color="indigo">
                  Seguimiento {pct(detail.scores?.followup)}
                </Badge>
              )}
              {detail.scores?.precision !== undefined && (
                <Badge variant="light" color="orange">
                  Precisión {pct(detail.scores?.precision)}
                </Badge>
              )}
              {!!detail.scores?.unsafe_count && (
                <Badge variant="light" color="red">
                  {detail.scores.unsafe_count} decisión(es) de riesgo · tope{" "}
                  {pct(detail.scores.cap)}
                </Badge>
              )}
            </Group>
            {detail.status === "completed" && (
              <CaseReviewPanel
                organizationId={organizationId}
                session={detail}
                onSaved={handleReviewed}
              />
            )}
            <Text size="sm" fw={600}>
              Conversación
            </Text>
            {detail.messages.map((m, i) => (
              <Paper key={i} withBorder p="xs" radius="md" bg={m.role === "student" ? "blue.0" : undefined}>
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={600}>
                    {m.role === "student" ? "Estudiante" : "Tutor"} · etapa {m.stage + 1}
                  </Text>
                  {m.move && (
                    <Badge size="xs" variant="outline">
                      {MOVE_LABEL[m.move] || m.move}
                    </Badge>
                  )}
                </Group>
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {m.content}
                </Text>
                {m.eval && (
                  <Text size="xs" c="dimmed" mt={4}>
                    {m.eval.covered.length > 0 &&
                      `✅ ${m.eval.covered.map((id) => itemText(detail.case_snapshot, m.stage, id)).join("; ")}  `}
                    {m.eval.partial.length > 0 &&
                      `🟡 ${m.eval.partial.map((id) => itemText(detail.case_snapshot, m.stage, id)).join("; ")}  `}
                    {m.eval.misconceptions.length > 0 && `⚠ ${m.eval.misconceptions.join("; ")}  `}
                    {m.eval.unsafe.length > 0 && `⛔ ${m.eval.unsafe.join("; ")}  `}
                    {!!m.eval.unnecessary?.length && `🔍 Sin indicación: ${m.eval.unnecessary.join("; ")}  `}
                    {!!m.eval.evidence && Object.keys(m.eval.evidence).length > 0 && (
                      <>
                        <br />
                        Evidencia:{" "}
                        {Object.entries(m.eval.evidence)
                          .map(([id, q]) => `${itemText(detail.case_snapshot, m.stage, id)} ← «${q}»`)
                          .join(" · ")}
                      </>
                    )}
                  </Text>
                )}
              </Paper>
            ))}
          </Stack>
        ) : sessions === null ? (
          <Loader />
        ) : !sessions.length ? (
          <Text size="sm" c="dimmed">
            Aún no hay intentos.
          </Text>
        ) : (
          <Stack gap="sm">
          {calibration && (
            <Alert color="blue" variant="light" title="Calibración del evaluador (IA vs. docente)">
              {calibration.reviewed_sessions ? (
                <Text size="sm">
                  {calibration.reviewed_sessions} intento(s) revisado(s) ·{" "}
                  <b>concordancia {pct(calibration.agreement)}</b> en {calibration.items_checked}{" "}
                  pasos · la IA dio crédito de más {calibration.false_positive} vez(es) y de menos{" "}
                  {calibration.false_negative} · riesgos descartados {calibration.dismissed_unsafe}{" "}
                  · imprecisiones descartadas {calibration.dismissed_unnecessary}
                </Text>
              ) : (
                <Text size="sm">
                  Aún no hay intentos revisados. Abre uno terminado y confirma o corrige lo que
                  evaluó la IA: así medimos qué tan confiable es.
                </Text>
              )}
            </Alert>
          )}
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Estudiante</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Turnos</Table.Th>
                <Table.Th>Dx</Table.Th>
                <Table.Th>Acciones</Table.Th>
                <Table.Th>General</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.map((s) => (
                <Table.Tr key={s._id} style={{ cursor: "pointer" }} onClick={() => openDetail(s._id)}>
                  <Table.Td>
                    <Text size="sm">
                      {s.user_name || s.email}
                      {s.part === "followup" && (
                        <Badge size="xs" ml={6} variant="light" color="indigo">
                          Seguimiento
                        </Badge>
                      )}
                      {s.reviewed && (
                        <Badge size="xs" ml={6} variant="light" color="teal">
                          Revisado
                        </Badge>
                      )}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {s.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {s.status === "completed" ? (
                      <Badge color="teal" variant="light">Terminado</Badge>
                    ) : (
                      <Badge color="yellow" variant="light">
                        Etapa {s.stage}/{s.total_stages}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>{s.turns}</Table.Td>
                  <Table.Td>{pct(s.scores?.diagnosis)}</Table.Td>
                  <Table.Td>{pct(s.scores?.actions)}</Table.Td>
                  <Table.Td>{pct(s.scores?.overall)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
