// src/pages/admin/genon/DemoTab.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FaPlay, FaPlus, FaRotateRight, FaTrash, FaUserPlus, FaWhatsapp } from "react-icons/fa6";
import {
  GenOnCourse,
  SEGMENT_LABELS,
  apiError,
  fetchGenOnCourses,
} from "../../../services/genonService";
import {
  GenOnDemoMessage,
  GenOnDemoOverview,
  GenOnDemoParticipant,
  GenOnDemoSendResult,
  GenOnDemoStage,
  GenOnDemoStatus,
  GenOnDemoStep,
  addGenOnDemoParticipant,
  createGenOnDemo,
  deleteGenOnDemo,
  fetchGenOnDemo,
  fetchGenOnDemoStatus,
  prepareGenOnDemoStage,
  removeGenOnDemoParticipant,
  sendGenOnDemoStep,
} from "../../../services/genonDemoService";
import type { GenOnTabProps } from "./GenOnAdminPage";

// Cada cuánto se refresca el estado en vivo
const POLL_MS = 4000;

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const FEED_COLORS: Record<string, string> = {
  sent: "gray",
  read: "blue",
  clicked: "violet",
  replied: "green",
  challenge_passed: "teal",
  challenge_failed: "orange",
  support: "yellow",
  comment: "cyan",
  failed: "red",
};

/** Estado de un mensaje en la matriz: lo más avanzado que hizo la persona. */
function MessageCell({ message }: { message: GenOnDemoMessage | null }) {
  if (!message) return <Text c="dimmed">—</Text>;
  if (message.status === "failed" || message.meta_status === "failed") {
    return (
      <Tooltip label={message.error || "Falló el envío"} multiline w={280}>
        <Badge color="red" variant="light">Falló</Badge>
      </Tooltip>
    );
  }
  return (
    <Stack gap={2}>
      {message.replied_at ? (
        <Tooltip label={message.reply_text || ""} multiline w={280}>
          <Badge color="green" variant="light" maw={180}>
            {message.reply_text || "Respondió"}
          </Badge>
        </Tooltip>
      ) : message.read_at ? (
        <Badge color="blue" variant="light">Leído</Badge>
      ) : message.delivered_at ? (
        <Badge color="gray" variant="light">Entregado</Badge>
      ) : (
        <Badge color="gray" variant="outline">Enviado</Badge>
      )}
      {message.clicked_at && (
        <Badge color="violet" variant="dot" size="xs">Abrió el enlace</Badge>
      )}
    </Stack>
  );
}

/**
 * Demostración guiada de Gen.ON con personas reales: cada participante
 * recibe un usuario ficticio en el curso de la organización de prueba y vive
 * el recorrido completo. El presentador prepara cada etapa (deja los datos de
 * todos en esa situación), envía sus pasos y ve en vivo qué recibió, leyó y
 * respondió cada uno.
 */
export default function DemoTab({ program }: GenOnTabProps) {
  const [overview, setOverview] = useState<GenOnDemoOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const [courses, setCourses] = useState<GenOnCourse[]>([]);
  const [demoName, setDemoName] = useState("Demostración Gen.ON");
  const [eventId, setEventId] = useState<string | null>(null);

  const [personName, setPersonName] = useState("");
  const [personPhone, setPersonPhone] = useState("");

  const [viewStage, setViewStage] = useState<string | null>(null);
  const [confirmStage, setConfirmStage] = useState<GenOnDemoStage | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [lastSend, setLastSend] = useState<GenOnDemoSendResult | null>(null);

  const demo = overview?.demo || null;
  const setDemo = (next: GenOnDemoStatus | null) =>
    setOverview((o) => (o ? { ...o, demo: next } : o));

  const load = useCallback(async () => {
    try {
      const data = await fetchGenOnDemo(program._id);
      setOverview(data);
      setViewStage((v) => v || data.demo?.stage || data.stages[0]?.key || null);
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo cargar la demostración", message: apiError(e, "") });
    } finally {
      setLoading(false);
    }
  }, [program._id]);

  useEffect(() => {
    load();
    fetchGenOnCourses(program._id)
      .then((list) => {
        setCourses(list);
        setEventId((v) => v || list[0]?._id || null);
      })
      .catch(() => undefined);
  }, [program._id, load]);

  // Estado en vivo mientras la pestaña está abierta y visible
  const demoId = demo?._id;
  useEffect(() => {
    if (!demoId) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      fetchGenOnDemoStatus(program._id, demoId)
        .then((status) => setOverview((o) => (o?.demo?._id === status._id ? { ...o, demo: status } : o)))
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [program._id, demoId]);

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo completar", message: apiError(e, ""), autoClose: 10000 });
    } finally {
      setBusy(null);
    }
  };

  const stages = overview?.stages || [];
  const stage = stages.find((s) => s.key === viewStage) || stages[0] || null;
  const currentStage = stages.find((s) => s.key === demo?.stage) || null;
  const off = overview?.program_mode === "off";

  const replyLabel = useMemo(
    () => new Map((program.replies || []).map((r) => [r.key, r.label])),
    [program.replies]
  );

  if (loading) return <Loader />;
  if (!overview) return null;

  return (
    <Stack gap="lg">
      {!off && (
        <Alert color="yellow" title="Apaga el programa para la demostración">
          Mientras el programa esté activo o en simulación, el cron también
          segmentaría y les escribiría a los participantes por su cuenta. Pásalo
          a "Apagado" en la pestaña Programa y guarda; al terminar lo vuelves a
          activar.
        </Alert>
      )}

      {!demo ? (
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Title order={4}>Nueva demostración</Title>
            <Text size="sm" c="dimmed">
              Cada participante registra su WhatsApp y recibe un usuario
              ficticio en el curso de la organización de prueba. Luego avanzas
              etapa por etapa (abandono, inactivos, activos, racha, examen y
              certificado): al preparar una etapa, los datos de todos quedan en
              esa situación, y cada paso que envías les llega de verdad, con
              botones y retos que funcionan como en producción. Al terminar se
              borran los usuarios y todo lo que generaron.
            </Text>
            <Group align="flex-end" wrap="wrap">
              <TextInput
                label="Nombre"
                value={demoName}
                onChange={(e) => setDemoName(e.currentTarget.value)}
                w={280}
              />
              <Select
                label="Curso (de la organización de prueba)"
                data={courses.map((c) => ({ value: c._id, label: c.name }))}
                value={eventId}
                onChange={setEventId}
                searchable
                w={360}
              />
              <Button
                leftSection={<FaPlus />}
                disabled={!off || !eventId}
                loading={busy === "create"}
                onClick={() =>
                  withBusy("create", async () => {
                    const created = await createGenOnDemo(program._id, {
                      name: demoName,
                      eventId: eventId || undefined,
                    });
                    setDemo(created);
                    await load();
                  })
                }
              >
                Crear demostración
              </Button>
            </Group>
          </Stack>
        </Card>
      ) : (
        <>
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between">
              <div>
                <Title order={4}>{demo.name}</Title>
                <Text size="sm" c="dimmed">
                  {demo.event_name} · {demo.participants.length} participantes ·{" "}
                  {currentStage ? `Etapa actual: ${currentStage.title}` : "Aún sin etapa preparada"}
                </Text>
              </div>
              <Group>
                <Button variant="default" leftSection={<FaRotateRight />} onClick={load}>
                  Actualizar
                </Button>
                <Button color="red" variant="subtle" leftSection={<FaTrash />} onClick={() => setConfirmEnd(true)}>
                  Terminar demostración
                </Button>
              </Group>
            </Group>
          </Paper>

          <ParticipantsCard
            demo={demo}
            busy={busy}
            off={off}
            name={personName}
            phone={personPhone}
            onName={setPersonName}
            onPhone={setPersonPhone}
            replyLabel={replyLabel}
            onAdd={() =>
              withBusy("add", async () => {
                setDemo(
                  await addGenOnDemoParticipant(program._id, demo._id, {
                    name: personName,
                    phone: personPhone,
                  })
                );
                setPersonName("");
                setPersonPhone("");
              })
            }
            onRemove={(userId) =>
              withBusy(`remove-${userId}`, async () => {
                setDemo(await removeGenOnDemoParticipant(program._id, demo._id, userId));
              })
            }
          />

          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Title order={4}>Guion</Title>
              <Group gap="xs" wrap="wrap">
                {stages.map((s) => (
                  <Button
                    key={s.key}
                    size="compact-md"
                    variant={s.key === stage?.key ? "filled" : "light"}
                    color={s.key === demo.stage ? "green" : undefined}
                    onClick={() => setViewStage(s.key)}
                  >
                    {s.title}
                  </Button>
                ))}
              </Group>

              {stage && (
                <StagePanel
                  stage={stage}
                  demo={demo}
                  busy={busy}
                  off={off}
                  lastSend={lastSend}
                  onPrepare={() => setConfirmStage(stage)}
                  onSend={(step) =>
                    withBusy(`send-${step.id}`, async () => {
                      const res = await sendGenOnDemoStep(program._id, demo._id, step.id);
                      setLastSend(res);
                      const ok = res.results.filter((r) => r.ok).length;
                      notifications.show({
                        color: ok === res.results.length ? "green" : ok ? "yellow" : "red",
                        title: `${step.title}: enviado a ${ok} de ${res.results.length}`,
                        message:
                          res.results
                            .filter((r) => !r.ok)
                            .map((r) => `${r.name}: ${r.error}`)
                            .join(" · ") || "Les llegará en unos segundos.",
                        autoClose: 10000,
                      });
                      setDemo(await fetchGenOnDemoStatus(program._id, demo._id));
                    })
                  }
                />
              )}
            </Stack>
          </Card>

          {currentStage && <LiveCard demo={demo} stage={currentStage} />}
        </>
      )}

      <Modal
        opened={Boolean(confirmStage)}
        onClose={() => setConfirmStage(null)}
        title={confirmStage ? `Preparar "${confirmStage.title}"` : ""}
      >
        <Stack>
          <Text size="sm">
            Se reescriben los datos de avance de los {demo?.participants.length || 0} participantes:{" "}
            <b>{confirmStage?.situation}</b> Su conversación con Gen.ON empieza en
            limpio (retos, racha y motivo de abandono anteriores se borran).
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmStage(null)}>
              Cancelar
            </Button>
            <Button
              loading={busy === "prepare"}
              onClick={() => {
                const target = confirmStage!;
                withBusy("prepare", async () => {
                  setDemo(await prepareGenOnDemoStage(program._id, demo!._id, target.key));
                  setViewStage(target.key);
                  setLastSend(null);
                  setConfirmStage(null);
                });
              }}
            >
              Preparar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={confirmEnd} onClose={() => setConfirmEnd(false)} title="Terminar demostración">
        <Stack>
          <Text size="sm">
            Se borran los usuarios ficticios de los participantes y todo lo que
            generaron: avance, mensajes, retos y comentarios. Los participantes
            conservan los mensajes en su WhatsApp, pero sus botones dejan de
            responder.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmEnd(false)}>
              Cancelar
            </Button>
            <Button
              color="red"
              loading={busy === "end"}
              onClick={() =>
                withBusy("end", async () => {
                  await deleteGenOnDemo(program._id, demo!._id);
                  setConfirmEnd(false);
                  setLastSend(null);
                  setViewStage(null);
                  await load();
                })
              }
            >
              Terminar y borrar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function ParticipantsCard({
  demo,
  busy,
  off,
  name,
  phone,
  onName,
  onPhone,
  onAdd,
  onRemove,
  replyLabel,
}: {
  demo: GenOnDemoStatus;
  busy: string | null;
  off: boolean;
  name: string;
  phone: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  onAdd: () => void;
  onRemove: (userId: string) => void;
  replyLabel: Map<string, string>;
}) {
  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Title order={4}>Participantes</Title>
        <Group align="flex-end" wrap="wrap">
          <TextInput label="Nombre" placeholder="Ana Pérez" value={name} onChange={(e) => onName(e.currentTarget.value)} w={240} />
          <TextInput
            label="WhatsApp"
            placeholder="300 123 4567 o +1 305 555 0100"
            description="10 dígitos se toman como de Colombia"
            value={phone}
            onChange={(e) => onPhone(e.currentTarget.value)}
            w={260}
          />
          <Button
            leftSection={<FaUserPlus />}
            disabled={!off || !name.trim() || !phone.trim()}
            loading={busy === "add"}
            onClick={onAdd}
          >
            Agregar
          </Button>
        </Group>
        {demo.stage && (
          <Text size="xs" c="dimmed">
            Quien se agrega ahora entra directo a la etapa actual.
          </Text>
        )}
        {demo.participants.length > 0 && (
          <ScrollArea>
            <Table miw={720} verticalSpacing="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>WhatsApp</Table.Th>
                  <Table.Th>Segmento</Table.Th>
                  <Table.Th>Avance</Table.Th>
                  <Table.Th>Racha</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {demo.participants.map((p) => (
                  <Table.Tr key={p.user_id}>
                    <Table.Td>{p.name}</Table.Td>
                    <Table.Td>{p.phone}</Table.Td>
                    <Table.Td>
                      <SegmentBadge participant={p} />
                    </Table.Td>
                    <Table.Td>{p.progress} %</Table.Td>
                    <Table.Td>{p.streak ? `${p.streak} días` : "—"}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        {p.exited && (
                          <Badge color="red" variant="light">
                            {p.exit_reason === "opt_out" ? "Pidió no recibir más" : "Salió del flujo"}
                          </Badge>
                        )}
                        {p.awaiting_feedback && <Badge color="cyan" variant="light">Esperando su comentario</Badge>}
                        {p.abandon_reason && (
                          <Badge color="grape" variant="light">
                            Motivo: {replyLabel.get(p.abandon_reason) || p.abandon_reason}
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label="Quitar de la demostración">
                        <ActionIcon
                          color="red"
                          variant="subtle"
                          loading={busy === `remove-${p.user_id}`}
                          onClick={() => onRemove(p.user_id)}
                        >
                          <FaTrash />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Stack>
    </Card>
  );
}

function SegmentBadge({ participant: p }: { participant: GenOnDemoParticipant }) {
  if (!p.segment) return <Text c="dimmed">—</Text>;
  const unexpected = p.expected_segment && p.segment !== p.expected_segment;
  const badge = (
    <Badge color={unexpected ? "orange" : "blue"} variant="light">
      {SEGMENT_LABELS[p.segment] || p.segment}
    </Badge>
  );
  // Normal tras superar un reto de avance: pasa a activos
  return unexpected ? (
    <Tooltip label={`La etapa lo dejó en "${SEGMENT_LABELS[p.expected_segment!]}"; cambió por lo que hizo (p. ej. superó un reto).`} multiline w={280}>
      {badge}
    </Tooltip>
  ) : (
    badge
  );
}

function StagePanel({
  stage,
  demo,
  busy,
  off,
  lastSend,
  onPrepare,
  onSend,
}: {
  stage: GenOnDemoStage;
  demo: GenOnDemoStatus;
  busy: string | null;
  off: boolean;
  lastSend: GenOnDemoSendResult | null;
  onPrepare: () => void;
  onSend: (step: GenOnDemoStep) => void;
}) {
  const prepared = demo.stage === stage.key;
  const since = demo.stage_prepared_at ? new Date(demo.stage_prepared_at).getTime() : 0;
  const sentOk = (stepId: string) =>
    new Set(
      demo.sends
        .filter((s) => s.step_id === stepId && s.ok && new Date(s.at).getTime() >= since)
        .map((s) => s.user_id)
    ).size;

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md" bg="var(--mantine-color-gray-0)">
        <Stack gap={6}>
          <Group justify="space-between" align="flex-start">
            <Title order={3}>{stage.title}</Title>
            <Button
              variant={prepared ? "light" : "filled"}
              leftSection={<FaPlay />}
              disabled={!off || !demo.participants.length}
              loading={busy === "prepare"}
              onClick={onPrepare}
            >
              {prepared ? "Preparar de nuevo" : "Preparar esta etapa"}
            </Button>
          </Group>
          <Text>
            <b>Situación:</b> {stage.situation}
          </Text>
          <Text size="sm" c="dimmed">
            {stage.explain}
          </Text>
          {!prepared && (
            <Text size="sm" c="orange">
              Prepara la etapa para poder enviar sus pasos.
            </Text>
          )}
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {stage.steps.map((step) => {
          const result = lastSend?.step_id === step.id ? lastSend : null;
          return (
            <Card key={step.id} withBorder radius="md" p="md">
              <Stack gap="xs" h="100%">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Badge variant="outline">{step.log_step}</Badge>
                    <Text fw={600}>{step.title}</Text>
                  </Group>
                  {prepared && (
                    <Badge color={sentOk(step.id) ? "green" : "gray"} variant="light">
                      Enviado a {sentOk(step.id)}/{demo.participants.length}
                    </Badge>
                  )}
                </Group>
                <Text size="sm">{step.explain}</Text>
                <Text size="sm" c="dimmed">
                  <b>Qué hacen los participantes:</b> {step.expect}
                </Text>
                {!step.ready && (
                  <Text size="sm" c="red">
                    {step.reason}
                  </Text>
                )}
                {result?.results.some((r) => !r.ok) && (
                  <Stack gap={2}>
                    {result.results
                      .filter((r) => !r.ok)
                      .map((r) => (
                        <Text key={r.user_id} size="xs" c="red">
                          {r.name}: {r.error}
                        </Text>
                      ))}
                  </Stack>
                )}
                <Group mt="auto">
                  <Button
                    color="green"
                    leftSection={<FaWhatsapp />}
                    disabled={!off || !prepared || !step.ready}
                    loading={busy === `send-${step.id}`}
                    onClick={() => onSend(step)}
                  >
                    Enviar a todos
                  </Button>
                </Group>
              </Stack>
            </Card>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

function LiveCard({ demo, stage }: { demo: GenOnDemoStatus; stage: GenOnDemoStage }) {
  const since = demo.stage_prepared_at ? new Date(demo.stage_prepared_at).getTime() : 0;
  const recent = (at: string) => new Date(at).getTime() >= since;
  // Último envío de cada paso de la etapa por persona
  const cell = (p: GenOnDemoParticipant, step: GenOnDemoStep) =>
    [...p.messages].reverse().find((m) => m.step === step.log_step && recent(m.at)) || null;

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={4}>En vivo · {stage.title}</Title>
          <Text size="xs" c="dimmed">
            Se actualiza cada {POLL_MS / 1000} segundos
          </Text>
        </Group>
        <ScrollArea>
          <Table miw={600} verticalSpacing="sm" withColumnBorders>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Participante</Table.Th>
                {stage.steps.map((s) => (
                  <Table.Th key={s.id}>
                    {s.log_step} · {s.title}
                  </Table.Th>
                ))}
                <Table.Th>Retos</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {demo.participants.map((p) => {
                const challenges = p.challenges.filter((c) => recent(c.at));
                return (
                  <Table.Tr key={p.user_id}>
                    <Table.Td fw={500}>{p.name}</Table.Td>
                    {stage.steps.map((s) => (
                      <Table.Td key={s.id}>
                        <MessageCell message={cell(p, s)} />
                      </Table.Td>
                    ))}
                    <Table.Td>
                      {challenges.length ? (
                        <Group gap={4}>
                          {challenges.map((c, i) => (
                            <Tooltip key={i} label={c.activity_name || ""}>
                              <Badge color={c.passed ? "teal" : "orange"} variant="light">
                                {c.passed ? "Aprobó" : "No aprobó"} {c.correct}/{c.total}
                              </Badge>
                            </Tooltip>
                          ))}
                        </Group>
                      ) : (
                        <Text c="dimmed">—</Text>
                      )}
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea>

        <Title order={5}>Actividad reciente</Title>
        <ScrollArea.Autosize mah={320}>
          <Stack gap={6}>
            {demo.feed.filter((f) => recent(f.at)).length === 0 && (
              <Text size="sm" c="dimmed">
                Aún no hay actividad en esta etapa.
              </Text>
            )}
            {demo.feed
              .filter((f) => recent(f.at))
              .map((f, i) => (
                <Group key={`${f.at}-${i}`} gap="xs" wrap="nowrap" align="flex-start">
                  <Text size="xs" c="dimmed" w={70} style={{ flexShrink: 0 }}>
                    {formatTime(f.at)}
                  </Text>
                  <Badge color={FEED_COLORS[f.type] || "gray"} variant="dot" style={{ flexShrink: 0 }}>
                    {f.name}
                  </Badge>
                  <Text size="sm">{f.text}</Text>
                </Group>
              ))}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Card>
  );
}
