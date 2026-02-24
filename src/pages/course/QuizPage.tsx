import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Container,
  Loader,
  Text,
  Button,
  Group,
  Title,
  Center,
  Card,
  Stack,
  Checkbox,
  Radio,
  Badge,
  Divider,
  Select,
  Alert,
  Progress,
} from "@mantine/core";
import { FaArrowLeft, FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import {
  getQuizById,
  submitAttempt,
  Quiz,
  Question,
  UserAnswer,
  EditorBlock,
} from "../../services/quizService";
import { useUser } from "../../context/UserContext";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Renderiza el texto plano de una lista de bloques */
function renderBlocks(blocks: EditorBlock[]): string {
  return blocks.map((b) => b.content).join(" ").trim();
}

// ─────────────────────────────────────────────
// Sub-componentes por tipo
// ─────────────────────────────────────────────

function SingleQuestion({
  question,
  answer,
  onChange,
}: {
  question: Question;
  answer: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <Radio.Group value={answer ?? ""} onChange={onChange}>
      <Stack gap="xs" mt="sm">
        {question.options?.map((opt) => (
          <Card
            key={opt.id}
            withBorder
            radius="md"
            p="sm"
            style={{
              cursor: "pointer",
              borderColor: answer === opt.id ? "#4dabf7" : undefined,
              background: answer === opt.id ? "#1a2a3a" : undefined,
            }}
            onClick={() => onChange(opt.id)}
          >
            <Radio value={opt.id} label={renderBlocks(opt.blocks) || "(sin texto)"} />
          </Card>
        ))}
      </Stack>
    </Radio.Group>
  );
}

function MultipleQuestion({
  question,
  answers,
  onChange,
}: {
  question: Question;
  answers: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (answers.includes(id)) {
      onChange(answers.filter((a) => a !== id));
    } else {
      onChange([...answers, id]);
    }
  };

  return (
    <Stack gap="xs" mt="sm">
      {question.options?.map((opt) => {
        const checked = answers.includes(opt.id);
        return (
          <Card
            key={opt.id}
            withBorder
            radius="md"
            p="sm"
            style={{
              cursor: "pointer",
              borderColor: checked ? "#4dabf7" : undefined,
              background: checked ? "#1a2a3a" : undefined,
            }}
            onClick={() => toggle(opt.id)}
          >
            <Checkbox
              checked={checked}
              onChange={() => toggle(opt.id)}
              label={renderBlocks(opt.blocks) || "(sin texto)"}
            />
          </Card>
        );
      })}
    </Stack>
  );
}

function MatchingQuestion({
  question,
  matchingAnswers,
  onChange,
}: {
  question: Question;
  matchingAnswers: Record<string, Record<string, string>>;
  onChange: (columnAId: string, columnLabel: string, selectedId: string) => void;
}) {
  const colA = question.columns?.find((c) => c.label === "A");
  const otherCols = question.columns?.filter((c) => c.label !== "A") ?? [];

  return (
    <Stack gap="md" mt="sm">
      {colA?.options.map((aOpt) => {
        const aText = renderBlocks(aOpt.blocks) || "(sin texto)";
        return (
          <Card key={aOpt.id} withBorder radius="md" p="sm">
            <Text fw={600} size="sm" mb="xs">
              {aText}
            </Text>
            <Stack gap="xs">
              {otherCols.map((col) => {
                const selectData = col.options.map((o) => ({
                  value: o.id,
                  label: renderBlocks(o.blocks) || "(sin texto)",
                }));
                return (
                  <Group key={col.label} align="center" gap="sm">
                    <Badge size="sm" variant="outline">
                      {col.label}
                    </Badge>
                    <Select
                      placeholder="Seleccionar…"
                      data={selectData}
                      value={matchingAnswers[aOpt.id]?.[col.label] ?? null}
                      onChange={(val) => val && onChange(aOpt.id, col.label, val)}
                      style={{ flex: 1 }}
                      size="xs"
                    />
                  </Group>
                );
              })}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

function SortingQuestion({
  question,
  order,
  onChange,
}: {
  question: Question;
  order: string[];
  onChange: (newOrder: string[]) => void;
}) {
  // Si no hay orden definido aún, usamos el orden original de las opciones
  const currentOrder =
    order.length > 0
      ? order
      : (question.options?.map((o) => o.id) ?? []);

  const optMap = Object.fromEntries(
    (question.options ?? []).map((o) => [o.id, renderBlocks(o.blocks) || "(sin texto)"])
  );

  const move = (index: number, dir: -1 | 1) => {
    const newOrd = [...currentOrder];
    const target = index + dir;
    if (target < 0 || target >= newOrd.length) return;
    [newOrd[index], newOrd[target]] = [newOrd[target], newOrd[index]];
    onChange(newOrd);
  };

  return (
    <Stack gap="xs" mt="sm">
      {currentOrder.map((id, i) => (
        <Card key={id} withBorder radius="md" p="sm">
          <Group justify="space-between">
            <Group gap="xs">
              <Badge size="sm" variant="filled" color="gray">
                {i + 1}
              </Badge>
              <Text size="sm">{optMap[id]}</Text>
            </Group>
            <Group gap={4}>
              <Button
                size="xs"
                variant="subtle"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                ↑
              </Button>
              <Button
                size="xs"
                variant="subtle"
                disabled={i === currentOrder.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </Button>
            </Group>
          </Group>
        </Card>
      ))}
    </Stack>
  );
}

// ─────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────

export default function QuizPage() {
  const { organizationId, eventId, quizId } = useParams<{
    organizationId: string;
    eventId: string;
    quizId: string;
  }>();
  const navigate = useNavigate();
  const { userId } = useUser();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Respuestas del usuario por questionId
  const [singleAnswers, setSingleAnswers] = useState<Record<string, string>>({});
  const [multipleAnswers, setMultipleAnswers] = useState<Record<string, string[]>>({});
  // matchingAnswers: { [columnAOptionId]: { [colLabel]: selectedOptionId } }
  const [matchingAnswers, setMatchingAnswers] = useState<
    Record<string, Record<string, Record<string, string>>>
  >({});
  const [sortingOrders, setSortingOrders] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!quizId) return;
    (async () => {
      try {
        const data = await getQuizById(quizId);
        setQuiz(data);
      } catch (e: any) {
        setError(e?.response?.data?.message ?? "Error al cargar el examen.");
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId]);

  const handleBack = () =>
    navigate(`/organization/${organizationId}/course/${eventId}`);

  const answeredCount = () => {
    if (!quiz) return 0;
    return quiz.questions.filter((q) => {
      if (q.type === "single") return !!singleAnswers[q.id];
      if (q.type === "multiple") return (multipleAnswers[q.id]?.length ?? 0) > 0;
      if (q.type === "matching") {
        const colA = q.columns?.find((c) => c.label === "A");
        const otherCols = q.columns?.filter((c) => c.label !== "A") ?? [];
        return colA?.options.every((aOpt) =>
          otherCols.every(
            (col) => matchingAnswers[q.id]?.[aOpt.id]?.[col.label]
          )
        );
      }
      if (q.type === "sorting") return (sortingOrders[q.id]?.length ?? 0) > 0;
      return false;
    }).length;
  };

  const handleSubmit = async () => {
    if (!quiz || !userId || !quizId) return;

    // Construye userAnswers en el formato esperado por el backend
    const userAnswers: UserAnswer[] = quiz.questions.map((q) => {
      if (q.type === "single") {
        return { questionId: q.id, answer: singleAnswers[q.id] ?? "" };
      }
      if (q.type === "multiple") {
        return { questionId: q.id, answer: multipleAnswers[q.id] ?? [] };
      }
      if (q.type === "sorting") {
        const order =
          (sortingOrders[q.id]?.length ?? 0) > 0
            ? sortingOrders[q.id]
            : (q.options?.map((o) => o.id) ?? []);
        return { questionId: q.id, answer: order };
      }
      if (q.type === "matching") {
        // Convierte { [colAId]: { [colLabel]: optionId } } → MatchingAnswer[]
        const ma = Object.entries(matchingAnswers[q.id] ?? {}).map(
          ([columnAId, matches]) => ({ columnAId, matches })
        );
        return { questionId: q.id, answer: ma };
      }
      return { questionId: q.id, answer: "" };
    });

    // Calcula score localmente (porcentaje de preguntas correctas)
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (q.type === "single") {
        if (singleAnswers[q.id] && singleAnswers[q.id] === q.correctAnswer)
          correct++;
      } else if (q.type === "multiple") {
        const selected = multipleAnswers[q.id] ?? [];
        const expected = q.correctAnswers ?? [];
        if (
          selected.length === expected.length &&
          expected.every((id) => selected.includes(id))
        )
          correct++;
      } else if (q.type === "sorting") {
        const order =
          (sortingOrders[q.id]?.length ?? 0) > 0
            ? sortingOrders[q.id]
            : (q.options?.map((o) => o.id) ?? []);
        const expected = q.correctOrder ?? [];
        if (
          order.length === expected.length &&
          order.every((id, i) => id === expected[i])
        )
          correct++;
      } else if (q.type === "matching") {
        const expected = q.matchingAnswers ?? [];
        const allMatch = expected.every((exp) => {
          const userMatches = matchingAnswers[q.id]?.[exp.columnAId] ?? {};
          return Object.entries(exp.matches).every(
            ([col, id]) => userMatches[col] === id
          );
        });
        if (allMatch && expected.length > 0) correct++;
      }
    });
    const score = Math.round((correct / quiz.questions.length) * 100);

    try {
      setSubmitting(true);
      await submitAttempt(quizId, { userId, score, userAnswers });
      navigate(
        `/organization/${organizationId}/course/${eventId}/quiz/${quizId}/result`
      );
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Error al enviar el examen.");
      setSubmitting(false);
    }
  };

  // ── Estados de carga / error ──
  if (loading)
    return (
      <Center mt="xl">
        <Loader />
      </Center>
    );

  if (error)
    return (
      <Container mt="xl">
        <Alert icon={<FaTriangleExclamation />} color="red" mb="md">
          {error}
        </Alert>
        <Button variant="subtle" onClick={handleBack}>
          Volver al curso
        </Button>
      </Container>
    );

  if (!quiz)
    return (
      <Container mt="xl">
        <Text>Examen no encontrado.</Text>
        <Button mt="md" variant="subtle" onClick={handleBack}>
          Volver al curso
        </Button>
      </Container>
    );

  const total = quiz.questions.length;
  const answered = answeredCount();

  return (
    <Container size="md" py="xl">
      {/* Cabecera */}
      <Group justify="space-between" mb="lg">
        <Button
          variant="subtle"
          leftSection={<FaArrowLeft size={14} />}
          onClick={handleBack}
        >
          Volver al curso
        </Button>
        <Badge size="lg" variant="light" color={answered === total ? "teal" : "blue"}>
          {answered}/{total} respondidas
        </Badge>
      </Group>

      <Title order={2} mb={4}>
        Examen del curso
      </Title>
      <Text c="dimmed" size="sm" mb="md">
        Responde todas las preguntas y haz clic en "Enviar examen".
      </Text>

      <Progress
        value={(answered / total) * 100}
        size="sm"
        color={answered === total ? "teal" : "blue"}
        mb="xl"
        radius="xl"
      />

      {/* Preguntas */}
      <Stack gap="xl">
        {quiz.questions.map((q, i) => (
          <Card key={q.id} shadow="sm" radius="md" withBorder p="lg">
            <Group gap="xs" mb="xs">
              <Badge size="sm" variant="filled" color="gray">
                {i + 1}
              </Badge>
              <Badge size="sm" variant="outline" color="blue">
                {q.type === "single"
                  ? "Opción única"
                  : q.type === "multiple"
                  ? "Opción múltiple"
                  : q.type === "matching"
                  ? "Relacionamiento"
                  : "Ordenamiento"}
              </Badge>
            </Group>

            <Text fw={600} size="md" mb="sm">
              {renderBlocks(q.blocks) || `Pregunta ${i + 1}`}
            </Text>

            <Divider mb="sm" />

            {q.type === "single" && (
              <SingleQuestion
                question={q}
                answer={singleAnswers[q.id]}
                onChange={(val) =>
                  setSingleAnswers((prev) => ({ ...prev, [q.id]: val }))
                }
              />
            )}

            {q.type === "multiple" && (
              <MultipleQuestion
                question={q}
                answers={multipleAnswers[q.id] ?? []}
                onChange={(vals) =>
                  setMultipleAnswers((prev) => ({ ...prev, [q.id]: vals }))
                }
              />
            )}

            {q.type === "matching" && (
              <MatchingQuestion
                question={q}
                matchingAnswers={matchingAnswers[q.id] ?? {}}
                onChange={(colAId, colLabel, selectedId) =>
                  setMatchingAnswers((prev) => ({
                    ...prev,
                    [q.id]: {
                      ...(prev[q.id] ?? {}),
                      [colAId]: {
                        ...(prev[q.id]?.[colAId] ?? {}),
                        [colLabel]: selectedId,
                      },
                    },
                  }))
                }
              />
            )}

            {q.type === "sorting" && (
              <SortingQuestion
                question={q}
                order={sortingOrders[q.id] ?? []}
                onChange={(newOrder) =>
                  setSortingOrders((prev) => ({ ...prev, [q.id]: newOrder }))
                }
              />
            )}
          </Card>
        ))}
      </Stack>

      {/* Botón de envío */}
      <Card mt="xl" shadow="sm" radius="md" withBorder p="lg">
        {answered < total && (
          <Alert
            icon={<FaTriangleExclamation size={14} />}
            color="yellow"
            mb="md"
          >
            Tienes {total - answered} pregunta{total - answered !== 1 ? "s" : ""} sin responder.
            Puedes enviar de todas formas.
          </Alert>
        )}
        {answered === total && (
          <Alert icon={<FaCircleCheck size={14} />} color="teal" mb="md">
            ¡Respondiste todas las preguntas!
          </Alert>
        )}
        <Button
          fullWidth
          size="md"
          color="blue"
          loading={submitting}
          onClick={handleSubmit}
        >
          Enviar examen
        </Button>
      </Card>
    </Container>
  );
}

