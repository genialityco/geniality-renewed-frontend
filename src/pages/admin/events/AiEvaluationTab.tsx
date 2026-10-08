// src/pages/admin/events/AiEvaluationTab.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  AiEvaluationContext,
  AiEvaluationContextsResponse,
  AiEvaluationDifficulty,
  AiEvaluationResult,
  COURSE_KEY,
  deleteAiEvaluationContext,
  fetchAiEvaluationContexts,
  fetchAiEvaluationEventResults,
  generateAiEvaluationDraft,
  saveAiEvaluationContext,
} from "../../../services/aiEvaluationService";
import {
  DocumentService,
  Document as CourseDocument,
} from "../../../services/documentService";

interface Props {
  organizationId: string;
  eventId: string;
}

interface EditTarget {
  key: string; // id del módulo o COURSE_KEY
  name: string;
  context: AiEvaluationContext | null;
}

interface FormState {
  enabled: boolean;
  content: string;
  objectives: string;
  instructions: string;
  fixedQuestions: string;
  documentIds: string[];
  numQuestions: number | "";
  passingScore: number | "";
  difficulty: AiEvaluationDifficulty;
}

const DIFFICULTY_OPTIONS = [
  { value: "mixed", label: "Mixta" },
  { value: "basic", label: "Básica" },
  { value: "intermediate", label: "Intermedia" },
  { value: "advanced", label: "Avanzada" },
];

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

const errorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || fallback;

function toForm(ctx: AiEvaluationContext | null): FormState {
  return {
    enabled: ctx?.enabled ?? true,
    content: ctx?.content || "",
    objectives: (ctx?.learning_objectives || []).join("\n"),
    instructions: ctx?.instructions || "",
    fixedQuestions: (ctx?.fixed_questions || []).join("\n"),
    documentIds: ctx?.document_ids || [],
    numQuestions: ctx?.num_questions ?? "",
    passingScore: ctx?.passing_score ?? "",
    difficulty: ctx?.difficulty || "mixed",
  };
}

function ContextBadge({ ctx, isCourse }: { ctx: AiEvaluationContext | null; isCourse: boolean }) {
  if (!isCourse && ctx && !ctx.enabled) {
    return <Badge color="gray" variant="light">Deshabilitado</Badge>;
  }
  if (ctx?.content?.trim()) {
    return <Badge color="teal" variant="light">Contexto personalizado</Badge>;
  }
  return <Badge color="blue" variant="light">Contenido automático</Badge>;
}

export default function AiEvaluationTab({ organizationId, eventId }: Props) {
  const [data, setData] = useState<AiEvaluationContextsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingCourse, setTogglingCourse] = useState(false);
  const [documents, setDocuments] = useState<CourseDocument[]>([]);
  const [editing, setEditing] = useState<EditTarget | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchAiEvaluationContexts(organizationId, eventId));
    } catch (error) {
      notifications.show({
        title: "Error",
        message: errorMessage(error, "No se pudo cargar la configuración"),
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [organizationId, eventId]);

  useEffect(() => {
    load();
    DocumentService.getDocumentsByOrganization(organizationId, { eventId })
      .then((docs) => setDocuments((docs || []).filter((d) => d.active)))
      .catch(() => setDocuments([]));
  }, [load, organizationId, eventId]);

  const toggleCourse = async (enabled: boolean) => {
    setTogglingCourse(true);
    try {
      await saveAiEvaluationContext(organizationId, eventId, COURSE_KEY, { enabled });
      await load();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: errorMessage(error, "No se pudo actualizar"),
        color: "red",
      });
    } finally {
      setTogglingCourse(false);
    }
  };

  if (loading) return <Loader />;
  if (!data) return <Text c="dimmed">No se pudo cargar la configuración.</Text>;

  return (
    <Tabs defaultValue="contexto">
      <Tabs.List>
        <Tabs.Tab value="contexto">Configuración y contexto</Tabs.Tab>
        <Tabs.Tab value="resultados">Resultados</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="contexto" pt="md">
        <Stack>
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" wrap="nowrap">
              <div>
                <Title order={4}>Evaluación por WhatsApp con IA</Title>
                <Text size="sm" c="dimmed">
                  Muestra el botón “Evaluar tus conocimientos” en el curso. La IA
                  hace preguntas abiertas por WhatsApp sobre el módulo elegido,
                  califica cada respuesta y entrega una evaluación final.
                </Text>
              </div>
              <Switch
                size="md"
                checked={data.enabled}
                disabled={togglingCourse}
                onChange={(e) => toggleCourse(e.currentTarget.checked)}
                label={data.enabled ? "Habilitada" : "Deshabilitada"}
              />
            </Group>
          </Paper>

          <Alert variant="light" color="blue">
            Si un módulo no tiene contexto personalizado, la IA usa su contenido
            automático: descripciones, transcripciones de los videos y documentos
            asociados. Define un contexto para controlar exactamente qué se evalúa.
            Por defecto: {data.defaults.num_questions} preguntas, aprobación con{" "}
            {data.defaults.passing_score}/100.
          </Alert>

          <Table withTableBorder verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Alcance</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Preguntas</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[
                { key: COURSE_KEY, name: "Todo el curso", context: data.course },
                ...data.modules.map((m) => ({ key: m.id, name: m.name, context: m.context })),
              ].map((row) => (
                <Table.Tr key={row.key}>
                  <Table.Td>
                    <Text fw={row.key === COURSE_KEY ? 700 : 500} size="sm">
                      {row.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ContextBadge ctx={row.context} isCourse={row.key === COURSE_KEY} />
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {row.context?.num_questions ?? data.defaults.num_questions}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Button size="xs" variant="light" onClick={() => setEditing(row)}>
                      Editar
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>

        <ContextEditor
          organizationId={organizationId}
          eventId={eventId}
          target={editing}
          documents={documents}
          defaults={data.defaults}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      </Tabs.Panel>

      <Tabs.Panel value="resultados" pt="md">
        <ResultsPanel organizationId={organizationId} eventId={eventId} />
      </Tabs.Panel>
    </Tabs>
  );
}

// ─── Editor de contexto ──────────────────────────────────────────────────

function ContextEditor({
  organizationId,
  eventId,
  target,
  documents,
  defaults,
  onClose,
  onSaved,
}: {
  organizationId: string;
  eventId: string;
  target: EditTarget | null;
  documents: CourseDocument[];
  defaults: { num_questions: number; passing_score: number };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(toForm(null));
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const isCourse = target?.key === COURSE_KEY;

  useEffect(() => {
    if (target) setForm(toForm(target.context));
  }, [target]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const documentOptions = useMemo(
    () => documents.map((d) => ({ value: d._id, label: d.name })),
    [documents]
  );

  if (!target) return null;

  const generate = async () => {
    if (
      form.content.trim() &&
      !window.confirm("Esto reemplazará el contexto y los objetivos actuales. ¿Continuar?")
    ) {
      return;
    }
    setGenerating(true);
    try {
      const draft = await generateAiEvaluationDraft(organizationId, eventId, target.key);
      setForm((f) => ({
        ...f,
        content: draft.content,
        objectives: draft.learning_objectives.join("\n"),
      }));
      notifications.show({
        message: "Borrador generado. Revísalo y ajústalo antes de guardar.",
        color: "teal",
      });
    } catch (error) {
      notifications.show({
        title: "No se pudo generar el borrador",
        message: errorMessage(error, "Intenta de nuevo"),
        color: "red",
      });
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveAiEvaluationContext(organizationId, eventId, target.key, {
        // El switch del curso se maneja aparte (habilita la funcionalidad)
        ...(isCourse ? {} : { enabled: form.enabled }),
        content: form.content,
        learning_objectives: lines(form.objectives),
        instructions: form.instructions,
        fixed_questions: lines(form.fixedQuestions),
        document_ids: form.documentIds,
        num_questions: form.numQuestions === "" ? null : Number(form.numQuestions),
        passing_score: form.passingScore === "" ? null : Number(form.passingScore),
        difficulty: form.difficulty,
      });
      notifications.show({ message: "Contexto guardado", color: "teal" });
      await onSaved();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: errorMessage(error, "No se pudo guardar"),
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm("¿Eliminar el contexto personalizado? Se usará el contenido automático.")) {
      return;
    }
    setSaving(true);
    try {
      if (isCourse) {
        // Conserva el estado habilitado del curso; solo limpia el contexto
        await saveAiEvaluationContext(organizationId, eventId, COURSE_KEY, {
          content: "",
          learning_objectives: [],
          instructions: "",
          fixed_questions: [],
          document_ids: [],
          num_questions: null,
          passing_score: null,
          difficulty: "mixed",
        });
      } else {
        await deleteAiEvaluationContext(organizationId, eventId, target.key);
      }
      await onSaved();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: errorMessage(error, "No se pudo eliminar"),
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      opened={!!target}
      onClose={onClose}
      position="right"
      size="xl"
      title={<Title order={4}>Contexto de evaluación · {target.name}</Title>}
    >
      <Stack>
        {!isCourse && (
          <Switch
            checked={form.enabled}
            onChange={(e) => set("enabled", e.currentTarget.checked)}
            label="Ofrecer este módulo en la evaluación"
          />
        )}

        <Group justify="space-between" align="flex-end">
          <Text size="sm" c="dimmed" style={{ flex: 1 }}>
            Texto de referencia que usará la IA para preguntar y calificar. Si
            lo dejas vacío se usa el contenido automático del{" "}
            {isCourse ? "curso" : "módulo"}.
          </Text>
          <Button variant="light" color="grape" loading={generating} onClick={generate}>
            ✨ Generar borrador con IA
          </Button>
        </Group>

        <Textarea
          label="Contexto"
          placeholder="Conceptos clave, definiciones, procesos, ejemplos..."
          autosize
          minRows={12}
          maxRows={28}
          value={form.content}
          onChange={(e) => set("content", e.currentTarget.value)}
        />
        <Textarea
          label="Objetivos de aprendizaje"
          description="Uno por línea. Las preguntas se reparten entre estos objetivos."
          autosize
          minRows={3}
          value={form.objectives}
          onChange={(e) => set("objectives", e.currentTarget.value)}
        />
        <MultiSelect
          label="Documentos de apoyo"
          description="Su texto se agrega al contexto."
          data={documentOptions}
          value={form.documentIds}
          onChange={(v) => set("documentIds", v)}
          searchable
          clearable
          nothingFoundMessage="No hay documentos asociados a este curso"
        />
        <Textarea
          label="Indicaciones para la IA"
          placeholder='Ej. "Enfócate en casos clínicos", "No preguntes fechas"'
          autosize
          minRows={2}
          value={form.instructions}
          onChange={(e) => set("instructions", e.currentTarget.value)}
        />
        <Textarea
          label="Preguntas obligatorias"
          description="Una por línea. Se incluyen siempre, dentro del total de preguntas."
          autosize
          minRows={2}
          value={form.fixedQuestions}
          onChange={(e) => set("fixedQuestions", e.currentTarget.value)}
        />
        <Group grow>
          <NumberInput
            label="Número de preguntas"
            placeholder={String(defaults.num_questions)}
            min={1}
            max={15}
            value={form.numQuestions}
            onChange={(v) => set("numQuestions", v === "" ? "" : Number(v))}
          />
          <NumberInput
            label="Puntaje para aprobar"
            placeholder={String(defaults.passing_score)}
            min={0}
            max={100}
            suffix="/100"
            value={form.passingScore}
            onChange={(v) => set("passingScore", v === "" ? "" : Number(v))}
          />
          <Select
            label="Dificultad"
            data={DIFFICULTY_OPTIONS}
            value={form.difficulty}
            onChange={(v) => set("difficulty", (v as AiEvaluationDifficulty) || "mixed")}
            allowDeselect={false}
          />
        </Group>

        <Group justify="space-between" mt="md">
          <Button
            variant="subtle"
            color="red"
            onClick={reset}
            disabled={saving || !target.context}
          >
            Usar contenido automático
          </Button>
          <Group>
            <Button variant="default" onClick={onClose}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={save}>
              Guardar
            </Button>
          </Group>
        </Group>
      </Stack>
    </Drawer>
  );
}

// ─── Resultados ──────────────────────────────────────────────────────────

function ResultsPanel({ organizationId, eventId }: Props) {
  const [results, setResults] = useState<AiEvaluationResult[] | null>(null);
  const [selected, setSelected] = useState<AiEvaluationResult | null>(null);

  useEffect(() => {
    fetchAiEvaluationEventResults(organizationId, eventId)
      .then(setResults)
      .catch(() => setResults([]));
  }, [organizationId, eventId]);

  if (!results) return <Loader />;
  if (!results.length) {
    return <Text c="dimmed">Aún no hay evaluaciones completadas en este curso.</Text>;
  }

  return (
    <>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Estudiante</Table.Th>
            <Table.Th>Módulo</Table.Th>
            <Table.Th>Puntaje</Table.Th>
            <Table.Th>Resultado</Table.Th>
            <Table.Th>Fecha</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {results.map((r) => (
            <Table.Tr key={r._id}>
              <Table.Td>{r.user_name || "—"}</Table.Td>
              <Table.Td>{r.module_name}</Table.Td>
              <Table.Td>{r.score}/100</Table.Td>
              <Table.Td>
                <Badge color={r.passed ? "teal" : "red"} variant="light">
                  {r.passed ? "Aprobada" : "No aprobada"}
                </Badge>
              </Table.Td>
              <Table.Td>{new Date(r.created_at).toLocaleString()}</Table.Td>
              <Table.Td>
                <Button size="xs" variant="subtle" onClick={() => setSelected(r)}>
                  Ver detalle
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal
        opened={!!selected}
        onClose={() => setSelected(null)}
        size="lg"
        title={selected ? `${selected.user_name || "Estudiante"} · ${selected.module_name}` : ""}
      >
        {selected && (
          <Stack gap="sm">
            <Group>
              <Badge size="lg" color={selected.passed ? "teal" : "red"}>
                {selected.score}/100
              </Badge>
              <Text size="sm" c="dimmed">
                {selected.correct_answers}/{selected.total_questions} respuestas
                aprobadas · mínimo para aprobar {selected.passing_score}/100
              </Text>
            </Group>
            {selected.summary && <Text size="sm">{selected.summary}</Text>}
            {selected.strengths.length > 0 && (
              <Text size="sm">
                <b>Fortalezas:</b> {selected.strengths.join(" · ")}
              </Text>
            )}
            {selected.improvements.length > 0 && (
              <Text size="sm">
                <b>Para reforzar:</b> {selected.improvements.join(" · ")}
              </Text>
            )}
            {selected.questions.map((q, i) => (
              <Paper key={i} withBorder p="sm" radius="md">
                <Text size="sm" fw={600}>
                  {i + 1}. {q.question}
                </Text>
                <Text size="sm" mt={4}>
                  <b>Respuesta:</b> {q.answer}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {q.score}/100 — {q.feedback}
                </Text>
              </Paper>
            ))}
          </Stack>
        )}
      </Modal>
    </>
  );
}
