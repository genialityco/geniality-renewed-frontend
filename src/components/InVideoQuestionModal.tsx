import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Radio,
  Stack,
  Text,
} from "@mantine/core";
import {
  answerInVideoQuestion,
  InVideoAnswerResult,
  InVideoQuestion,
} from "../services/inVideoQuestionService";

interface Props {
  question: InVideoQuestion | null;
  organizationId: string;
  activityId: string;
  /** Cierra la pregunta y reanuda el video */
  onContinue: () => void;
  /** Cierra la pregunta y vuelve a reproducir desde donde se explica el tema */
  onRewatch: (startTime: number) => void;
}

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Pregunta dentro del video: el video queda en pausa mientras se responde.
 * Es práctica opcional (se puede saltar) y no afecta el progreso.
 */
export default function InVideoQuestionModal({
  question,
  organizationId,
  activityId,
  onContinue,
  onRewatch,
}: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<InVideoAnswerResult | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected([]);
    setResult(null);
    setError(null);
  }, [question?.id]);

  if (!question) return null;
  const multiple = question.type === "multiple_choice";

  const submit = async (skipped: boolean) => {
    setSending(true);
    setError(null);
    try {
      const res = await answerInVideoQuestion(
        organizationId,
        activityId,
        question.id,
        skipped ? { skipped: true } : { selected: selected.map(Number) }
      );
      if (skipped) onContinue();
      else setResult(res);
    } catch (err: any) {
      // Ya respondida (p. ej. en otra pestaña): no se insiste
      if (err?.response?.status === 409) {
        onContinue();
        return;
      }
      if (skipped) {
        onContinue();
        return;
      }
      setError("No se pudo enviar tu respuesta. Intenta de nuevo o continúa el video.");
    } finally {
      setSending(false);
    }
  };

  const optionMark = (index: number) => {
    if (!result) return null;
    if (result.correct_options.includes(index)) return " ✅";
    if (selected.includes(String(index))) return " ❌";
    return null;
  };

  const options = question.options.map((text, i) => {
    const label = (
      <Text size="sm">
        {text}
        {optionMark(i)}
      </Text>
    );
    return multiple ? (
      <Checkbox key={i} value={String(i)} label={label} disabled={!!result} />
    ) : (
      <Radio key={i} value={String(i)} label={label} disabled={!!result} />
    );
  });

  return (
    <Modal
      opened
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      size="lg"
      title={
        <Group gap="xs">
          <Text fw={600}>💡 Pregunta rápida</Text>
          <Badge variant="light" size="sm">
            Práctica · no afecta tu progreso
          </Badge>
        </Group>
      }
    >
      <Stack gap="md">
        <Text>{question.question}</Text>

        {multiple ? (
          <Checkbox.Group
            value={selected}
            onChange={setSelected}
            description="Selecciona todas las correctas"
          >
            <Stack gap="xs" mt="xs">
              {options}
            </Stack>
          </Checkbox.Group>
        ) : (
          <Radio.Group
            value={selected[0] ?? null}
            onChange={(v) => setSelected([v])}
          >
            <Stack gap="xs">{options}</Stack>
          </Radio.Group>
        )}

        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}

        {result && (
          <Alert
            color={result.correct ? "green" : result.score > 0 ? "yellow" : "red"}
            variant="light"
            title={
              result.correct
                ? "¡Correcto!"
                : result.score > 0
                  ? `Parcialmente correcto (${result.score}/100)`
                  : "Incorrecto"
            }
          >
            {result.explanation || (result.correct ? "¡Bien hecho!" : "Revisa la respuesta marcada con ✅.")}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm">
          {!result ? (
            <>
              <Button variant="subtle" color="gray" onClick={() => submit(true)} disabled={sending}>
                Saltar
              </Button>
              <Button onClick={() => submit(false)} loading={sending} disabled={!selected.length}>
                Responder
              </Button>
            </>
          ) : (
            <>
              {!result.correct && result.start_time !== null && (
                <Button variant="light" onClick={() => onRewatch(result.start_time as number)}>
                  Volver a ver desde {formatTime(result.start_time)}
                </Button>
              )}
              <Button onClick={onContinue}>Continuar video</Button>
            </>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
