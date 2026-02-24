import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  Alert,
  Progress,
} from "@mantine/core";
import { FaArrowLeft, FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import {
  getQuizById,
  submitAttempt,
  Quiz,
  Question,
  QuestionOption,
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

// ─────────────────────────────────────────────
// MatchingPair: visual de líneas entre dos columnas
// ─────────────────────────────────────────────

function MatchingPair({
  colAOptions,
  colB,
  colLabel,
  matches,
  onMatch,
}: {
  colAOptions: QuestionOption[];
  colB: { label: string; options: QuestionOption[] };
  colLabel: string;
  /** { [aOptId]: bOptId } */
  matches: Record<string, string>;
  onMatch: (aId: string, bId: string | null) => void;
}) {
  const [selectedAId, setSelectedAId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const aRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const bRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [, forceUpdate] = useState(0);

  // Re-mide posiciones después de cada cambio de matches o tamaño
  useLayoutEffect(() => {
    forceUpdate((t) => t + 1);
  }, [matches]);

  useEffect(() => {
    const observer = new ResizeObserver(() => forceUpdate((t: number) => t + 1));
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const getPoint = (
    el: HTMLDivElement | null,
    container: HTMLDivElement | null,
    side: "right" | "left",
  ) => {
    if (!el || !container) return null;
    const er = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return {
      x: side === "right" ? er.right - cr.left : er.left - cr.left,
      y: er.top - cr.top + er.height / 2,
    };
  };

  // Construye las líneas a dibujar
  const lines: { aId: string; bId: string; x1: number; y1: number; x2: number; y2: number }[] = [];
  Object.entries(matches).forEach(([aId, bId]) => {
    if (!bId) return;
    const a = getPoint(aRefs.current[aId], containerRef.current, "right");
    const b = getPoint(bRefs.current[bId], containerRef.current, "left");
    if (a && b) lines.push({ aId, bId, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  });

  const handleAClick = (aId: string) => {
    setSelectedAId((prev) => (prev === aId ? null : aId));
  };

  const handleBClick = (bId: string) => {
    if (selectedAId) {
      // Si se clica el mismo B que ya está conectado → desconectar
      if (matches[selectedAId] === bId) {
        onMatch(selectedAId, null);
      } else {
        onMatch(selectedAId, bId);
      }
      setSelectedAId(null);
    } else {
      // Si no hay A seleccionada, clic en B desconecta esa línea
      const aMatched = Object.entries(matches).find(([, v]) => v === bId)?.[0];
      if (aMatched) onMatch(aMatched, null);
    }
  };

  const optText = (opt: QuestionOption) => renderBlocks(opt.blocks) || "(sin texto)";

  const itemBase: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
    cursor: "pointer",
    userSelect: "none",
    transition: "border-color 0.15s, background 0.15s",
    marginBottom: 8,
    border: "1.5px solid #2a2a2a",
    background: "#141414",
    color: "#CDCDCD",
  };

  return (
    <div>
      {colLabel !== "B" && (
        <Text size="xs" c="dimmed" mb="xs" fw={600}>
          Columna {colLabel}
        </Text>
      )}
      <div
        ref={containerRef}
        style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 0 }}
      >
        {/* SVG de líneas */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "visible",
            zIndex: 1,
          }}
        >
          <defs>
            <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <circle cx="3" cy="3" r="2" fill="#4dabf7" />
            </marker>
          </defs>
          {lines.map((l) => (
            <line
              key={`${l.aId}-${l.bId}`}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="#4dabf7"
              strokeWidth={2}
              strokeLinecap="round"
              markerEnd="url(#arrow)"
              markerStart="url(#arrow)"
            />
          ))}
          {/* Línea provisional del A seleccionado si ya tiene match */}
        </svg>

        {/* Columna A */}
        <div style={{ flex: 1, zIndex: 2 }}>
          {colAOptions.map((opt) => {
            const isSelected = selectedAId === opt.id;
            const isMatched = !!matches[opt.id];
            return (
              <div
                key={opt.id}
                ref={(el) => { aRefs.current[opt.id] = el; }}
                onClick={() => handleAClick(opt.id)}
                style={{
                  ...itemBase,
                  borderColor: isSelected
                    ? "#4dabf7"
                    : isMatched
                    ? "#2c5f2e"
                    : "#2a2a2a",
                  background: isSelected
                    ? "#1a2a3a"
                    : isMatched
                    ? "#162C1D"
                    : "#141414",
                  boxShadow: isSelected ? "0 0 0 3px #4dabf730" : "none",
                }}
              >
                {optText(opt)}
              </div>
            );
          })}
        </div>

        {/* Espacio central para las líneas */}
        <div style={{ minWidth: 64, flexShrink: 0 }} />

        {/* Columna B (u otra) */}
        <div style={{ flex: 1, zIndex: 2 }}>
          {colB.options.map((opt) => {
            const isMatchedToSelected = selectedAId
              ? matches[selectedAId] === opt.id
              : false;
            const isMatched = Object.values(matches).includes(opt.id);
            return (
              <div
                key={opt.id}
                ref={(el) => { bRefs.current[opt.id] = el; }}
                onClick={() => handleBClick(opt.id)}
                style={{
                  ...itemBase,
                  borderColor: isMatchedToSelected
                    ? "#4dabf7"
                    : isMatched
                    ? "#2c5f2e"
                    : selectedAId
                    ? "#333"
                    : "#2a2a2a",
                  background: isMatchedToSelected
                    ? "#1a2a3a"
                    : isMatched
                    ? "#162C1D"
                    : "#141414",
                  opacity: selectedAId && !isMatchedToSelected ? 0.85 : 1,
                }}
              >
                {optText(opt)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instrucción */}
      <Text size="xs" c="dimmed" mt={4}>
        {selectedAId
          ? "Ahora haz clic en un elemento de la derecha para conectarlo."
          : "Haz clic en un elemento de la izquierda para comenzar a conectar."}
      </Text>
    </div>
  );
}

function MatchingQuestion({
  question,
  matchingAnswers,
  onChange,
}: {
  question: Question;
  matchingAnswers: Record<string, Record<string, string>>;
  onChange: (columnAId: string, columnLabel: string, selectedId: string | null) => void;
}) {
  const colA = question.columns?.find((c) => c.label === "A");
  const otherCols = question.columns?.filter((c) => c.label !== "A") ?? [];

  return (
    <Stack gap="xl" mt="sm">
      {otherCols.map((col) => {
        // matches para este par: { [aOptId]: bOptId }
        const pairMatches: Record<string, string> = {};
        (colA?.options ?? []).forEach((aOpt) => {
          const matched = matchingAnswers[aOpt.id]?.[col.label];
          if (matched) pairMatches[aOpt.id] = matched;
        });

        return (
          <MatchingPair
            key={col.label}
            colAOptions={colA?.options ?? []}
            colB={col}
            colLabel={col.label}
            matches={pairMatches}
            onMatch={(aId, bId) => onChange(aId, col.label, bId)}
          />
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
  const currentOrder =
    order.length > 0 ? order : (question.options?.map((o) => o.id) ?? []);

  const optMap = Object.fromEntries(
    (question.options ?? []).map((o) => [
      o.id,
      renderBlocks(o.blocks) || "(sin texto)",
    ]),
  );

  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handleDragStart = (i: number) => {
    dragItem.current = i;
    setDraggingIndex(i);
  };

  const handleDragEnter = (i: number) => {
    dragOver.current = i;
    setOverIndex(i);
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOver.current !== null && dragItem.current !== dragOver.current) {
      const newOrd = [...currentOrder];
      const dragged = newOrd.splice(dragItem.current, 1)[0];
      newOrd.splice(dragOver.current, 0, dragged);
      onChange(newOrd);
    }
    dragItem.current = null;
    dragOver.current = null;
    setDraggingIndex(null);
    setOverIndex(null);
  };

  return (
    <Stack gap="xs" mt="sm">
      <Text size="xs" c="dimmed" mb={4}>
        Arrastra los elementos para ordenarlos.
      </Text>
      {currentOrder.map((id, i) => {
        const isDragging = draggingIndex === i;
        const isOver = overIndex === i && draggingIndex !== i;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragEnter={() => handleDragEnter(i)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={handleDragEnd}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 8,
              border: isOver
                ? "1.5px dashed #4dabf7"
                : "1.5px solid #2a2a2a",
              background: isDragging
                ? "#0f1a25"
                : isOver
                ? "#1a2530"
                : "#141414",
              opacity: isDragging ? 0.45 : 1,
              cursor: "grab",
              transition: "border-color 0.15s, background 0.15s, opacity 0.15s",
              userSelect: "none",
            }}
          >
            {/* Handle visual */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                flexShrink: 0,
                opacity: 0.4,
              }}
            >
              {[0, 1, 2].map((row) => (
                <div key={row} style={{ display: "flex", gap: 3 }}>
                  {[0, 1].map((dot) => (
                    <div
                      key={dot}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "#AFAFAF",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Número de posición */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 22,
                height: 22,
                borderRadius: 6,
                background: isOver ? "#1a3a5a" : "#1e1e1e",
                color: isOver ? "#4dabf7" : "#777",
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {i + 1}
            </span>

            <Text size="sm" style={{ flex: 1, color: "#CDCDCD" }}>
              {optMap[id]}
            </Text>
          </div>
        );
      })}
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
                  setMatchingAnswers((prev) => {
                    const qMap = { ...(prev[q.id] ?? {}) };
                    if (selectedId === null) {
                      // Eliminar match
                      const aMap = { ...(qMap[colAId] ?? {}) };
                      delete aMap[colLabel];
                      qMap[colAId] = aMap;
                    } else {
                      qMap[colAId] = { ...(qMap[colAId] ?? {}), [colLabel]: selectedId };
                    }
                    return { ...prev, [q.id]: qMap };
                  })
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

