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
  NumberInput,
} from "@mantine/core";
import { FaArrowLeft, FaCircleCheck, FaTrophy, FaXmark, FaMedal, FaLock } from "react-icons/fa6";
import {
  getQuizById,
  Quiz,
  Question,
  UserAnswer,
  MatchingAnswer,
  EditorBlock,
} from "../../services/QuizService";
import { getBestScore, getUserAttempts, UserAnswerDto, gradeOpenQuestion } from "../../services/userQuizAttemptService";
import { useUser } from "../../context/UserContext";
import { fetchEventById } from "../../services/eventService";
import {
  CertificateFormat,
  generateCertificate,
  getCertificateDeliveryUrls,
  GeneratedCertificate,
  getTemplateFieldsByTemplate,
} from "../../services/certificateService";

type MappingSource = "userName" | "eventName" | "approvalPercentage";

interface CertificateConfig {
  templateId: string;
  format: CertificateFormat;
  fieldMappings: Record<string, MappingSource>;
}

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
    case "script-concordance":
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
function QuestionReviewCard({ question, userAnswer, index, attemptId, onScoreUpdated }: {
  question: Question;
  userAnswer?: UserAnswer;
  index: number;
  attemptId?: string;
  onScoreUpdated?: () => void;
}) {
  const correct = isAnswerCorrect(question, userAnswer);
  const qText = blocksToText(question.blocks) || `Pregunta ${index + 1}`;

  return (
    <Box>
      <Group gap="xs" mb={6} wrap="nowrap" align="flex-start">
        <Box
          style={{
            minWidth: 22, height: 22, borderRadius: 4,
            background: correct || question.type === "open" ? "var(--mantine-color-teal-light)" : userAnswer ? "var(--mantine-color-red-light)" : "var(--mantine-color-gray-light)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
          }}
        >
          {correct || question.type === "open"
            ? <FaCircleCheck size={11} color="var(--mantine-color-teal-filled)" />
            : <FaXmark size={11} color={userAnswer ? "var(--mantine-color-red-filled)" : "var(--mantine-color-gray-filled)"} />}
        </Box>
        <Box style={{ flex: 1 }}>
          <Text size="sm" fw={500} mb={2}>{index + 1}. {qText}</Text>
          <BlocksRenderer blocks={question.blocks.filter((b) => ["image", "video"].includes(b.type))} />
        </Box>
      </Group>

      {!correct && question.type !== "open" && (
        <Box pl={30}>
          {question.type === "single" && renderSingleReview(question, userAnswer?.answer as string | undefined)}
          {question.type === "script-concordance" && renderScriptConcordanceReview(question, userAnswer?.answer as string | undefined)}
          {question.type === "multiple" && renderMultipleReview(question, userAnswer?.answer as string[] | undefined)}
          {question.type === "sorting" && renderSortingReview(question, userAnswer?.answer as string[] | undefined)}
          {question.type === "matching" && renderMatchingReview(question, userAnswer?.answer as MatchingAnswer[] | undefined)}
        </Box>
      )}

      {question.type === "open" && (
        <Box pl={30}>
          <OpenQuestionReviewComponent
            question={question}
            userAnswer={userAnswer?.answer as string | undefined}
            attemptId={attemptId}
            onScoreUpdated={onScoreUpdated}
          />
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

function renderScriptConcordanceReview(q: Question, selectedId?: string) {
  return (
    <Stack gap={3}>
      <Text size="xs" c="dimmed" mb={2}>Tu respuesta vs. correcta</Text>
      {(q.options ?? []).map((opt) => {
        const isSelected = opt.id === selectedId;
        const isCorrect = opt.id === q.correctAnswer;
        const label = opt.blocks?.[0]?.content ?? opt.id;
        return (
          <Box key={opt.id}>
            <Group gap="xs">
              <Text size="xs" c={isCorrect ? "teal" : "red"}>
                {isCorrect ? "✓" : "✗"}
              </Text>
              <Text size="xs" c={isCorrect ? "teal" : "red"} style={{ flex: 1 }}>
                {label}
                {isCorrect ? " (correcta)" : ""}
                {isSelected && !isCorrect ? " (tu respuesta)" : ""}
              </Text>
            </Group>
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

function OpenQuestionReviewComponent({ question, userAnswer, attemptId, onScoreUpdated }: {
  question: Question;
  userAnswer?: string;
  attemptId?: string;
  onScoreUpdated?: () => void;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleGrade = async () => {
    if (!attemptId || score === null || score < 1 || score > 10) return;

    setLoading(true);
    try {
      await gradeOpenQuestion(attemptId, { questionId: question.id, score });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      if (onScoreUpdated) onScoreUpdated();
    } catch (error) {
      console.error("Error grading question:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="sm">
      <Box>
        <Text size="sm" fw={500} mb="xs">Respuesta del usuario:</Text>
        <Box
          style={{
            background: "#1A1A1A",
            border: "1px solid #272727",
            borderRadius: 8,
            padding: 12,
            minHeight: 80,
          }}
        >
          <Text size="sm" c="#CDCDCD">{userAnswer || "(sin respuesta)"}</Text>
        </Box>
      </Box>

      {attemptId && (
        <Box>
          <Text size="sm" fw={500} mb="xs">Calificación (1-10):</Text>
          <Group gap="md">
            <NumberInput
              value={score ?? undefined}
              onChange={(val) => setScore(typeof val === 'number' ? val : null)}
              min={1}
              max={10}
              placeholder="Ingresa 1-10"
              style={{ flex: 1 }}
            />
            <Button
              onClick={handleGrade}
              disabled={score === null || score < 1 || score > 10 || loading}
              loading={loading}
            >
              Calificar
            </Button>
            {success && <Badge color="teal">✓ Guardado</Badge>}
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Puntuación {score}: {score ? (score / 10).toFixed(2) : "—"} puntos
          </Text>
        </Box>
      )}
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
  const { userId, name } = useUser();

  const [score, setScore] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userAttemptsList, setUserAttemptsList] = useState<any[]>([]);
  const [certificateConfig, setCertificateConfig] = useState<CertificateConfig | null>(null);
  const [eventName, setEventName] = useState("");
  const [generatingCertificate, setGeneratingCertificate] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<GeneratedCertificate | null>(null);

  useEffect(() => {
    if (!quizId || quizId === "undefined" || !userId) return;
    (async () => {
      try {
        const [scoreResult, quizResult, attemptsResult, eventResult] = await Promise.allSettled([
          getBestScore(quizId!, userId!),
          getQuizById(quizId!),
          getUserAttempts(quizId!, userId!),
          eventId ? fetchEventById(eventId) : Promise.resolve(null),
        ]);
        
        // El backend devuelve false si el usuario aún no ha intentado el examen.
        if (scoreResult.status === "fulfilled") {
          setScore(scoreResult.value === false ? null : scoreResult.value);
        }
        
        if (quizResult.status === "fulfilled") {
          setQuiz(quizResult.value);
        }
        
        // Si el servicio de intentos no está disponible, simplemente no mostres la lista
        if (attemptsResult.status === "fulfilled") {
          setUserAttemptsList(attemptsResult.value);
        }

        if (eventResult.status === "fulfilled" && eventResult.value) {
          setEventName(eventResult.value.name || "");
          const config = eventResult.value.styles?.certificateConfig as
            | CertificateConfig
            | undefined;
          if (config?.templateId && config?.fieldMappings) {
            setCertificateConfig(config);
          } else {
            setCertificateConfig(null);
          }
        }
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

  // ── Verificar si el examen está en revisión (tiene preguntas abiertas) ──
  const lastAttempt = userAttemptsList.length > 0
    ? userAttemptsList.reduce((latest, a) =>
        new Date(a.attemptedAt) > new Date(latest.attemptedAt) ? a : latest
      )
    : null;
  const isUnderReview = lastAttempt?.status === 'review';

  // ── Intentos restantes ──
  const maxAttempts = quiz?.config?.attempts ?? null; // null = ilimitado
  const attemptsUsed = userAttemptsList.filter(
    (a) => a.userId === userId,
  ).length;
  const attemptsLeft = maxAttempts != null ? maxAttempts - attemptsUsed : null;
  // Puede reintentar si: ilimitado (null) O le quedan intentos (> 0), Y no sacó 100%
  const canRetry = (attemptsLeft === null || attemptsLeft > 0) && numScore < 100;

  // ── Último intento: se muestra el desglose cuando se agotan los intentos y no hay 100% ──
  const showReview = attemptsLeft !== null && attemptsLeft <= 0 && numScore < 100;

  const resolveMappingValue = (source: MappingSource): string | number => {
    if (source === "userName") return name || "Participante";
    if (source === "eventName") return eventName || "Evento";
    return `${numScore}%`;
  };

  const ensureCertificate = async (): Promise<GeneratedCertificate | null> => {
    if (generatedCertificate) return generatedCertificate;

    if (!certificateConfig?.templateId) {
      setError("Este evento no tiene configuración de certificado.");
      return null;
    }

    try {
      setGeneratingCertificate(true);
      setError(null);

      const fields = await getTemplateFieldsByTemplate(certificateConfig.templateId);
      if (!fields.length) {
        setError("El template configurado no tiene template-fields.");
        return null;
      }

      const missing = fields.filter(
        (field) => !certificateConfig.fieldMappings?.[field.name],
      );
      if (missing.length > 0) {
        setError(
          "Faltan relaciones de template-fields en la configuración del certificado.",
        );
        return null;
      }

      const data: Record<string, string | number> = {};
      fields.forEach((field) => {
        const source = certificateConfig.fieldMappings[field.name];
        data[field.name] = resolveMappingValue(source);
      });

      const generated = await generateCertificate({
        templateId: certificateConfig.templateId,
        format: certificateConfig.format || "PDF",
        data,
      });
      setGeneratedCertificate(generated);
      return generated;
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          "No se pudo generar el certificado con la información actual.",
      );
      return null;
    } finally {
      setGeneratingCertificate(false);
    }
  };

  const handleOpenCertificate = async (mode: "view" | "download") => {
    const certificate = await ensureCertificate();
    if (!certificate) return;

    const { viewUrl, downloadUrl } = getCertificateDeliveryUrls(certificate);
    window.open(
      mode === "view" ? viewUrl : downloadUrl,
      "_blank",
      "noopener,noreferrer",
    );
  };

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
        {isUnderReview ? "Resultado Parcial" : "Resultado del examen"}
      </Title>

      {/* Mensaje de revisión pendiente */}
      {isUnderReview && (
        <Alert icon={<FaTrophy size={16} />} color="blue" mb="lg">
          <Stack gap="xs">
            <Text fw={600}>Tu examen está en proceso de revisión</Text>
            <Text size="sm">
              Este resultado es parcial y solo incluye las preguntas que se califican automáticamente. 
              Una vez que un evaluador califique las preguntas abiertas, tu nota se verá actualizada.
            </Text>
          </Stack>
        </Alert>
      )}

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

          {/* ── Botón Generar Certificado (solo si aprobó y el intento está graded) ── */}
          {passed === true && lastAttempt?.status === "graded" && (
            <Stack w="100%" align="center" gap="xs">
              <Group>
                <Button
                  variant="light"
                  color="blue"
                  loading={generatingCertificate}
                  disabled={!certificateConfig?.templateId}
                  onClick={() => handleOpenCertificate("view")}
                >
                  Ver certificado
                </Button>
                <Button
                  variant="light"
                  color="grape"
                  loading={generatingCertificate}
                  disabled={!certificateConfig?.templateId}
                  onClick={() => handleOpenCertificate("download")}
                >
                  Descargar certificado
                </Button>
              </Group>
            </Stack>
          )}

          {passed === true && lastAttempt?.status === "graded" && !certificateConfig?.templateId && (
            <Alert color="yellow" variant="light" style={{ width: "100%" }}>
              El certificado aún no está configurado por el administrador del curso.
            </Alert>
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
                (a: UserAnswerDto) => a.questionId === question.id,
              );
              const handleScoreUpdated = async () => {
                // Refrescar los datos del usuario
                const [scoreResult, attemptsResult] = await Promise.allSettled([
                  getBestScore(quizId!, userId!),
                  getUserAttempts(quizId!, userId!),
                ]);
                if (scoreResult.status === "fulfilled") {
                  setScore(scoreResult.value === false ? null : scoreResult.value);
                }
                if (attemptsResult.status === "fulfilled") {
                  setUserAttemptsList(attemptsResult.value);
                }
              };
              return (
                <Box key={question.id}>
                  <QuestionReviewCard
                    question={question}
                    userAnswer={userAnswer}
                    index={idx}
                    attemptId={lastAttempt._id}
                    onScoreUpdated={handleScoreUpdated}
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
