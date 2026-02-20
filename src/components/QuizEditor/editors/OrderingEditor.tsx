/**
 * Editor de preguntas de ordenamiento
 */

import { Stack, Text, Card, Group, ActionIcon, Badge } from "@mantine/core";
import { IconTrash, IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import { OrderingQuestion } from "../types";
import BlocksContainer from "../BlocksContainer";
import { QUIZ_CONFIG } from "../../../constants/quizConstants";

interface OrderingEditorProps {
  question: OrderingQuestion;
  onUpdate: (q: OrderingQuestion) => void;
}

export default function OrderingEditor({ question, onUpdate }: OrderingEditorProps) {
  const updateItemBlocks = (itemIdx: number, blocks: any[]) => {
    const newItems = [...question.items];
    newItems[itemIdx] = { ...newItems[itemIdx], blocks };
    onUpdate({ ...question, items: newItems });
  };

  const addItem = () => {
    const newItem = {
      id: Math.random().toString(),
      blocks: [
        {
          type: "text" as const,
          id: Math.random().toString(),
          content: "",
          format: "plain" as const,
          listType: "none" as const,
        },
      ],
    };
    const newItems = [...question.items, newItem];
    const newCorrectOrder = [...question.correctOrder, newItem.id];

    onUpdate({ ...question, items: newItems, correctOrder: newCorrectOrder });
  };

  const removeItem = (itemIdx: number) => {
    const removedItemId = question.items[itemIdx].id;
    const newItems = question.items.filter((_: any, i: number) => i !== itemIdx);
    const newCorrectOrder = question.correctOrder.filter(
      (id: string) => id !== removedItemId
    );

    onUpdate({ ...question, items: newItems, correctOrder: newCorrectOrder });
  };

  const moveItemUp = (itemIdx: number) => {
    if (itemIdx === 0) return;

    const newCorrectOrder = [...question.correctOrder];
    [newCorrectOrder[itemIdx - 1], newCorrectOrder[itemIdx]] = [
      newCorrectOrder[itemIdx],
      newCorrectOrder[itemIdx - 1],
    ];

    onUpdate({ ...question, correctOrder: newCorrectOrder });
  };

  const moveItemDown = (itemIdx: number) => {
    if (itemIdx === question.items.length - 1) return;

    const newCorrectOrder = [...question.correctOrder];
    [newCorrectOrder[itemIdx], newCorrectOrder[itemIdx + 1]] = [
      newCorrectOrder[itemIdx + 1],
      newCorrectOrder[itemIdx],
    ];

    onUpdate({ ...question, correctOrder: newCorrectOrder });
  };

  return (
    <Stack gap="md">
      <Text fw={500}>Elementos para ordenar</Text>

      <Stack gap="md">
        {question.items.map((item: any, itemIdx: number) => {
          const itemPosition = question.correctOrder.indexOf(item.id);
          const isCurrentOrder = itemPosition === itemIdx;

          return (
            <Card key={item.id} p="md" withBorder radius="sm" bg="gray.0">
              <Group justify="space-between" align="flex-start" mb="sm">
                <Group>
                  <Badge size="sm" variant="filled">
                    Elemento {itemIdx + 1}
                  </Badge>
                  {!isCurrentOrder && (
                    <Badge size="sm" color="orange">
                      Posición correcta: {itemPosition + 1}
                    </Badge>
                  )}
                </Group>

                <Group gap="xs">
                  <ActionIcon
                    variant="subtle"
                    onClick={() => moveItemUp(itemIdx)}
                    disabled={itemIdx === 0}
                    title="Mover arriba"
                  >
                    <IconChevronUp size={18} />
                  </ActionIcon>

                  <ActionIcon
                    variant="subtle"
                    onClick={() => moveItemDown(itemIdx)}
                    disabled={itemIdx === question.items.length - 1}
                    title="Mover abajo"
                  >
                    <IconChevronDown size={18} />
                  </ActionIcon>

                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => removeItem(itemIdx)}
                    disabled={question.items.length <= QUIZ_CONFIG.MIN_ITEMS}
                    title="Eliminar elemento"
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Group>

              <BlocksContainer
                blocks={item.blocks}
                onBlocksChange={(blocks: any) => updateItemBlocks(itemIdx, blocks)}
              />
            </Card>
          );
        })}
      </Stack>

      <button onClick={addItem} style={{ marginTop: '8px' }}>
        Agregar elemento
      </button>

      <Text size="xs" c="dimmed">
        Define el orden correcto moviendo los elementos con los botones de arriba/abajo.
      </Text>
    </Stack>
  );
}
