/**
 * Renderizador principal de quizzes
 * Maneja la presentación de preguntas y respuesta del usuario
 */

import { useState } from "react";
import { Stack, Button, Card, Text } from "@mantine/core";
import { QuestionWithBlocks } from "./QuizEditor/types";
import BlocksRenderer from "./BlocksRenderer";
import SingleChoiceRenderer from "./QuizRenderer/SingleChoiceRenderer";
import MultipleChoiceRenderer from "./QuizRenderer/MultipleChoiceRenderer";
import MatchingRenderer from "./QuizRenderer/MatchingRenderer";
import OrderingRenderer from "./QuizRenderer/OrderingRenderer";

interface QuizRendererProps {
  questions: QuestionWithBlocks[];
  onSubmit: (answers: Record<string, any>) => void;
  isLoading?: boolean;
}

export default function QuizRenderer({
  questions,
  onSubmit,
  isLoading = false,
}: QuizRendererProps) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [orderedItems, setOrderedItems] = useState<Record<string, string[]>>({});
  const [draggedItem, setDraggedItem] = useState<{
    questionId: string;
    itemId: string;
  } | null>(null);

  // Manejo de cambios para opción única
  const handleSingleChoiceChange = (questionId: string, optionIdx: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  // Manejo de cambios para opción múltiple
  const handleMultipleChoiceChange = (
    questionId: string,
    optionIdx: number,
    checked: boolean
  ) => {
    setAnswers((prev) => {
      const current = prev[questionId] || [];
      return {
        ...prev,
        [questionId]: checked
          ? [...current, optionIdx]
          : current.filter((idx: number) => idx !== optionIdx),
      };
    });
  };

  // Manejo de cambios para emparejamiento
  const handleMatchingChange = (
    questionId: string,
    pairId: string,
    rightOptionIdx: number
  ) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [pairId]: rightOptionIdx,
      },
    }));
  };

  // Manejo de dragging para ordenamiento
  const handleOrderingDragStart = (questionId: string, itemId: string) => {
    setDraggedItem({ questionId, itemId });
  };

  const handleOrderingDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleOrderingDrop = (
    questionId: string,
    targetItemId: string,
    items: any[]
  ) => {
    if (!draggedItem || draggedItem.questionId !== questionId) return;

    const current = orderedItems[questionId] || items.map((item) => item.id);
    const draggedIdx = current.indexOf(draggedItem.itemId);
    const targetIdx = current.indexOf(targetItemId);

    console.log(`📌 Ordenamiento drop:`, {
      questionId,
      draggedItemId: draggedItem.itemId,
      targetItemId,
      draggedIdx,
      targetIdx,
      currentOrder: current,
    });

    if (draggedIdx !== -1 && targetIdx !== -1) {
      const newOrder = [...current];
      [newOrder[draggedIdx], newOrder[targetIdx]] = [
        newOrder[targetIdx],
        newOrder[draggedIdx],
      ];

      console.log(`📌 Nuevo orden:`, newOrder);

      setOrderedItems((prev) => ({
        ...prev,
        [questionId]: newOrder,
      }));
    }

    setDraggedItem(null);
  };

  // Manejo de envío del quiz
  const handleSubmit = () => {
    const finalAnswers = { ...answers };

    // Agregar respuestas de ordenamiento
    for (const [questionId, order] of Object.entries(orderedItems)) {
      finalAnswers[questionId] = order;
    }

    onSubmit(finalAnswers);
  };

  if (!questions || questions.length === 0) {
    return (
      <Text c="dimmed">No hay preguntas para mostrar en este quiz.</Text>
    );
  }

  return (
    <Stack gap="lg">
      {questions.map((question, questionIdx) => (
        <Card key={question.id} withBorder p="md" radius="md" bg="gray.0">
          {/* Encabezado de la pregunta */}
          <Text fw={700} mb="md" size="lg">
            Pregunta {questionIdx + 1}
          </Text>

          {/* Contenido de la pregunta */}
          <BlocksRenderer blocks={question.blocks} />

          {/* Renderizador específico por tipo */}
          <Stack gap="md" mt="md">
            {question.type === "single-choice" && (
              <SingleChoiceRenderer
                questionId={question.id}
                options={(question as any).opciones}
                selectedValue={answers[question.id]}
                onChange={(optIdx) =>
                  handleSingleChoiceChange(question.id, optIdx)
                }
              />
            )}

            {question.type === "multiple-choice" && (
              <MultipleChoiceRenderer
                options={(question as any).opciones}
                selectedValues={answers[question.id] || []}
                onChange={(optIdx, checked) =>
                  handleMultipleChoiceChange(question.id, optIdx, checked)
                }
              />
            )}

            {question.type === "matching" && (
              <MatchingRenderer
                questionId={question.id}
                pairs={(question as any).pairs}
                answers={answers[question.id] || {}}
                onChange={(pairIdx, rightIdx) =>
                  handleMatchingChange(question.id, pairIdx, rightIdx)
                }
              />
            )}

            {question.type === "ordering" && (
              <OrderingRenderer
                items={(question as any).items}
                orderedItemIds={
                  orderedItems[question.id] ||
                  (question as any).items.map((i: any) => i.id)
                }
                draggedItemId={
                  draggedItem?.questionId === question.id
                    ? draggedItem.itemId
                    : null
                }
                onDragStart={(itemId) =>
                  handleOrderingDragStart(question.id, itemId)
                }
                onDragOver={handleOrderingDragOver}
                onDrop={(targetItemId) =>
                  handleOrderingDrop(question.id, targetItemId, (question as any).items)
                }
              />
            )}
          </Stack>
        </Card>
      ))}

      {/* Botón de envío */}
      <Button
        onClick={handleSubmit}
        size="lg"
        disabled={isLoading}
        fullWidth
        mt="lg"
      >
        {isLoading ? "Enviando..." : "Enviar Respuestas"}
      </Button>
    </Stack>
  );
}
