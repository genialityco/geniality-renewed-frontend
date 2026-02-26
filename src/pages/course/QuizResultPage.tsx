import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Container,
  Loader,
  Text,
  Button,
  Group,
  Title,
  Card,
  Center,
  RingProgress,
  Stack,
  Badge,
  Alert,
  Divider,
  Box,
} from "@mantine/core";
import { FaArrowLeft, FaCircleCheck, FaTrophy, FaXmark, FaMedal, FaLock } from "react-icons/fa6";
import {
  getQuizById,
  getScoreByUserId,
  Quiz,
  Question,
  UserAnswer,
  MatchingAnswer,
  EditorBlock,
} from "../../services/QuizService";
import { useUser } from "../../context/UserContext";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function blocksToText(blocks: EditorBlock[]): string {
  return (blocks ?? [])
    .filter((b) => !["image", "video"].includes(b.type))
    .map((b) => b.content)
    .join(" ")
    .trim();
}

function getEmbedUrl(url: string): string | null {
  try {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vi = url.match(/vimeo\.com\/(\d+)/);
    if (vi) return `https://player.vimeo.com/video/${vi[1]}`;
  } catch {}
  return null;
}

/** Renderiza una lista de EditorBlock con soporte para imagen y video */
function BlocksRenderer({ blocks }: { blocks: EditorBlock[] }) {
  return (
    <>
      {(blocks ?? []).map((block) => {
        switch (block.type) {
          case "image":
            return block.content ? (
              <img
                key={block.id}
                src={block.content}
                alt=""
                style={{ maxWidth: "100%", borderRadius: 6, display: "block", margin: "4px 0" }}
              />
            ) : null;
          case "video": {
            if (!block.content) return null;
            const embedUrl = getEmbedUrl(block.content);
            if (embedUrl) {
              return (
                <iframe
                  key={block.id}
                  src={embedUrl}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", aspectRatio: "16/9", border: "none", borderRadius: 6, display: "block", margin: "4px 0" }}
                />
              );
            }
            // Firebase video o URL directa
            return (
              <video
                key={block.id}
                src={block.content}
                controls
                style={{ width: "100%", borderRadius: 6, display: "block", margin: "4px 0" }}
              />
            );
          }
          case "h1":
            return <Text key={block.id} size="xl" fw={700}>{block.content}</Text>;
          case "h2":
            return <Text key={block.id} size="lg" fw={600}>{block.content}</Text>;
          case "bullet-list":
            return <Text key={block.id} size="sm">• {block.content}</Text>;
          case "numbered-list":
            return <Text key={block.id} size="sm">{block.content}</Text>;
          default:
            return <Text key={block.id} size="sm">{block.content}</Text>;
        }
      })}
    </>
  );
}

function isAnswerCorrect(q: Question, ua?: UserAnswer): boolean {
  if (!ua) return false;
  switch (q.type) {
    case "single":
      return ua.answer === q.correctAnswer;
    case "multiple": {
      const u = (ua.answer as string[]).slice().sort();
      const c = (q.correctAnswers ?? []).slice().sort();
      return u.length === c.length && u.every((v, i) => v === c[i]);
    }
    case "sorting": {
      const u = ua.answer as string[];
      const c = q.correctOrder ?? [];
      return u.length === c.length && u.every((v, i) => v === c[i]);
    }
    case "matching": {
      const u = ua.answer as MatchingAnswer[];
      const c = q.matchingAnswers ?? [];
      if (!Array.isArray(u) || u.length !== c.length) return false;
      return c.every((cr) => {
        const ur = u.find((r) => r.columnAId === cr.columnAId);
        if (!ur) return false;
        return Object.entries(cr.matches).every(([col, val]) => ur.matches[col] === val);
      });
    }
    default:
      return false;
  }
}

/** Tarjeta por pregunta: muestra respuesta del usuario y la correcta */
function QuestionReviewCard({ question, userAnswer, index }: {
  question: Question;
  userAnswer?: UserAnswer;
  index: number;
}) {
  const correct = isAnswerCorrect(question, userAnswer);
  const qText = blocksToText(question.blocks) || `Pregunta ${index + 1}`;

  return (
    <Box>
      <Group gap="xs" mb={6} wrap="nowrap" align="flex-start">
        <Box
          style={{
            minWidth: 22, height: 22, borderRadius: 4,
            background: correct ? "var(--mantine-color-teal-light)" : userAnswer ? "var(--mantine-color-red-light)" : "var(--mantine-color-gray-light)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
          }}
        >
          {correct
            ? <FaCircleCheck size={11} color="var(--mantine-color-teal-filled)" />
            : <FaXmark size={11} color={userAnswer ? "var(--mantine-color-red-filled)" : "var(--mantine-color-gray-filled)"} />}
        </Box>
        <Box style={{ flex: 1 }}>
          <Text size="sm" fw={500} mb={2}>{index + 1}. {qText}</Text>
          <BlocksRenderer blocks={question.blocks.filter((b) => ["image", "video"].includes(b.type))} />
        </Box>
      </Group>

      {!correct && (
        <Box pl={30}>
          {question.type === "single" && renderSingleReview(question, userAnswer?.answer as string | undefined)}
          {question.type === "multiple" && renderMultipleReview(question, userAnswer?.answer as string[] | undefined)}
          {question.type === "sorting" && renderSortingReview(question, userAnswer?.answer as string[] | undefined)}
          {question.type === "matching" && renderMatchingReview(question, userAnswer?.answer as MatchingAnswer[] | undefined)}
        </Box>
      )}
    </Box>
  );
}

function renderSingleReview(q: Question, selectedId?: string) {
  return (
    <Stack gap={3}>
      {(q.options ?? []).map((opt) => {
        const isSelected = opt.id === selectedId;
        const isCorrect = opt.id === q.correctAnswer;
        if (!isSelected && !isCorrect) return null;
        return (
          <Box key={opt.id}>
            <Group gap="xs">
              <Text size="xs" c={isCorrect ? "teal" : "red"}>
                {isCorrect ? "✓" : "✗"}
              </Text>
              <Text size="xs" c={isCorrect ? "teal" : "red"} fs={!isCorrect ? "italic" : undefined} style={{ flex: 1 }}>
                {blocksToText(opt.blocks) || "(sin texto)"}{isCorrect && !isSelected ? " (correcta)" : ""}{isSelected && !isCorrect ? " (tu respuesta)" : ""}
              </Text>
            </Group>
            <Box pl={20}>
              <BlocksRenderer blocks={opt.blocks.filter((b) => ["image", "video"].includes(b.type))} />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function renderMultipleReview(q: Question, selectedIds?: string[]) {
  const sel = selectedIds ?? [];
  const correct = q.correctAnswers ?? [];
  const relevant = (q.options ?? []).filter(
    (o) => sel.includes(o.id) || correct.includes(o.id),
  );
  if (relevant.length === 0) return <Text size="xs" c="dimmed">Sin respuesta</Text>;
  return (
    <Stack gap={3}>
      {relevant.map((opt) => {
        const isSelected = sel.includes(opt.id);
        const isCorrect = correct.includes(opt.id);
        return (
          <Box key={opt.id}>
            <Group gap="xs">
              <Text size="xs" c={isCorrect ? "teal" : "red"}>{isCorrect ? "✓" : "✗"}</Text>
              <Text size="xs" c={isCorrect ? "teal" : "red"} style={{ flex: 1 }}>
                {blocksToText(opt.blocks) || "(sin texto)"}
                {isCorrect && !isSelected ? " (correcta)" : ""}
                {isSelected && !isCorrect ? " (tu respuesta)" : ""}
              </Text>
            </Group>
            <Box pl={20}>
              <BlocksRenderer blocks={opt.blocks.filter((b) => ["image", "video"].includes(b.type))} />
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

function renderSortingReview(q: Question, userOrder?: string[]) {
  const order = (userOrder ?? []).length > 0 ? userOrder! : (q.options ?? []).map((o) => o.id);
  const correct = q.correctOrder ?? [];
  const optMap = Object.fromEntries((q.options ?? []).map((o) => [o.id, blocksToText(o.blocks)]));
  return (
    <Stack gap={3}>
      <Text size="xs" c="dimmed" mb={2}>Tu orden → correcto</Text>
      {order.map((id, i) => {
        const isCorrectPos = correct[i] === id;
        const correctText = optMap[correct[i]] ?? correct[i];
        const userText = optMap[id] ?? id;
        return (
          <Group key={id} gap="xs" wrap="nowrap">
            <Text size="xs" c={isCorrectPos ? "teal" : "red"}>{isCorrectPos ? "✓" : "✗"}</Text>
            <Text size="xs" c={isCorrectPos ? "teal" : "red"} style={{ flex: 1 }}>
              {i + 1}. {userText}
              {!isCorrectPos && <Text span c="dimmed"> → {correctText}</Text>}
            </Text>
          </Group>
        );
      })}
    </Stack>
  );
}

function renderMatchingReview(q: Question, matchingAnswers?: MatchingAnswer[]) {
  const colA = (q.columns ?? []).find((c) => c.label === "A");
  const otherCols = (q.columns ?? []).filter((c) => c.label !== "A");
  const optTextMap: Record<string, string> = {};
  (q.columns ?? []).forEach((col) => col.options.forEach((o) => { optTextMap[o.id] = blocksToText(o.blocks); }));
  const matchMap: Record<string, Record<string, string>> = {};
  (matchingAnswers ?? []).forEach((ma) => { matchMap[ma.columnAId] = ma.matches ?? {}; });
  const correctMap: Record<string, Record<string, string>> = {};
  (q.matchingAnswers ?? []).forEach((ma: any) => { correctMap[ma.columnAId] = ma.matches ?? {}; });

  return (
    <Stack gap={6}>
      {otherCols.map((colB) => (
        <Box key={colB.label}>
          {otherCols.length > 1 && <Text size="10px" c="dimmed" mb={3}>Columna {colB.label}</Text>}
          {(colA?.options ?? []).map((aOpt) => {
            const userBId = matchMap[aOpt.id]?.[colB.label];
            const correctBId = correctMap[aOpt.id]?.[colB.label];
            const isCorrect = userBId === correctBId;
            return (
              <Group key={aOpt.id} gap="xs" wrap="nowrap" mb={2}>
                <Text size="xs" c={isCorrect ? "teal" : "red"}>{isCorrect ? "✓" : "✗"}</Text>
                <Text size="xs" style={{ flex: 1 }}>
                  <Text span c="dimmed">{optTextMap[aOpt.id]}</Text>
                  <Text span c="dimmed"> → </Text>
                  <Text span c={isCorrect ? "teal" : "red"}>{optTextMap[userBId ?? ""] || "(sin respuesta)"}</Text>
                  {!isCorrect && correctBId && (
                    <Text span c="teal"> (correcto: {optTextMap[correctBId]})</Text>
                  )}
                </Text>
              </Group>
            );
          })}
        </Box>
      ))}
    </Stack>
  );
}

function scoreColor(score: number, minNota?: number | null): string {
  if (minNota != null) {
    return score >= minNota ? "teal" : "red";
  }
  if (score >= 80) return "teal";
  if (score >= 50) return "yellow";
  return "red";
}

export default function QuizResultPage() {
  const { organizationId, eventId, quizId } = useParams<{
    organizationId: string;
    eventId: string;
    quizId: string;
  }>();
  const navigate = useNavigate();
  const { userId } = useUser();

  const [score, setScore] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId || quizId === "undefined" || !userId) return;
    (async () => {
      try {
        const [scoreData, quizData] = await Promise.all([
          getScoreByUserId(quizId, userId),
          getQuizById(quizId),
        ]);
        // El backend devuelve false si el usuario aún no ha intentado el examen.
        setScore(scoreData === false ? null : scoreData);
        setQuiz(quizData);
      } catch (e: any) {
        setError(
          e?.response?.data?.message ?? "Error al cargar tu resultado.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [quizId, userId]);

  const handleBack = () => {
    navigate(`/organization/${organizationId}/course/${eventId}`);
  };

  if (loading)
    return (
      <Center mt="xl">
        <Loader />
      </Center>
    );

  if (error)
    return (
      <Container mt="xl">
        <Text c="red">{error}</Text>
        <Button mt="md" variant="subtle" onClick={handleBack}>
          Volver al curso
        </Button>
      </Container>
    );

  const numScore = score ?? 0;
  const totalQuestions = quiz?.questions?.length ?? 0;
  const correctAnswers = totalQuestions > 0 ? Math.round((numScore / 100) * totalQuestions) : null;
  const minNota = quiz?.config?.nota ?? null;
  const color = scoreColor(numScore, minNota);
  const passed = minNota != null ? numScore >= minNota : null;

  // ── Intentos restantes ──
  const maxAttempts = quiz?.config?.attempts ?? null; // null = ilimitado
  const attemptsUsed = (quiz?.listUserAttempts ?? []).filter(
    (a) => a.userId === userId,
  ).length;
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptsUsed : null;
  // Puede reintentar si: ilimitado (null) O le quedan intentos (> 0), Y no sacó 100%
  const canRetry = (attemptsLeft === null || attemptsLeft > 0) && numScore < 100;

  // ── Último intento: se muestra el desglose cuando se agotan los intentos y no hay 100% ──
  const showReview = attemptsLeft !== null && attemptsLeft <= 0 && numScore < 100;
  const userAttempts = (quiz?.listUserAttempts ?? []).filter((a) => a.userId === userId);
  const lastAttempt = userAttempts.length > 0
    ? userAttempts.reduce((latest, a) =>
        new Date(a.attemptedAt) > new Date(latest.attemptedAt) ? a : latest
      )
    : null;

  const handleRetry = () => {
    navigate(`/organization/${organizationId}/course/${eventId}/quiz/${quizId}`);
  };

  return (
    <Container size="sm" py="xl">
      <Group mb="lg">
        <Button
          variant="subtle"
          leftSection={<FaArrowLeft size={14} />}
          onClick={handleBack}
        >
          Volver al curso
        </Button>
      </Group>

      <Title order={2} mb="xl" ta="center">
        Resultado del examen
      </Title>

      <Card shadow="md" radius="lg" withBorder p="xl">
        <Stack align="center" gap="md">
          <FaTrophy size={40} color={color === "teal" ? "#38d9a9" : color === "yellow" ? "#ffa94d" : "#ff6b6b"} />

          {/* ── Estado: Aprobado / Reprobado ── */}
          {passed !== null ? (
            <Badge
              size="xl"
              radius="sm"
              color={passed ? "teal" : "red"}
              leftSection={passed ? <FaCircleCheck size={14} /> : <FaXmark size={14} />}
            >
              {passed ? "APROBADO" : "REPROBADO"}
            </Badge>
          ) : (
            <Badge size="xl" radius="sm" color={color} leftSection={<FaMedal size={14} />}>
              {numScore >= 80 ? "EXCELENTE" : numScore >= 50 ? "BUEN INTENTO" : "SIGUE PRACTICANDO"}
            </Badge>
          )}

          <RingProgress
            size={160}
            thickness={14}
            roundCaps
            sections={[{ value: numScore, color }]}
            label={
              <Center>
                <Stack align="center" gap={2}>
                  <Text fw={700} size="xl">
                    {numScore}%
                  </Text>
                  {correctAnswers !== null && (
                    <Text size="xs" c="dimmed">
                      {correctAnswers}/{totalQuestions}
                    </Text>
                  )}
                </Stack>
              </Center>
            }
          />

          {minNota != null && (
            <Alert
              color={passed ? "teal" : "red"}
              radius="md"
              variant="light"
              style={{ width: "100%" }}
            >
              <Text size="sm">
                {passed
                  ? `Superaste la nota mínima de aprobación (${minNota}%).`
                  : `No alcanzaste la nota mínima de aprobación (${minNota}%).`}
              </Text>
            </Alert>
          )}

          <Text size="sm" c="dimmed" ta="center">
            Tu puntaje en este examen fue de{" "}
            <strong>{numScore}%</strong>
            {correctAnswers !== null && (
              <> ({correctAnswers} de {totalQuestions} respuesta{totalQuestions !== 1 ? "s" : ""} correcta{totalQuestions !== 1 ? "s" : ""})</>
            )}.
          </Text>

          {/* ── Reintentar ── */}
          {canRetry && score !== null && (
            <Stack align="center" gap={4} w="100%">
              <Button
                fullWidth
                variant="light"
                color="blue"
                onClick={handleRetry}
              >
                Volver a intentar
              </Button>
              <Text size="xs" c="dimmed">
                {attemptsLeft === null
                  ? "Intentos restantes: ilimitados"
                  : `Intento${attemptsLeft !== 1 ? "s" : ""} restante${attemptsLeft !== 1 ? "s" : ""}: ${attemptsLeft}`}
              </Text>
            </Stack>
          )}
        </Stack>
      </Card>

      {/* ── Desglose de respuestas: solo cuando se agotan los intentos sin llegar a 100% ── */}
      {showReview && lastAttempt && quiz && quiz.questions.length > 0 && (
        <Card shadow="sm" radius="lg" withBorder p="xl" mt="lg">
          <Group mb="xs" gap="xs">
            <FaLock size={14} color="var(--mantine-color-dimmed)" />
            <Title order={4}>Revisión del examen</Title>
          </Group>
          <Text size="xs" c="dimmed" mb="md">
            Se te acabaron los intentos. Aquí puedes ver las respuestas correctas comparadas con tu último intento.
          </Text>
          <Divider mb="md" />
          <Stack gap="sm">
            {quiz.questions.map((question, idx) => {
              const userAnswer = lastAttempt.userAnswers?.find(
                (a) => a.questionId === question.id,
              );
              return (
                <Box key={question.id}>
                  <QuestionReviewCard
                    question={question}
                    userAnswer={userAnswer}
                    index={idx}
                  />
                  {idx < quiz.questions.length - 1 && <Divider mt="sm" />}
                </Box>
              );
            })}
          </Stack>
        </Card>
      )}
    </Container>
  );
}
