/**
 * Editor de preguntas de emparejamiento
 */

import { Stack, Text, Card, Group, ActionIcon, Select } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { MatchingQuestion } from "../types";
import BlocksContainer from "../BlocksContainer";
import { QUIZ_CONFIG } from "../../../constants/quizConstants";

interface MatchingEditorProps {
  question: MatchingQuestion;
  onUpdate: (q: MatchingQuestion) => void;
}

export default function MatchingEditor({ question, onUpdate }: MatchingEditorProps) {
  const updatePairBlocks = (
    pairIdx: number,
    side: "left" | "right",
    blocks: any[]
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
      id: Math.random().toString(),
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
      rightBlocks: newPairs[pairIdx].rightBlocks.filter((_: any, i: number) => i !== optionIdx),
    };

    const newCorrectPairings = [...(question.correctPairings || [])];
    if (newCorrectPairings[pairIdx] === optionIdx) {
      newCorrectPairings[pairIdx] = 0;
    } else if (newCorrectPairings[pairIdx] > optionIdx) {
      newCorrectPairings[pairIdx]--;
    }

    onUpdate({ ...question, pairs: newPairs, correctPairings: newCorrectPairings });
  };

  const removePair = (pairIdx: number) => {
    const newCorrectPairings = (question.correctPairings || []).filter(
      (_: any, i: number) => i !== pairIdx
    );
    onUpdate({
      ...question,
      pairs: question.pairs.filter((_: any, j: number) => j !== pairIdx),
      correctPairings: newCorrectPairings,
    });
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
        {question.pairs.map((pair: any, pairIdx: number) => (
          <Card key={pair.id} p="md" withBorder radius="sm" bg="gray.0">
            <Group justify="space-between" align="flex-start" mb="sm">
              <Text fw={500} size="sm">
                Par {pairIdx + 1}
              </Text>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => removePair(pairIdx)}
                disabled={question.pairs.length <= QUIZ_CONFIG.MIN_PAIRS}
                title="Eliminar par"
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
                  onBlocksChange={(blocks: any) =>
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
                  {pair.rightBlocks.map((option: any, optionIdx: number) => (
                    <Card key={optionIdx} p="sm" bg="white" withBorder>
                      <Group justify="space-between" align="flex-start">
                        <Stack style={{ flex: 1 }} gap={6}>
                          <BlocksContainer
                            blocks={[option]}
                            onBlocksChange={(blocks: any) => {
                              const newPairs = [...question.pairs];
                              newPairs[pairIdx].rightBlocks[optionIdx] = blocks[0] || option;
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
                              (question.correctPairings || [])[pairIdx] === optionIdx
                                ? "yes"
                                : "no"
                            }
                            onChange={(val: string | null) => {
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
                            onClick={() => removeRightOption(pairIdx, optionIdx)}
                            title="Eliminar opción"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>

                <button onClick={() => addRightOption(pairIdx)} style={{ marginTop: '8px' }}>
                  Agregar opción
                </button>
              </Stack>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  );
}
