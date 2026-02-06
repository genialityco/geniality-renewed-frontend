import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Divider,
  ActionIcon,
  NumberInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconTrash } from "@tabler/icons-react";

import {
  createOrUpdateQuiz,
  fetchQuizByEventId,
} from "../services/quizService";

type Props = { eventId: string };

type PlainQuestion = {
  pregunta: string;
  opciones: string[];
  respuestacorrecta: number;
};

const emptyQuestion = (): PlainQuestion => ({
  pregunta: "",
  opciones: ["", "", "", ""],
  respuestacorrecta: 0,
});

export default function SurveyComponent({ eventId }: Props) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<PlainQuestion[]>([
    emptyQuestion(),
  ]);

  // Cargar quiz si existe
  useEffect(() => {
    const load = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const quiz = await fetchQuizByEventId(eventId);
        const q = Array.isArray(quiz.questions) ? quiz.questions : [];
        setQuestions(q.length ? q : [emptyQuestion()]);
        notifications.show({ message: "Examen cargado", color: "green" });
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setQuestions([emptyQuestion()]);
          notifications.show({
            message: "Aún no hay examen, crea uno.",
            color: "yellow",
          });
        } else {
          console.error(err);
          notifications.show({
            message: "Error cargando examen",
            color: "red",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [eventId]);

  const addQuestion = () => setQuestions((prev) => [...prev, emptyQuestion()]);
  const removeQuestion = (idx: number) =>
    setQuestions((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
    );

  const updatePregunta = (idx: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, pregunta: value } : q)),
    );

  const updateOpcion = (qIdx: number, optIdx: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const opciones = [...q.opciones];
        opciones[optIdx] = value;
        return { ...q, opciones };
      }),
    );

  const addOption = (qIdx: number) =>
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, opciones: [...q.opciones, ""] } : q,
      ),
    );

  const removeOption = (qIdx: number, optIdx: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const opciones = q.opciones.filter((_, j) => j !== optIdx);
        const respuestacorrecta = Math.min(
          q.respuestacorrecta,
          Math.max(0, opciones.length - 1),
        );
        return { ...q, opciones, respuestacorrecta };
      }),
    );

  const setCorrect = (qIdx: number, v: number) =>
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const max = q.opciones.length - 1;
        const safe = Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : 0;
        return { ...q, respuestacorrecta: safe };
      }),
    );

  const validate = useMemo(() => {
    const errors: string[] = [];
    questions.forEach((q, i) => {
      if (!q.pregunta.trim()) errors.push(`Pregunta ${i + 1}: falta texto`);
      if (!q.opciones.length) errors.push(`Pregunta ${i + 1}: sin opciones`);
      q.opciones.forEach((op, j) => {
        if (!op.trim())
          errors.push(`Pregunta ${i + 1}, opción ${j + 1}: vacía`);
      });
      if (q.respuestacorrecta < 0 || q.respuestacorrecta >= q.opciones.length) {
        errors.push(`Pregunta ${i + 1}: respuesta correcta inválida`);
      }
    });
    return errors;
  }, [questions]);

  const onSave = async () => {
    if (!eventId) return;

    if (validate.length) {
      notifications.show({ message: validate[0], color: "red" });
      return;
    }

    setLoading(true);
    try {
      await createOrUpdateQuiz(eventId, questions);
      notifications.show({ message: "Examen guardado", color: "green" });
    } catch (err) {
      console.error(err);
      notifications.show({ message: "Error guardando examen", color: "red" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      {questions.map((q, qIdx) => (
        <Card key={qIdx} withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start">
            <Text fw={600}>Pregunta {qIdx + 1}</Text>
            <ActionIcon
              color="red"
              variant="light"
              onClick={() => removeQuestion(qIdx)}
              disabled={questions.length === 1}
              aria-label="Eliminar pregunta"
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Group>

          <TextInput
            mt="sm"
            label="Pregunta"
            value={q.pregunta}
            onChange={(e) => updatePregunta(qIdx, e.currentTarget.value)}
            placeholder="Escribe la pregunta..."
          />

          <Divider my="sm" />

          <Stack gap="xs">
            {q.opciones.map((opt, optIdx) => (
              <Group key={optIdx} align="flex-end">
                <TextInput
                  style={{ flex: 1 }}
                  label={`Opción ${optIdx + 1}`}
                  value={opt}
                  onChange={(e) =>
                    updateOpcion(qIdx, optIdx, e.currentTarget.value)
                  }
                />
                <ActionIcon
                  color="red"
                  variant="light"
                  onClick={() => removeOption(qIdx, optIdx)}
                  disabled={q.opciones.length <= 2}
                  aria-label="Eliminar opción"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>
            ))}

            <Group>
              <Button
                variant="light"
                leftSection={<IconPlus size={16} />}
                onClick={() => addOption(qIdx)}
              >
                Agregar opción
              </Button>

              <NumberInput
                label="Correcta (índice)"
                value={q.respuestacorrecta}
                onChange={(v) => setCorrect(qIdx, Number(v))}
                min={0}
                max={Math.max(0, q.opciones.length - 1)}
                step={1}
                allowDecimal={false}
              />

              <Text size="sm" c="dimmed">
                0 = opción 1, 1 = opción 2, etc.
              </Text>
            </Group>
          </Stack>
        </Card>
      ))}

      <Group>
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={addQuestion}
        >
          Agregar pregunta
        </Button>

        <Button loading={loading} onClick={onSave}>
          Guardar examen
        </Button>
      </Group>

      {!!validate.length && (
        <Text size="sm" c="red">
          Hay errores: {validate[0]}
        </Text>
      )}
    </Stack>
  );
}
