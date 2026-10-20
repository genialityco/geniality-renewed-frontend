import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Loader,
  Paper,
  Progress,
  Radio,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import {
  FaArrowLeft,
  FaClockRotateLeft,
  FaPaperPlane,
  FaPlay,
  FaStethoscope,
} from "react-icons/fa6";
import {
  CaseFeedback,
  CaseResource,
  CaseSessionView,
  fetchCaseSession,
  sendCaseMessage,
  startClinicalCase,
} from "../../services/clinicalCaseService";

function errorMessage(error: any) {
  const msg = error?.response?.data?.message;
  return (Array.isArray(msg) ? msg.join(", ") : msg) || "Intenta de nuevo en un momento.";
}

// **negrita** o _cursiva_ (mismo formato que WhatsApp). La cursiva exige que
// los "_" no estén pegados a letras, para no romper palabras como snake_case.
const INLINE_FORMAT = /(\*\*[^*\n]+\*\*|(?<![\p{L}\p{N}])_[^_\n]+_(?![\p{L}\p{N}]))/gu;

/** Texto del tutor: respeta saltos de línea, **negritas** y _cursivas_. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line.split(INLINE_FORMAT).map((part, j) =>
            part.length > 4 && part.startsWith("**") && part.endsWith("**") ? (
              <b key={j}>{part.slice(2, -2)}</b>
            ) : part.length > 2 && part.startsWith("_") && part.endsWith("_") ? (
              <i key={j}>{part.slice(1, -1)}</i>
            ) : (
              <Fragment key={j}>{part}</Fragment>
            )
          )}
        </Fragment>
      ))}
    </>
  );
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function ResourceButton({
  resource,
  onOpen,
}: {
  resource: CaseResource;
  onOpen: (r: CaseResource) => void;
}) {
  return (
    <Button
      size="compact-xs"
      variant="light"
      leftSection={<FaPlay size={9} />}
      onClick={() => onOpen(resource)}
      styles={{ label: { whiteSpace: "normal", textAlign: "left" } }}
    >
      {resource.activity_name} · min {formatTime(resource.start_time)}
    </Button>
  );
}

function FeedbackList({ title, items, color }: { title: string; items?: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <Text size="sm" fw={600} c={color}>
        {title}
      </Text>
      {items.map((t, i) => (
        <Text key={i} size="sm">
          • {t}
        </Text>
      ))}
    </div>
  );
}

/** Cierre del caso dentro del chat: nota, qué salió bien, qué mejorar y dónde estudiar. */
function FeedbackCard({
  feedback,
  onOpen,
  followup = false,
  reviewNote = "",
}: {
  feedback: CaseFeedback;
  onOpen: (r: CaseResource) => void;
  followup?: boolean;
  reviewNote?: string;
}) {
  const capText =
    feedback.cap !== null && feedback.cap !== undefined
      ? String(feedback.cap / 10).replace(".", ",")
      : null;
  const grade =
    feedback.grade === null || feedback.grade === undefined
      ? "—"
      : String(feedback.grade).replace(".", ",");
  return (
    <Stack gap="sm">
      <Group gap="xs">
        <Text fw={700} size="lg">
          {followup ? "Seguimiento a largo plazo" : "Caso atendido"}: {grade} de 10
        </Text>
        <Text size="lg">🩺</Text>
      </Group>
      {feedback.reviewed && (
        <Badge color="teal" variant="light" style={{ alignSelf: "flex-start" }}>
          ✔ Revisado por un docente
        </Badge>
      )}
      {feedback.comment && <Text size="sm">{feedback.comment}</Text>}
      {reviewNote && (
        <Alert color="teal" variant="light" title="Nota del docente" p="xs">
          <Text size="sm">{reviewNote}</Text>
        </Alert>
      )}
      {!!feedback.risks?.length && (
        <Alert color="red" variant="light" p="xs" title="⚠ Decisiones de riesgo para el paciente">
          {feedback.risks.map((t, i) => (
            <Text key={i} size="sm">
              • {t}
            </Text>
          ))}
          {capText && (
            <Text size="xs" mt={4}>
              Por seguridad del paciente, la nota máxima queda en {capText} de 10.
            </Text>
          )}
        </Alert>
      )}
      {!!feedback.unnecessary?.length && (
        <div>
          <Text size="sm" fw={600} c="orange.8">
            🔍 Propuestas sin indicación en este paciente
          </Text>
          {feedback.unnecessary.map((t, i) => (
            <Text key={i} size="sm">
              • {t}
            </Text>
          ))}
          {!!feedback.penalty && (
            <Text size="xs" c="dimmed">
              Restan {feedback.penalty} puntos por precisión: pide lo que cambia el manejo.
            </Text>
          )}
        </div>
      )}
      {!!feedback.consequences?.length && (
        <div>
          <Text size="sm" fw={600} c="red.8">
            ⏱ Lo que le ocurrió al paciente por lo que no se hizo
          </Text>
          {feedback.consequences.map((c, i) => (
            <Text key={i} size="sm">
              • {c.time_label ? <b>{c.time_label}: </b> : null}
              {c.text}
            </Text>
          ))}
        </div>
      )}
      <FeedbackList title="✅ Resolviste de manera adecuada" items={feedback.well_done} color="teal.8" />
      <FeedbackList title="🟡 Pudo mejorar" items={feedback.could_improve} color="yellow.8" />
      <FeedbackList title="📌 Se puede fortalecer" items={feedback.to_strengthen} color="orange.8" />
      {!!feedback.topics?.length && (
        <div>
          <Text size="sm" fw={600} mb={4}>
            📚 Puedes estudiar estos temas
          </Text>
          <Stack gap={8}>
            {feedback.topics.map((t, i) => (
              <div key={i}>
                <Text size="sm">• {t.topic}</Text>
                {t.resources.length > 0 && (
                  <Group gap={6} mt={4} ml="sm">
                    {t.resources.map((r, j) => (
                      <ResourceButton key={j} resource={r} onOpen={onOpen} />
                    ))}
                  </Group>
                )}
              </div>
            ))}
          </Stack>
        </div>
      )}
    </Stack>
  );
}

function ScoreRing({ label, value, color }: { label: string; value: number | null; color: string }) {
  return (
    <Stack align="center" gap={4}>
      <RingProgress
        size={110}
        thickness={10}
        roundCaps
        sections={[{ value: value ?? 0, color }]}
        label={
          <Text ta="center" fw={700} size="lg">
            {value === null ? "—" : `${value}%`}
          </Text>
        }
      />
      <Text size="sm" fw={500}>
        {label}
      </Text>
      {value === null && (
        <Text size="xs" c="dimmed" ta="center">
          No se evalúa en este caso
        </Text>
      )}
    </Stack>
  );
}

const STATUS_MARK = {
  covered: { icon: "✅", label: "Lo planteaste" },
  partial: { icon: "🟡", label: "A medias" },
  missing: { icon: "⚪", label: "No lo planteaste" },
};

/**
 * Caso clínico con tutor socrático: el estudiante razona etapa por etapa y el
 * tutor lo guía con preguntas, sin decirle si acertó. Al terminar ve su
 * porcentaje de acierto en diagnóstico y acciones.
 */
export default function ClinicalCasePage() {
  const { organizationId, eventId, caseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<CaseSessionView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  // Opciones elegidas en una etapa de selección
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const sessionParam = searchParams.get("session");
  const partParam = searchParams.get("part") === "followup" ? "followup" : "acute";

  const load = (fresh = false) => {
    if (!organizationId || !caseId) return;
    setLoading(true);
    setLoadError(null);
    const request =
      sessionParam && !fresh
        ? fetchCaseSession(organizationId, sessionParam)
        : startClinicalCase(organizationId, caseId, partParam);
    request
      .then(setSession)
      .catch((error) => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [organizationId, caseId, sessionParam, partParam]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [session?.messages.length, pending, session?.status]);

  // Otro intento (p. ej. "Intentar de nuevo"): sin selección previa
  useEffect(() => {
    setSelected([]);
  }, [session?.session_id]);

  const backToCourse = () => navigate(`/organization/${organizationId}/course/${eventId}`);
  // Abre la actividad con el video en el minuto donde se explica el tema
  const openResource = (r: CaseResource) =>
    navigate(`/organization/${organizationId}/activitydetail/${r.activity_id}?t=${r.start_time}`);

  const choice = session?.choice ?? null;
  const send = async () => {
    const message = text.trim();
    const picks = choice ? selected : [];
    if ((!message && !picks.length) || !session || !organizationId || pending) return;
    const chosenTexts = choice
      ? choice.options.filter((o) => picks.includes(o.id)).map((o) => o.text)
      : [];
    setPending(
      [chosenTexts.length ? `Elijo: ${chosenTexts.join("; ")}` : "", message]
        .filter(Boolean)
        .join("\n")
    );
    setText("");
    setSendError(null);
    try {
      const updated = await sendCaseMessage(organizationId, session.session_id, message, picks);
      setSession(updated);
      // Nueva etapa: se limpia la selección; en la misma, se conserva para ajustarla
      if (updated.stage !== session.stage || !updated.choice) setSelected([]);
    } catch (error) {
      setText(message);
      setSendError(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const caseUrl = `/organization/${organizationId}/course/${eventId}/clinical-case/${caseId}`;
  const retry = () => {
    if (sessionParam) {
      navigate(session?.part === "followup" ? `${caseUrl}?part=followup` : caseUrl, {
        replace: true,
      });
    } else {
      load(true);
    }
  };
  // Parte 2: seguimiento a largo plazo del mismo paciente
  const startFollowup = () => navigate(`${caseUrl}?part=followup`);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }
  if (loadError || !session) {
    return (
      <Container size="sm" py="xl">
        <Alert color="red" variant="light" title="No se pudo abrir el caso">
          {loadError}
        </Alert>
        <Button mt="md" variant="light" leftSection={<FaArrowLeft />} onClick={backToCourse}>
          Volver al curso
        </Button>
      </Container>
    );
  }

  const completed = session.status === "completed";
  const result = session.result;

  return (
    <Container size="md" py="md">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Button variant="subtle" px={6} onClick={backToCourse} aria-label="Volver al curso">
              <FaArrowLeft />
            </Button>
            <FaStethoscope size={20} />
            <Title order={4} lineClamp={2}>
              {session.title}
            </Title>
          </Group>
          <Group gap={6} wrap="nowrap">
            {session.part === "followup" && (
              <Badge variant="light" size="lg" color="indigo" leftSection={<FaClockRotateLeft size={11} />}>
                Seguimiento{session.followup_horizon ? ` · ${session.followup_horizon}` : ""}
              </Badge>
            )}
            <Badge variant="light" size="lg">
              {completed
                ? "Terminado"
                : `${session.part === "followup" ? "Control" : "Etapa"} ${session.stage} de ${session.total_stages}`}
            </Badge>
          </Group>
        </Group>
        <Progress
          value={
            completed ? 100 : ((session.stage - 1) / Math.max(1, session.total_stages)) * 100
          }
          size="sm"
        />

        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            {session.messages.map((m, i) =>
              m.kind === "summary" && m.feedback ? (
                <Paper key={i} radius="md" p="md" withBorder bg="teal.0">
                  <FeedbackCard
                    feedback={m.feedback}
                    onOpen={openResource}
                    followup={session.part === "followup"}
                    reviewNote={session.review_note}
                  />
                </Paper>
              ) : (
              <Box
                key={i}
                style={{
                  alignSelf: m.role === "student" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                }}
              >
                <Paper
                  radius="md"
                  p="sm"
                  bg={m.role === "student" ? "blue.0" : "gray.0"}
                  withBorder={m.role === "tutor"}
                >
                  <Text size="sm" style={{ whiteSpace: "normal" }}>
                    <RichText text={m.content} />
                  </Text>
                </Paper>
              </Box>
              )
            )}
            {pending && (
              <>
                <Box style={{ alignSelf: "flex-end", maxWidth: "88%" }}>
                  <Paper radius="md" p="sm" bg="blue.0">
                    <Text size="sm" style={{ whiteSpace: "pre-line" }}>
                      {pending}
                    </Text>
                  </Paper>
                </Box>
                <Group gap="xs">
                  <Loader size="xs" type="dots" />
                  <Text size="xs" c="dimmed">
                    El tutor está analizando tu respuesta…
                  </Text>
                </Group>
              </>
            )}
            <div ref={bottomRef} />
          </Stack>
        </Paper>

        {!completed ? (
          <Stack gap="xs">
            {sendError && (
              <Alert color="red" variant="light">
                {sendError}
              </Alert>
            )}
            {choice && (
              <Paper withBorder radius="md" p="sm">
                <Text size="sm" fw={600} mb="xs">
                  {choice.type === "single_choice"
                    ? "Elige una opción"
                    : "Selecciona todas las que apliquen"}
                </Text>
                {choice.type === "single_choice" ? (
                  <Radio.Group
                    value={selected[0] ?? null}
                    onChange={(v) => setSelected([v])}
                  >
                    <Stack gap="xs">
                      {choice.options.map((o) => (
                        <Radio key={o.id} value={o.id} label={o.text} disabled={!!pending} />
                      ))}
                    </Stack>
                  </Radio.Group>
                ) : (
                  <Checkbox.Group value={selected} onChange={setSelected}>
                    <Stack gap="xs">
                      {choice.options.map((o) => (
                        <Checkbox key={o.id} value={o.id} label={o.text} disabled={!!pending} />
                      ))}
                    </Stack>
                  </Checkbox.Group>
                )}
              </Paper>
            )}
            <Textarea
              placeholder={
                choice
                  ? "Opcional: explica tu razonamiento o pregunta un dato del paciente…"
                  : "Escribe tu razonamiento y lo que harías…"
              }
              autosize
              minRows={2}
              maxRows={8}
              value={text}
              disabled={!!pending}
              onChange={(e) => setText(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Group justify="space-between">
              <Text size="xs" c="dimmed">
                Enter para enviar · Shift+Enter para nueva línea. Es práctica: el tutor te guía con
                preguntas y al final verás tu resultado.
              </Text>
              <Button
                leftSection={<FaPaperPlane size={14} />}
                onClick={send}
                loading={!!pending}
                disabled={!text.trim() && !(choice && selected.length)}
              >
                {choice && selected.length ? "Responder" : "Enviar"}
              </Button>
            </Group>
          </Stack>
        ) : (
          result && (
            <Card withBorder radius="md" p="lg">
              <Stack gap="lg">
                {session.followup_available && (
                  <Alert
                    color="indigo"
                    variant="light"
                    icon={<FaClockRotateLeft />}
                    title="Parte 2: seguimiento a largo plazo"
                  >
                    <Stack gap="xs">
                      <Text size="sm">
                        Acompaña a este paciente en sus controles durante los próximos años: lo que
                        decidiste (y lo que no) influirá en cómo evoluciona.
                      </Text>
                      <Button
                        color="indigo"
                        style={{ alignSelf: "flex-start" }}
                        onClick={startFollowup}
                      >
                        Continuar con el seguimiento
                      </Button>
                    </Stack>
                  </Alert>
                )}
                <Title order={4}>Tu resultado</Title>
                {session.part === "followup" ? (
                  <SimpleGrid cols={{ base: 1, xs: 3 }}>
                    <ScoreRing
                      label="Seguimiento a largo plazo"
                      value={result.scores.followup ?? result.scores.overall}
                      color="indigo"
                    />
                    <ScoreRing label="Diagnóstico" value={result.scores.diagnosis} color="grape" />
                    <ScoreRing label="Acciones tomadas" value={result.scores.actions} color="blue" />
                  </SimpleGrid>
                ) : (
                  <SimpleGrid cols={{ base: 1, xs: 3 }}>
                    <ScoreRing label="Diagnóstico" value={result.scores.diagnosis} color="grape" />
                    <ScoreRing label="Acciones tomadas" value={result.scores.actions} color="blue" />
                    <ScoreRing label="General" value={result.scores.overall} color="teal" />
                  </SimpleGrid>
                )}
                <Group justify="center" gap="xs">
                  {result.scores.precision !== undefined && result.scores.precision !== null && (
                    <Badge variant="light" color="orange">
                      Precisión {result.scores.precision}%
                    </Badge>
                  )}
                  <Badge variant="light" color={result.scores.unsafe_count ? "red" : "teal"}>
                    {result.scores.unsafe_count
                      ? `${result.scores.unsafe_count} decisión(es) de riesgo`
                      : "Sin decisiones de riesgo"}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed" ta="center">
                  El porcentaje considera los pasos clave de cada etapa: los indispensables pesan
                  el doble y los que lograste con ayuda del tutor suman menos. Las propuestas sin
                  indicación restan puntos y una decisión de riesgo limita la nota máxima.
                </Text>

                {/* Intentos anteriores al cierre en el chat: resumen corto aquí */}
                {result.feedback && result.feedback.grade === undefined && (
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {result.feedback.strengths.length > 0 && (
                      <Alert color="green" variant="light" title="Fortalezas">
                        <Stack gap={4}>
                          {result.feedback.strengths.map((s, i) => (
                            <Text key={i} size="sm">
                              • {s}
                            </Text>
                          ))}
                        </Stack>
                      </Alert>
                    )}
                    {result.feedback.to_review.length > 0 && (
                      <Alert color="yellow" variant="light" title="Para repasar">
                        <Stack gap={4}>
                          {result.feedback.to_review.map((s, i) => (
                            <Text key={i} size="sm">
                              • {s}
                            </Text>
                          ))}
                        </Stack>
                      </Alert>
                    )}
                  </SimpleGrid>
                )}

                <div>
                  <Text fw={600} mb="xs">
                    Pasos esperados por etapa
                  </Text>
                  <Accordion variant="separated">
                    {result.stages.map((stage, s) => (
                      <Accordion.Item key={s} value={String(s)}>
                        <Accordion.Control>
                          <Text size="sm" fw={500}>
                            {session.part === "followup"
                              ? `Control ${s + 1}${stage.time_label ? ` · ${stage.time_label}` : ""}`
                              : `Etapa ${s + 1}`}
                            : {stage.title}
                          </Text>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="sm">
                            <Text size="sm" c="dimmed">
                              {stage.question}
                            </Text>
                            {stage.items.map((item, i) => (
                              <Box key={i}>
                                <Group gap={6} wrap="nowrap" align="flex-start">
                                  <Text size="sm" title={STATUS_MARK[item.status].label}>
                                    {STATUS_MARK[item.status].icon}
                                  </Text>
                                  <div style={{ flex: 1 }}>
                                    <Group gap={6}>
                                      <Text size="sm" fw={500}>
                                        {item.text}
                                      </Text>
                                      <Badge
                                        size="xs"
                                        variant="light"
                                        color={item.category === "diagnosis" ? "grape" : "blue"}
                                      >
                                        {item.category === "diagnosis" ? "Diagnóstico" : "Acción"}
                                      </Badge>
                                      {item.critical && (
                                        <Badge size="xs" variant="light" color="red">
                                          Indispensable
                                        </Badge>
                                      )}
                                      {item.with_help && item.status !== "missing" && (
                                        <Badge size="xs" variant="light" color="gray">
                                          Con ayuda
                                        </Badge>
                                      )}
                                    </Group>
                                    {item.rationale && (
                                      <Text size="xs" c="dimmed">
                                        {item.rationale}
                                      </Text>
                                    )}
                                    {(item.status !== "covered" || item.with_help) && !!item.resources?.length && (
                                      <Group gap={6} mt={4}>
                                        {item.resources.map((r, j) => (
                                          <ResourceButton key={j} resource={r} onOpen={openResource} />
                                        ))}
                                      </Group>
                                    )}
                                  </div>
                                </Group>
                              </Box>
                            ))}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                </div>

                <Group justify="flex-end">
                  <Button variant="default" onClick={backToCourse}>
                    Volver al curso
                  </Button>
                  <Button onClick={retry}>Intentar de nuevo</Button>
                </Group>
              </Stack>
            </Card>
          )
        )}
      </Stack>
    </Container>
  );
}
