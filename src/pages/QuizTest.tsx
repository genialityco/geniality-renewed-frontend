import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  Divider,
  ActionIcon,
  Select,
  Badge,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconTrash, IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import { v4 as uuidv4 } from "uuid";

import {
  createOrUpdateQuiz,
  fetchQuizByEventId,
} from "../services/quizService";
import BlocksContainer from "../components/QuizEditor/BlocksContainer";
import { 
  QuestionWithBlocks, 
  SingleChoiceQuestion,
  MultipleChoiceQuestion,
  MatchingQuestion,
  OrderingQuestion,
  QUESTION_TYPES,
} from "../components/QuizEditor/types";

type Props = { eventId: string };

const createEmptyQuestion = (type: string = "single-choice"): QuestionWithBlocks => {
  const baseQuestion = {
    id: uuidv4(),
    blocks: [
      {
        type: "text" as const,
        id: uuidv4(),
        content: "",
        format: "plain" as const,
        listType: "none" as const,
      },
    ],
  };

  switch (type) {
    case "multiple-choice":
      return {
        ...baseQuestion,
        type: "multiple-choice",
        opciones: [
          { id: uuidv4(), blocks: [] },
          { id: uuidv4(), blocks: [] },
          { id: uuidv4(), blocks: [] },
          { id: uuidv4(), blocks: [] },
        ],
        respuestascorrectas: [],
      };
    case "matching":
      return {
        ...baseQuestion,
        type: "matching",
        pairs: [
          { id: uuidv4(), leftBlocks: [], rightBlocks: [] },
          { id: uuidv4(), leftBlocks: [], rightBlocks: [] },
        ],
        correctPairings: [0, 1],
      };
    case "ordering":
      const orderingItems = [
        { id: uuidv4(), blocks: [] },
        { id: uuidv4(), blocks: [] },
        { id: uuidv4(), blocks: [] },
      ];
      return {
        ...baseQuestion,
        type: "ordering",
        items: orderingItems,
        correctOrder: orderingItems.map(item => item.id),
      };
    case "single-choice":
    default:
      return {
        ...baseQuestion,
        type: "single-choice",
        opciones: [
          { id: uuidv4(), blocks: [] },
          { id: uuidv4(), blocks: [] },
          { id: uuidv4(), blocks: [] },
          { id: uuidv4(), blocks: [] },
        ],
        respuestacorrecta: 0,
      };
  }
};

// ===== COMPONENTES ESPECÍFICOS POR TIPO DE PREGUNTA =====

interface SingleChoiceEditorProps {
  question: SingleChoiceQuestion;
  onUpdate: (q: SingleChoiceQuestion) => void;
}

function SingleChoiceEditor({ question, onUpdate }: SingleChoiceEditorProps) {
  const addOption = () => {
    const newOption = {
      id: uuidv4(),
      blocks: [
        {
          type: "text" as const,
          id: uuidv4(),
          content: "",
          format: "plain" as const,
          listType: "none" as const,
        },
      ],
    };
    onUpdate({
      ...question,
      opciones: [...question.opciones, newOption],
    });
  };

  const removeSingleChoiceOption = (optIdx: number) => {
    const newOpciones = question.opciones.filter((_, j) => j !== optIdx);
    let newCorrect = question.respuestacorrecta;
    if (newCorrect >= newOpciones.length) {
      newCorrect = Math.max(0, newOpciones.length - 1);
    }
    onUpdate({
      ...question,
      opciones: newOpciones,
      respuestacorrecta: newCorrect,
    });
  };

  const updateOptionBlocks = (optIdx: number, blocks: any[]) => {
    const newOpciones = [...question.opciones];
    newOpciones[optIdx] = { ...newOpciones[optIdx], blocks };
    onUpdate({ ...question, opciones: newOpciones });
  };

  return (
    <Stack gap="md">
      <Text fw={500}>Opciones de respuesta</Text>

      <Stack gap="md">
        {question.opciones.map((opt, optIdx) => (
          <Card key={opt.id} p="md" withBorder radius="sm" bg="gray.0">
            <Group justify="space-between" align="flex-start" mb="sm">
              <Group>
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={question.respuestacorrecta === optIdx}
                  onChange={() =>
                    onUpdate({ ...question, respuestacorrecta: optIdx })
                  }
                />
                <Text fw={500} size="sm">
                  Opción {optIdx + 1}
                </Text>
              </Group>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => removeSingleChoiceOption(optIdx)}
                disabled={question.opciones.length <= 2}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>

            <BlocksContainer
              blocks={opt.blocks}
              onBlocksChange={(blocks) => updateOptionBlocks(optIdx, blocks)}
            />
          </Card>
        ))}
      </Stack>

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={addOption}
        size="sm"
      >
        Agregar opción
      </Button>
    </Stack>
  );
}

interface MultipleChoiceEditorProps {
  question: MultipleChoiceQuestion;
  onUpdate: (q: MultipleChoiceQuestion) => void;
}

function MultipleChoiceEditor({
  question,
  onUpdate,
}: MultipleChoiceEditorProps) {
  const addOption = () => {
    const newOption = {
      id: uuidv4(),
      blocks: [
        {
          type: "text" as const,
          id: uuidv4(),
          content: "",
          format: "plain" as const,
          listType: "none" as const,
        },
      ],
    };
    onUpdate({
      ...question,
      opciones: [...question.opciones, newOption],
    });
  };

  const removeOption = (optIdx: number) => {
    const newOpciones = question.opciones.filter((_, j) => j !== optIdx);
    const newCorrect = question.respuestascorrectas.filter((idx) => idx !== optIdx);
    onUpdate({
      ...question,
      opciones: newOpciones,
      respuestascorrectas: newCorrect,
    });
  };

  const updateOptionBlocks = (optIdx: number, blocks: any[]) => {
    const newOpciones = [...question.opciones];
    newOpciones[optIdx] = { ...newOpciones[optIdx], blocks };
    onUpdate({ ...question, opciones: newOpciones });
  };

  const toggleCorrect = (optIdx: number) => {
    const newCorrect = question.respuestascorrectas.includes(optIdx)
      ? question.respuestascorrectas.filter((i) => i !== optIdx)
      : [...question.respuestascorrectas, optIdx].sort((a, b) => a - b);
    onUpdate({ ...question, respuestascorrectas: newCorrect });
  };

  return (
    <Stack gap="md">
      <Text fw={500}>Opciones de respuesta</Text>

      <Stack gap="md">
        {question.opciones.map((opt, optIdx) => (
          <Card key={opt.id} p="md" withBorder radius="sm" bg="gray.0">
            <Group justify="space-between" align="flex-start" mb="sm">
              <Group>
                <input
                  type="checkbox"
                  checked={question.respuestascorrectas.includes(optIdx)}
                  onChange={() => toggleCorrect(optIdx)}
                />
                <Text fw={500} size="sm">
                  Opción {optIdx + 1}
                </Text>
              </Group>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => removeOption(optIdx)}
                disabled={question.opciones.length <= 2}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>

            <BlocksContainer
              blocks={opt.blocks}
              onBlocksChange={(blocks) => updateOptionBlocks(optIdx, blocks)}
            />
          </Card>
        ))}
      </Stack>

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={addOption}
        size="sm"
      >
        Agregar opción
      </Button>
    </Stack>
  );
}

interface MatchingEditorProps {
  question: MatchingQuestion;
  onUpdate: (q: MatchingQuestion) => void;
}

function MatchingEditor({ question, onUpdate }: MatchingEditorProps) {
  const addPair = () => {
    const newPair = {
      id: uuidv4(),
      leftBlocks: [
        {
          type: "text" as const,
          id: uuidv4(),
          content: "",
          format: "plain" as const,
          listType: "none" as const,
        },
      ],
      rightBlocks: [
        {
          type: "text" as const,
          id: uuidv4(),
          content: "Opción 1",
          format: "plain" as const,
          listType: "none" as const,
        },
        {
          type: "text" as const,
          id: uuidv4(),
          content: "Opción 2",
          format: "plain" as const,
          listType: "none" as const,
        },
      ],
    };
    const newCorrectPairings = [...(question.correctPairings || [])];
    newCorrectPairings.push(0);
    
    onUpdate({
      ...question,
      pairs: [...question.pairs, newPair],
      correctPairings: newCorrectPairings,
    });
  };

  const removePair = (pairIdx: number) => {
    const newCorrectPairings = (question.correctPairings || []).filter(
      (_: any, i: number) => i !== pairIdx
    );
    onUpdate({
      ...question,
      pairs: question.pairs.filter((_, j) => j !== pairIdx),
      correctPairings: newCorrectPairings,
    });
  };

  const updatePairBlocks = (
    pairIdx: number,
    side: "left" | "right",
    blocks: any[],
  ) => {
    const newPairs = [...question.pairs];
    if (side === "left") {
      newPairs[pairIdx] = { ...newPairs[pairIdx], leftBlocks: blocks };
    } else {
      newPairs[pairIdx] = { ...newPairs[pairIdx], rightBlocks: blocks };
    }
    onUpdate({ ...question, pairs: newPairs });
  };

  const addRightOption = (pairIdx: number) => {
    const newPairs = [...question.pairs];
    const newOption = {
      type: "text" as const,
      id: uuidv4(),
      content: "",
      format: "plain" as const,
      listType: "none" as const,
    };
    newPairs[pairIdx] = {
      ...newPairs[pairIdx],
      rightBlocks: [...newPairs[pairIdx].rightBlocks, newOption],
    };
    onUpdate({ ...question, pairs: newPairs });
  };

  const removeRightOption = (pairIdx: number, optionIdx: number) => {
    const newPairs = [...question.pairs];
    newPairs[pairIdx] = {
      ...newPairs[pairIdx],
      rightBlocks: newPairs[pairIdx].rightBlocks.filter(
        (_, i) => i !== optionIdx
      ),
    };

    const newCorrectPairings = [...(question.correctPairings || [])];
    if (newCorrectPairings[pairIdx] === optionIdx) {
      newCorrectPairings[pairIdx] = 0;
    } else if (newCorrectPairings[pairIdx] > optionIdx) {
      newCorrectPairings[pairIdx]--;
    }

    onUpdate({ ...question, pairs: newPairs, correctPairings: newCorrectPairings });
  };

  const setCorrectPairing = (pairIdx: number, rightIdx: number) => {
    const newCorrectPairings = [...(question.correctPairings || [])];
    newCorrectPairings[pairIdx] = rightIdx;
    onUpdate({ ...question, correctPairings: newCorrectPairings });
  };

  return (
    <Stack gap="md">
      <Text fw={500}>Pares para relacionar</Text>

      <Stack gap="md">
        {question.pairs.map((pair, pairIdx) => (
          <Card key={pair.id} p="md" withBorder radius="sm" bg="gray.0">
            <Group justify="space-between" align="flex-start" mb="sm">
              <Text fw={500} size="sm">
                Par {pairIdx + 1}
              </Text>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => removePair(pairIdx)}
                disabled={question.pairs.length <= 2}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>

            <Group align="flex-start" gap="md">
              {/* LADO IZQUIERDO */}
              <Stack style={{ flex: 1 }}>
                <Text size="sm" c="dimmed">
                  Lado izquierdo (lo que se debe parear)
                </Text>
                <BlocksContainer
                  blocks={pair.leftBlocks}
                  onBlocksChange={(blocks) =>
                    updatePairBlocks(pairIdx, "left", blocks)
                  }
                />
              </Stack>

              {/* LADO DERECHO */}
              <Stack style={{ flex: 1 }}>
                <Text size="sm" c="dimmed">
                  Opciones para parear
                </Text>

                {/* Opciones individuales */}
                <Stack gap="sm">
                  {pair.rightBlocks.map((option, optionIdx) => (
                    <Card key={optionIdx} p="sm" bg="white" withBorder>
                      <Group justify="space-between" align="flex-start">
                        <Stack style={{ flex: 1 }} gap={6}>
                          <BlocksContainer
                            blocks={[option]}
                            onBlocksChange={(blocks) => {
                              const newPairs = [...question.pairs];
                              newPairs[pairIdx].rightBlocks[optionIdx] =
                                blocks[0] || option;
                              onUpdate({
                                ...question,
                                pairs: newPairs,
                              });
                            }}
                          />

                          {/* Selector de respuesta correcta */}
                          <Select
                            label="Marcar como correcta"
                            placeholder="¿Es esta la respuesta correcta?"
                            data={[
                              { value: "yes", label: "✓ Sí, es correcta" },
                              { value: "no", label: "✗ No" },
                            ]}
                            value={
                              (question.correctPairings || [])[pairIdx] ===
                              optionIdx
                                ? "yes"
                                : "no"
                            }
                            onChange={(val) => {
                              if (val === "yes") {
                                setCorrectPairing(pairIdx, optionIdx);
                              }
                            }}
                            size="sm"
                          />
                        </Stack>

                        {pair.rightBlocks.length > 1 && (
                          <ActionIcon
                            color="red"
                            variant="subtle"
                            size="sm"
                            onClick={() =>
                              removeRightOption(pairIdx, optionIdx)
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>

                {/* Botón para agregar más opciones */}
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => addRightOption(pairIdx)}
                  size="xs"
                >
                  Agregar opción
                </Button>
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>

      <Button
        variant="light"
        leftSection={<IconPlus size={16} />}
        onClick={addPair}
        size="sm"
      >
        Agregar par
      </Button>
    </Stack>
  );
}

interface OrderingEditorProps {
  question: OrderingQuestion;
  onUpdate: (q: OrderingQuestion) => void;
}

function OrderingEditor({ question, onUpdate }: OrderingEditorProps) {
  const addItem = () => {
    const newItem = {
      id: uuidv4(),
      blocks: [
        {
          type: "text" as const,
          id: uuidv4(),
          content: "",
          format: "plain" as const,
          listType: "none" as const,
        },
      ],
    };
    onUpdate({
      ...question,
      items: [...question.items, newItem],
      correctOrder: [...question.correctOrder, newItem.id],
    });
  };

  const removeItem = (itemIdx: number) => {
    const removedItemId = question.items[itemIdx].id;
    const newItems = question.items.filter((_, j) => j !== itemIdx);
    const newOrder = question.correctOrder.filter((id) => id !== removedItemId);

    onUpdate({
      ...question,
      items: newItems,
      correctOrder: newOrder,
    });
  };

  const updateItemBlocks = (itemIdx: number, blocks: any[]) => {
    const newItems = [...question.items];
    newItems[itemIdx] = { ...newItems[itemIdx], blocks };
    onUpdate({ ...question, items: newItems });
  };

  const reorderCorrectOrder = (fromIdx: number, direction: "up" | "down") => {
    const toIdx = direction === "up" ? fromIdx - 1 : fromIdx + 1;
    if (toIdx < 0 || toIdx >= question.correctOrder.length) return;

    const newOrder = [...question.correctOrder];
    [newOrder[fromIdx], newOrder[toIdx]] = [newOrder[toIdx], newOrder[fromIdx]];

    onUpdate({ ...question, correctOrder: newOrder });
  };

  return (
    <Stack gap="md">
      <Divider />
      
      {/* ELEMENTOS EDITABLES */}
      <div>
        <Text fw={500} mb="md">
          1. Elementos para ordenar
        </Text>
        <Stack gap="md">
          {question.items.map((item, itemIdx) => (
            <Card key={item.id} p="md" withBorder radius="sm" bg="gray.0">
              <Group justify="space-between" align="flex-start" mb="sm">
                <Text fw={500} size="sm">
                  Elemento {itemIdx + 1}
                </Text>
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => removeItem(itemIdx)}
                  disabled={question.items.length <= 2}
                  title="Eliminar"
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Group>

              <BlocksContainer
                blocks={item.blocks}
                onBlocksChange={(blocks) => updateItemBlocks(itemIdx, blocks)}
              />
            </Card>
          ))}
        </Stack>

        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={addItem}
          size="sm"
          mt="md"
        >
          Agregar elemento
        </Button>
      </div>

      <Divider />

      {/* ORDEN CORRECTO */}
      <div>
        <Text fw={500} mb="md">
          2. Orden correcto (arrastra para reordenar)
        </Text>
        <Stack gap="md">
          {question.correctOrder.map((itemId, orderIdx) => {
            const item = question.items.find((i) => i.id === itemId);
            if (!item) return null;

            return (
              <Card
                key={itemId}
                p="md"
                withBorder
                radius="sm"
                bg="blue.0"
                style={{ borderLeft: "4px solid blue" }}
              >
                <Group justify="space-between" align="flex-start">
                  <Group>
                    <Badge size="lg" variant="light">
                      {orderIdx + 1}°
                    </Badge>
                    <Stack gap={0}>
                      <Text fw={500} size="sm">
                        {item.blocks
                          .filter((b: any) => b.type === "text")
                          .map((b: any) => b.content)
                          .join(" ") || "(elemento vacío)"}
                      </Text>
                    </Stack>
                  </Group>

                  <Group gap="xs">
                    <ActionIcon
                      variant="default"
                      onClick={() => reorderCorrectOrder(orderIdx, "up")}
                      disabled={orderIdx === 0}
                      title="Mover arriba"
                    >
                      <IconChevronUp size={18} />
                    </ActionIcon>
                    <ActionIcon
                      variant="default"
                      onClick={() => reorderCorrectOrder(orderIdx, "down")}
                      disabled={orderIdx === question.correctOrder.length - 1}
                      title="Mover abajo"
                    >
                      <IconChevronDown size={18} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            );
          })}
        </Stack>
      </div>
    </Stack>
  );
}

export default function SurveyComponent({ eventId }: Props) {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<QuestionWithBlocks[]>([
    createEmptyQuestion("single-choice"),
  ]);

  // Cargar quiz si existe
  useEffect(() => {
    const load = async () => {
      if (!eventId) return;

      setLoading(true);
      try {
        const quiz = await fetchQuizByEventId(eventId);
        if (quiz) {
          const q = Array.isArray(quiz.questions) ? quiz.questions : [];
          setQuestions((q.length ? q : [createEmptyQuestion("single-choice")]) as any);
        } else {
          setQuestions([createEmptyQuestion("single-choice")]);
        }
        notifications.show({ message: "Examen cargado", color: "green" });
      } catch (err: any) {
        if (err?.response?.status === 404) {
          setQuestions([createEmptyQuestion("single-choice")]);
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

  const addQuestion = (type: string = "single-choice") => 
    setQuestions((prev) => [...prev, createEmptyQuestion(type)]);
  
  const removeQuestion = (idx: number) =>
    setQuestions((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
    );

  const updateQuestion = (idx: number, updatedQuestion: QuestionWithBlocks) =>
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? updatedQuestion : q)),
    );

  const validate = useMemo(() => {
    const errors: string[] = [];
    questions.forEach((q, i) => {
      if (!q.blocks || q.blocks.length === 0)
        errors.push(`Pregunta ${i + 1}: debe tener contenido`);

      if (q.type === "single-choice") {
        const sq = q as SingleChoiceQuestion;
        if (!sq.opciones.length) 
          errors.push(`Pregunta ${i + 1}: sin opciones`);
        sq.opciones.forEach((op, j) => {
          if (!op.blocks || op.blocks.length === 0)
            errors.push(`Pregunta ${i + 1}, opción ${j + 1}: debe tener contenido`);
        });
        if (sq.respuestacorrecta < 0 || sq.respuestacorrecta >= sq.opciones.length) {
          errors.push(`Pregunta ${i + 1}: respuesta correcta inválida`);
        }
      }

      if (q.type === "multiple-choice") {
        const mq = q as MultipleChoiceQuestion;
        if (!mq.opciones.length) 
          errors.push(`Pregunta ${i + 1}: sin opciones`);
        mq.opciones.forEach((op, j) => {
          if (!op.blocks || op.blocks.length === 0)
            errors.push(`Pregunta ${i + 1}, opción ${j + 1}: debe tener contenido`);
        });
        if (mq.respuestascorrectas.length === 0) {
          errors.push(`Pregunta ${i + 1}: debe tener al menos una respuesta correcta`);
        }
      }

      if (q.type === "matching") {
        const mq = q as MatchingQuestion;
        if (!mq.pairs.length) 
          errors.push(`Pregunta ${i + 1}: sin pares`);
        mq.pairs.forEach((pair, j) => {
          if (!pair.leftBlocks || pair.leftBlocks.length === 0)
            errors.push(`Pregunta ${i + 1}, par ${j + 1} izquierda: debe tener contenido`);
          if (!pair.rightBlocks || pair.rightBlocks.length === 0)
            errors.push(`Pregunta ${i + 1}, par ${j + 1} derecha: debe tener contenido`);
        });
      }

      if (q.type === "ordering") {
        const oq = q as OrderingQuestion;
        if (!oq.items.length) 
          errors.push(`Pregunta ${i + 1}: sin elementos`);
        oq.items.forEach((item, j) => {
          if (!item.blocks || item.blocks.length === 0)
            errors.push(`Pregunta ${i + 1}, elemento ${j + 1}: debe tener contenido`);
        });
        if (oq.correctOrder.length === 0) {
          errors.push(`Pregunta ${i + 1}: debe definir el orden correcto`);
        }
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
      await createOrUpdateQuiz(eventId, {
        id: "",
        eventId,
        questions: questions,
      } as any);
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
        <Card key={q.id} withBorder radius="md" p="md">
          <Group justify="space-between" align="flex-start" mb="md">
            <Group>
              <Text fw={600} size="lg">
                Pregunta {qIdx + 1}
              </Text>
              <Select
                data={QUESTION_TYPES.map((t) => ({
                  value: t.id,
                  label: t.label,
                }))}
                value={q.type}
                onChange={(type) => {
                  if (type && type !== q.type) {
                    const newQ = createEmptyQuestion(type);
                    newQ.blocks = q.blocks; // Mantener bloques de pregunta
                    updateQuestion(qIdx, newQ);
                  }
                }}
                size="sm"
                w={200}
              />
            </Group>
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

          <Stack gap="md" mb="lg">
            <div>
              <Text fw={500} mb="sm">
                Contenido de la pregunta
              </Text>
              <BlocksContainer
                blocks={q.blocks}
                onBlocksChange={(blocks) =>
                  updateQuestion(qIdx, { ...q, blocks })
                }
              />
            </div>
          </Stack>

          <Divider my="md" />

          {/* SELECCIÓN ÚNICA */}
          {q.type === "single-choice" && (
            <SingleChoiceEditor
              question={q as SingleChoiceQuestion}
              onUpdate={(updated) => updateQuestion(qIdx, updated)}
            />
          )}

          {/* SELECCIÓN MÚLTIPLE */}
          {q.type === "multiple-choice" && (
            <MultipleChoiceEditor
              question={q as MultipleChoiceQuestion}
              onUpdate={(updated) => updateQuestion(qIdx, updated)}
            />
          )}

          {/* RELACIONAR AFIRMACIONES */}
          {q.type === "matching" && (
            <MatchingEditor
              question={q as MatchingQuestion}
              onUpdate={(updated) => updateQuestion(qIdx, updated)}
            />
          )}

          {/* ORDENAR RESPUESTAS */}
          {q.type === "ordering" && (
            <OrderingEditor
              question={q as OrderingQuestion}
              onUpdate={(updated) => updateQuestion(qIdx, updated)}
            />
          )}
        </Card>
      ))}

      <Group>
        <Button
          variant="light"
          leftSection={<IconPlus size={16} />}
          onClick={() => addQuestion("single-choice")}
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
