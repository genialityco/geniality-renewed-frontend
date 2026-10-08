import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Progress,
  Radio,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  answerWebPractice,
  startWebPractice,
  WebPractice,
  WebPracticeQuestion,
  WebPracticeResult,
} from "../services/webPracticeService";

interface Props {
  opened: boolean;
  /** `finished`: si terminó la práctica (para refrescar la disponibilidad) */
  onClose: (finished: boolean) => void;
  organizationId: string;
  activityId: string;
  activityName: string;
  /** Cierra y lleva el video al minuto donde se explica el tema */
  onRewatch: (startTime: number) => void;
}

const TYPE_HINT: Record<string, string> = {
  single_choice: "Elige una opción",
  multiple_choice: "Selecciona todas las correctas",
  true_false: "¿Verdadero o falso?",
  fill_blank: "Escribe la palabra o frase que completa el espacio",
  open: "Responde con tus palabras (1 a 4 frases)",
};

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function errorMessage(error: any) {
  const msg = error?.response?.data?.message;
  return (Array.isArray(msg) ? msg.join(", ") : msg) || "Intenta de nuevo en un momento.";
}

/**
 * "Evaluar mis conocimientos" de una actividad: 3-4 preguntas que el
 * estudiante no ha visto, una a la vez, con retroalimentación inmediata y
 * resultado al final. Es práctica: no afecta notas ni progreso.
 */
export default function ActivityPracticeModal({
  opened,
  onClose,
  organizationId,
  activityId,
  activityName,
  onRewatch,
}: Props) {
  const [practice, setPractice] = useState<WebPractice | null>(null);
  // Pregunta en pantalla (puede ser la recién respondida, mostrando su resultado)
  const [viewIndex, setViewIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [doubt, setDoubt] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setPractice(null);
    setLoadError(null);
    setLoading(true);
    startWebPractice(organizationId, activityId)
      .then((data) => {
        setPractice(data);
        setViewIndex(Math.min(data.current_question, data.total - 1));
      })
      .catch((error) => setLoadError(errorMessage(error)))
      .finally(() => setLoading(false));
  }, [opened, organizationId, activityId]);

  useEffect(() => {
    setSelected([]);
    setText("");
    setAnswerError(null);
    setDoubt(null);
  }, [viewIndex, practice?.session_id]);

  const finished = practice?.status === "completed";
  const question: WebPracticeQuestion | null = practice?.questions[viewIndex] ?? null;
  const result: WebPracticeResult | null = question?.result ?? null;
  // Resumen: terminó y ya vio el resultado de la última
  const [showSummary, setShowSummary] = useState(false);
  useEffect(() => {
    setShowSummary(false);
  }, [practice?.session_id]);

  const submit = async (skipped: boolean) => {
    if (!practice || !question) return;
    setSending(true);
    setAnswerError(null);
    setDoubt(null);
    try {
      const isChoice = question.options.length > 0;
      const res = await answerWebPractice(organizationId, activityId, practice.session_id, {
        index: question.index,
        ...(skipped
          ? { skipped: true }
          : isChoice
            ? { selected: selected.map(Number) }
            : { text }),
      });
      setPractice(res);
      if (res.doubt) setDoubt(res.doubt);
    } catch (error) {
      setAnswerError(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const next = () => {
    if (!practice) return;
    if (finished) setShowSummary(true);
    else setViewIndex(practice.current_question);
  };

  const close = () => onClose(finished);

  const renderInput = (q: WebPracticeQuestion) => {
    const mark = (i: number) => {
      if (!result) return null;
      if (result.correct_options.includes(i)) return " ✅";
      if (selected.includes(String(i)) && !result.skipped) return " ❌";
      return null;
    };
    if (q.type === "multiple_choice") {
      return (
        <Checkbox.Group value={selected} onChange={setSelected}>
          <Stack gap="xs">
            {q.options.map((o, i) => (
              <Checkbox
                key={i}
                value={String(i)}
                disabled={!!result}
                label={
                  <Text size="sm">
                    {o}
                    {mark(i)}
                  </Text>
                }
              />
            ))}
          </Stack>
        </Checkbox.Group>
      );
    }
    if (q.options.length) {
      return (
        <Radio.Group value={selected[0] ?? null} onChange={(v) => setSelected([v])}>
          <Stack gap="xs">
            {q.options.map((o, i) => (
              <Radio
                key={i}
                value={String(i)}
                disabled={!!result}
                label={
                  <Text size="sm">
                    {o}
                    {mark(i)}
                  </Text>
                }
              />
            ))}
          </Stack>
        </Radio.Group>
      );
    }
    if (result) {
      return (
        <Text size="sm" c="dimmed">
          Tu respuesta: {result.skipped ? "(saltada)" : result.answer}
        </Text>
      );
    }
    return q.type === "fill_blank" ? (
      <TextInput
        placeholder="Tu respuesta"
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text.trim()) submit(false);
        }}
      />
    ) : (
      <Textarea
        placeholder="Escribe tu respuesta"
        autosize
        minRows={3}
        value={text}
        onChange={(e) => setText(e.currentTarget.value)}
      />
    );
  };

  const canSubmit = question
    ? question.options.length
      ? selected.length > 0
      : text.trim().length > 0
    : false;

  const renderSummary = () => {
    if (!practice?.summary) return null;
    const { score, correct_count, total } = practice.summary;
    const toReview = practice.questions.filter(
      (q) => q.result && !q.result.correct && q.result.start_time !== null
    );
    return (
      <Stack gap="md" align="stretch">
        <Stack gap={4} align="center">
          <Text size="xl" fw={700}>
            {score !== null ? `${score}/100` : "—"}
          </Text>
          <Text size="sm" c="dimmed">
            {correct_count} de {total} correctas
          </Text>
        </Stack>
        {toReview.length ? (
          <Stack gap="xs">
            <Text size="sm" fw={600}>
              Para repasar en el video:
            </Text>
            {toReview.map((q) => (
              <Group key={q.index} justify="space-between" wrap="nowrap">
                <Text size="sm" lineClamp={2} style={{ flex: 1 }}>
                  {q.question}
                </Text>
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => onRewatch(q.result!.start_time as number)}
                >
                  Ver min {formatTime(q.result!.start_time as number)}
                </Button>
              </Group>
            ))}
          </Stack>
        ) : correct_count === total ? (
          <Alert color="green" variant="light">
            ¡Excelente! Respondiste todo correctamente. 🌟
          </Alert>
        ) : null}
        <Text size="xs" c="dimmed" ta="center">
          Es solo práctica: no afecta tus notas ni tu progreso. En unos días te
          enviaremos un repaso por WhatsApp si lo tienes activado en tu perfil.
        </Text>
        <Button onClick={close}>Cerrar</Button>
      </Stack>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      centered
      size="lg"
      closeOnClickOutside={false}
      title={
        <Group gap="xs">
          <Text fw={600}>🧠 Evalúa tus conocimientos</Text>
          <Badge variant="light" size="sm">
            {activityName}
          </Badge>
        </Group>
      }
    >
      {loading ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : loadError ? (
        <Stack>
          <Alert color="blue" variant="light">
            {loadError}
          </Alert>
          <Button onClick={close}>Cerrar</Button>
        </Stack>
      ) : showSummary ? (
        renderSummary()
      ) : practice && question ? (
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              Pregunta {viewIndex + 1} de {practice.total} · {TYPE_HINT[question.type] || ""}
            </Text>
            <Progress
              value={((viewIndex + (result ? 1 : 0)) / practice.total) * 100}
              size="sm"
            />
          </Stack>

          <Text style={{ whiteSpace: "pre-wrap" }}>{question.question}</Text>
          {renderInput(question)}

          {doubt && (
            <Alert color="blue" variant="light" title="Aclaración">
              {doubt}
            </Alert>
          )}
          {answerError && (
            <Alert color="red" variant="light">
              {answerError}
            </Alert>
          )}

          {result && (
            <Alert
              color={
                result.skipped ? "gray" : result.correct ? "green" : result.score > 0 ? "yellow" : "red"
              }
              variant="light"
              title={
                result.skipped
                  ? "Pregunta saltada"
                  : result.correct
                    ? "¡Correcto!"
                    : result.score > 0
                      ? `Parcialmente correcto (${result.score}/100)`
                      : "Incorrecto"
              }
            >
              <Stack gap={6}>
                {result.feedback && <Text size="sm">{result.feedback}</Text>}
                {!result.correct && result.correct_answer && (
                  <Text size="sm">
                    <b>Respuesta correcta:</b> {result.correct_answer}
                  </Text>
                )}
                {result.explanation && <Text size="sm">💡 {result.explanation}</Text>}
              </Stack>
            </Alert>
          )}

          <Group justify="flex-end" gap="sm">
            {!result ? (
              <>
                <Button variant="subtle" color="gray" onClick={() => submit(true)} disabled={sending}>
                  Saltar
                </Button>
                <Button onClick={() => submit(false)} loading={sending} disabled={!canSubmit}>
                  Responder
                </Button>
              </>
            ) : (
              <>
                {!result.correct && result.start_time !== null && (
                  <Button
                    variant="light"
                    onClick={() => onRewatch(result.start_time as number)}
                  >
                    Ver en el video ({formatTime(result.start_time)})
                  </Button>
                )}
                <Button onClick={next}>
                  {finished ? "Ver resultado" : "Siguiente pregunta"}
                </Button>
              </>
            )}
          </Group>
        </Stack>
      ) : null}
    </Modal>
  );
}
