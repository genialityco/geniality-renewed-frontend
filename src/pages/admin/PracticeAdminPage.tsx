// src/pages/admin/PracticeAdminPage.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Drawer,
  Group,
  List,
  Loader,
  Paper,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { FaMagnifyingGlass, FaPaperPlane, FaRotateRight, FaWhatsapp } from "react-icons/fa6";
import { useOrganization } from "../../context/OrganizationContext";
import {
  PracticePreview,
  PracticeSessionDetail,
  PracticeSessionStatus,
  PracticeSessionSummary,
  fetchPracticeAdminOrganizations,
  fetchPracticeSession,
  fetchPracticeSessions,
  previewPractice,
  sendPractice,
} from "../../services/whatsappPracticeService";
import { toastError, toastSaved } from "../../utils/toast";

const STATUS: Record<PracticeSessionStatus, { label: string; color: string }> = {
  invited: { label: "Invitado", color: "blue" },
  choosing: { label: "Eligiendo actividad", color: "cyan" },
  in_progress: { label: "En curso", color: "yellow" },
  completed: { label: "Completado", color: "teal" },
  declined: { label: "Rechazado", color: "gray" },
  cancelled: { label: "Cancelado", color: "gray" },
  expired: { label: "Vencido", color: "gray" },
};

const TYPE_LABEL: Record<string, string> = {
  open: "Abierta",
  single_choice: "Opción única",
  multiple_choice: "Selección múltiple",
  true_false: "V/F",
  fill_blank: "Completar",
  ordering: "Ordenar",
  matching: "Relacionar",
};

const PROGRESS_OPTIONS = [
  { value: "100", label: "Actividades completadas (100%)" },
  { value: "50", label: "Vistas al menos al 50%" },
  { value: "25", label: "Iniciadas (25%)" },
];

const errorMessage = (error: any, fallback?: string) =>
  error?.response?.data?.message || fallback;

const formatDate = (value?: string) => (value ? new Date(value).toLocaleString() : "—");

function StatusBadge({ status }: { status: PracticeSessionStatus }) {
  const s = STATUS[status] || { label: status, color: "gray" };
  return (
    <Badge color={s.color} variant="light">
      {s.label}
    </Badge>
  );
}

function SessionDetail({ session }: { session: PracticeSessionDetail }) {
  return (
    <Stack gap="md">
      <Group gap="xs">
        <StatusBadge status={session.status} />
        {session.score !== null && (
          <Badge variant="outline">
            Puntaje {session.score}/100 · {session.correct_count}/{session.answered_count} correctas
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed">
        Invitado: {formatDate(session.invited_at)} · Inicio: {formatDate(session.started_at)} · Fin:{" "}
        {formatDate(session.finished_at)}
      </Text>

      {session.questions.map((q, i) => {
        const r = q.response;
        return (
          <Paper key={i} withBorder p="sm" radius="md">
            <Stack gap={4}>
              <Group gap={6}>
                <Text size="sm" fw={600}>
                  {i + 1}.
                </Text>
                <Badge size="xs">{TYPE_LABEL[q.type] || q.type}</Badge>
                <Text size="xs" c="dimmed">
                  {q.event_name} · {q.activity_name}
                </Text>
              </Group>
              <Text size="sm">{q.question}</Text>
              {q.type === "matching" ? (
                <Text size="xs" c="dimmed">
                  Correcta: {q.pairs.map((p) => `${p.left} → ${p.right}`).join("; ")}
                </Text>
              ) : (
                <Text size="xs" c="dimmed">
                  Correcta: {q.answer}
                </Text>
              )}
              {!r ? (
                <Text size="xs" c="dimmed" fs="italic">
                  Sin responder
                </Text>
              ) : (
                <Group gap={6} align="flex-start" wrap="nowrap">
                  <Badge
                    size="sm"
                    color={r.skipped ? "gray" : r.correct ? "teal" : r.score > 0 ? "yellow" : "red"}
                  >
                    {r.skipped ? "Saltada" : `${r.score}/100`}
                  </Badge>
                  <Stack gap={2}>
                    {!r.skipped && (
                      <Text size="sm">
                        <b>Respuesta:</b> {r.raw}
                      </Text>
                    )}
                    {r.feedback && (
                      <Text size="xs" c="dimmed">
                        {r.feedback}
                      </Text>
                    )}
                  </Stack>
                </Group>
              )}
            </Stack>
          </Paper>
        );
      })}

      {session.messages?.length > 0 && (
        <details>
          <summary style={{ cursor: "pointer" }}>
            <Text span size="sm" fw={500}>
              Conversación ({session.messages.length} mensajes)
            </Text>
          </summary>
          <Stack gap={6} mt="xs">
            {session.messages.map((m, i) => (
              <Paper
                key={i}
                p="xs"
                radius="md"
                bg={m.role === "user" ? "green.0" : "gray.0"}
                style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "85%" }}
              >
                <Text size="xs" style={{ whiteSpace: "pre-wrap" }}>
                  {m.content}
                </Text>
              </Paper>
            ))}
          </Stack>
        </details>
      )}
    </Stack>
  );
}

export default function PracticeAdminPage() {
  const { organization } = useOrganization();

  // Organización del simulacro: por defecto la actual; se puede elegir
  // cualquiera que administre el usuario
  const [orgId, setOrgId] = useState<string | null>(organization?._id ?? null);
  const [adminOrgs, setAdminOrgs] = useState<{ _id: string; name: string }[]>([]);

  useEffect(() => {
    if (!orgId && organization?._id) setOrgId(organization._id);
  }, [organization?._id, orgId]);

  useEffect(() => {
    fetchPracticeAdminOrganizations()
      .then(setAdminOrgs)
      .catch((error) => console.warn("No se pudieron cargar las organizaciones:", error));
  }, []);

  const orgOptions = [
    ...adminOrgs.map((o) => ({ value: o._id, label: o.name })),
    // La actual siempre aparece (aunque la consulta falle)
    ...(organization?._id && !adminOrgs.some((o) => o._id === organization._id)
      ? [{ value: organization._id, label: organization.name || "Organización actual" }]
      : []),
  ];

  // Envío
  const [email, setEmail] = useState("");
  const [minProgress, setMinProgress] = useState("100");
  // Curso del simulacro (obligatorio): las preguntas salen solo de este curso
  const [eventId, setEventId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PracticePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);

  // Historial
  const [sessions, setSessions] = useState<PracticeSessionSummary[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [filterEmail, setFilterEmail] = useState("");
  const [detail, setDetail] = useState<PracticeSessionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadSessions = useCallback(
    async (emailFilter?: string) => {
      if (!orgId) return;
      setLoadingSessions(true);
      try {
        setSessions(await fetchPracticeSessions(orgId, emailFilter));
      } catch (error) {
        toastError("No se pudo cargar el historial", errorMessage(error));
      } finally {
        setLoadingSessions(false);
      }
    },
    [orgId]
  );

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (!orgId) return <Loader />;

  const handlePreview = async () => {
    if (!email.trim()) return;
    setLoadingPreview(true);
    try {
      const data = await previewPractice(orgId, {
        email: email.trim(),
        min_progress: Number(minProgress),
      });
      setPreview(data);
      // Si solo hay un curso con preguntas, se preselecciona
      const withQuestions = data.courses.filter((c) => c.questions > 0);
      setEventId(withQuestions.length === 1 ? withQuestions[0].event_id : null);
    } catch (error) {
      setPreview(null);
      toastError("No se pudo consultar el estudiante", errorMessage(error));
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async () => {
    if (!preview || !eventId) return;
    setSending(true);
    try {
      const res = await sendPractice(orgId, {
        email: email.trim(),
        min_progress: Number(minProgress),
        event_id: eventId,
      });
      toastSaved(
        "Simulacro enviado",
        `${res.questions} preguntas a ${res.phone_masked} (${
          res.invite_channel === "template" ? "plantilla" : "mensaje directo"
        }).${
          res.activities?.length
            ? ` Al empezar elegirá entre: ${res.activities.join(", ")}.`
            : ""
        }`
      );
      setPreview(null);
      loadSessions(filterEmail.trim() || undefined);
    } catch (error) {
      toastError("No se pudo enviar el simulacro", errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const openDetail = async (sessionId: string) => {
    setLoadingDetail(true);
    setDetail(null);
    try {
      setDetail(await fetchPracticeSession(orgId, sessionId));
    } catch (error) {
      toastError("No se pudo cargar el simulacro", errorMessage(error));
    } finally {
      setLoadingDetail(false);
    }
  };

  const blockers: string[] = [];
  if (preview) {
    if (!preview.student.opt_in)
      blockers.push("El estudiante no ha activado las prácticas por WhatsApp en su perfil.");
    if (!preview.student.has_phone)
      blockers.push("El estudiante no tiene teléfono registrado en la organización.");
    if (!preview.total_questions)
      blockers.push(
        "No hay preguntas nuevas: ya vio todas las preguntas activas de lo que ha desarrollado, o no hay actividades con preguntas (genera preguntas en Editar curso → Actividades)."
      );
  }
  const selectedCourse = preview?.courses.find((c) => c.event_id === eventId) || null;

  return (
    <Container fluid>
      <Stack gap="lg">
        <Group gap="xs">
          <FaWhatsapp size={22} color="#25D366" />
          <Title order={3}>Simulacros de examen por WhatsApp</Title>
        </Group>
        <Text size="sm" c="dimmed">
          Inicia para un estudiante un simulacro de examen de un curso, con preguntas de las
          actividades que ha desarrollado. Es solo práctica: las respuestas
          y resultados quedan registrados aquí.
        </Text>

        {/* --------- INICIAR SIMULACRO --------- */}
        <Card withBorder radius="md" p="md">
          <Stack gap="sm">
            <Text fw={600}>Iniciar simulacro de examen</Text>
            <Group align="flex-end" grow>
              <Select
                label="Organización"
                data={orgOptions}
                value={orgId}
                onChange={(v) => {
                  if (!v) return;
                  setOrgId(v);
                  setPreview(null);
                  setEventId(null);
                }}
                allowDeselect={false}
                searchable
              />
              <TextInput
                label="Correo del estudiante"
                placeholder="estudiante@correo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.currentTarget.value);
                  setPreview(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handlePreview()}
              />
              <Select
                label="Actividades a incluir"
                data={PROGRESS_OPTIONS}
                value={minProgress}
                onChange={(v) => {
                  if (v) setMinProgress(v);
                  setPreview(null);
                }}
                allowDeselect={false}
              />
              <Button
                leftSection={<FaMagnifyingGlass size={14} />}
                loading={loadingPreview}
                disabled={!email.trim()}
                onClick={() => handlePreview()}
              >
                Consultar estudiante
              </Button>
            </Group>

            {preview && (
              <Stack gap="sm">
                <Group gap="xs">
                  <Text fw={600}>{preview.student.name}</Text>
                  <Text size="sm" c="dimmed">
                    {preview.student.email}
                  </Text>
                  <Badge color={preview.student.opt_in ? "teal" : "red"} variant="light">
                    {preview.student.opt_in ? "WhatsApp autorizado" : "Sin autorización"}
                  </Badge>
                  <Badge color={preview.student.has_phone ? "gray" : "red"} variant="outline">
                    {preview.student.phone_masked || "Sin teléfono"}
                  </Badge>
                </Group>

                {preview.active_session && (
                  <Alert color="yellow" variant="light">
                    Ya tiene un simulacro {STATUS[preview.active_session.status]?.label.toLowerCase()}{" "}
                    ({formatDate(preview.active_session.created_at)}). Si envías otro, el anterior se cancela.
                  </Alert>
                )}
                {blockers.map((b) => (
                  <Alert key={b} color="red" variant="light">
                    {b}
                  </Alert>
                ))}

                {preview.courses.length > 0 && (
                  <Table withTableBorder fz="sm">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Curso</Table.Th>
                        <Table.Th>Actividades desarrolladas</Table.Th>
                        <Table.Th ta="right">Preguntas</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {preview.courses.map((c) => (
                        <Table.Tr key={c.event_id}>
                          <Table.Td fw={500}>{c.event_name}</Table.Td>
                          <Table.Td>
                            <List size="xs" spacing={0}>
                              {c.activities.map((a) => (
                                <List.Item key={a.activity_id}>
                                  {a.name}{" "}
                                  <Text span c="dimmed" size="xs">
                                    ({a.progress}% · {a.questions} preguntas)
                                  </Text>
                                </List.Item>
                              ))}
                            </List>
                          </Table.Td>
                          <Table.Td ta="right">{c.questions}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}

                <Group align="flex-end" grow>
                  <Select
                    label="Curso del simulacro"
                    placeholder="Selecciona un curso"
                    data={preview.courses.map((c) => ({
                      value: c.event_id,
                      label: `${c.event_name} (${c.questions} preguntas)`,
                      disabled: c.questions === 0,
                    }))}
                    value={eventId}
                    onChange={setEventId}
                    required
                    searchable
                  />
                  <Button
                    color="green"
                    leftSection={<FaPaperPlane size={14} />}
                    loading={sending}
                    disabled={blockers.length > 0 || !selectedCourse}
                    onClick={handleSend}
                  >
                    Iniciar simulacro
                  </Button>
                </Group>
                <Text size="xs" c="dimmed">
                  {selectedCourse
                    ? `Preguntas nuevas para el estudiante en "${selectedCourse.event_name}": ${selectedCourse.questions}. `
                    : "Elige el curso del que saldrán las preguntas. "}
                  Al empezar, el estudiante elige por WhatsApp entre sus últimas 3 actividades
                  completadas; el simulacro tiene 3 o 4 preguntas al azar de esa actividad que nunca
                  ha visto (ni en el video ni en otras prácticas) y al final recibe su resultado.
                </Text>
              </Stack>
            )}
          </Stack>
        </Card>

        {/* --------- HISTORIAL --------- */}
        <Card withBorder radius="md" p="md">
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={600}>
                Historial
                {orgOptions.length > 1 && (
                  <Text span size="sm" c="dimmed" fw={400}>
                    {" "}· {orgOptions.find((o) => o.value === orgId)?.label}
                  </Text>
                )}
              </Text>
              <Group gap="xs">
                <TextInput
                  size="xs"
                  placeholder="Filtrar por correo"
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.currentTarget.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadSessions(filterEmail.trim() || undefined)}
                />
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<FaRotateRight size={12} />}
                  onClick={() => loadSessions(filterEmail.trim() || undefined)}
                >
                  Actualizar
                </Button>
              </Group>
            </Group>

            {loadingSessions ? (
              <Loader mx="auto" />
            ) : sessions.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="md">
                Aún no se han enviado simulacros.
              </Text>
            ) : (
              <Table highlightOnHover fz="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Estudiante</Table.Th>
                    <Table.Th>Cursos</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Resultado</Table.Th>
                    <Table.Th>Enviado</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sessions.map((s) => (
                    <Table.Tr key={s._id} style={{ cursor: "pointer" }} onClick={() => openDetail(s._id)}>
                      <Table.Td>
                        <Text size="sm">{s.user_name}</Text>
                        <Text size="xs" c="dimmed">
                          {s.email}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={2}>
                          {s.courses.join(", ")}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge status={s.status} />
                        {(s.trigger === "auto" || s.channel === "web") && (
                          <Text size="xs" c="dimmed" mt={2}>
                            {s.channel === "web" ? "En la plataforma" : "Repaso automático"}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {s.score !== null
                          ? `${s.score}/100 · ${s.correct_count}/${s.total_questions}`
                          : `0/${s.total_questions}`}
                      </Table.Td>
                      <Table.Td>{formatDate(s.invited_at || s.created_at)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>
      </Stack>

      <Drawer
        opened={loadingDetail || !!detail}
        onClose={() => setDetail(null)}
        position="right"
        size="xl"
        title={detail ? `Simulacro de ${detail.user_name}` : "Simulacro"}
      >
        {loadingDetail ? <Loader /> : detail && <SessionDetail session={detail} />}
      </Drawer>
    </Container>
  );
}
