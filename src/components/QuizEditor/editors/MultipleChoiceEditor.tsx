/**
 * Editor de preguntas de opción múltiple
 */

import { Stack, Text, Card, Group, ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { MultipleChoiceQuestion } from "../types";
import BlocksContainer from "../BlocksContainer";
import { QUIZ_CONFIG } from "../../../constants/quizConstants";

interface MultipleChoiceEditorProps {
  question: MultipleChoiceQuestion;
  onUpdate: (q: MultipleChoiceQuestion) => void;
  onAddOption?: () => void;
  onRemoveOption?: (idx: number) => void;
}

export default function MultipleChoiceEditor({
  question,
  onUpdate,
  onAddOption,
  onRemoveOption,
}: MultipleChoiceEditorProps) {
  const updateOptionBlocks = (optIdx: number, blocks: any[]) => {
    const newOpciones = [...question.opciones];
    newOpciones[optIdx] = { ...newOpciones[optIdx], blocks };
    onUpdate({ ...question, opciones: newOpciones });
  };

  const toggleCorrect = (optIdx: number) => {
    const newCorrect = question.respuestascorrectas.includes(optIdx)
      ? question.respuestascorrectas.filter((i: number) => i !== optIdx)
      : [...question.respuestascorrectas, optIdx].sort((a: number, b: number) => a - b);
    onUpdate({ ...question, respuestascorrectas: newCorrect });
  };

  const handleRemoveOption = (optIdx: number) => {
    if (onRemoveOption) {
      onRemoveOption(optIdx);
    } else {
      const newOpciones = question.opciones.filter((_: any, j: number) => j !== optIdx);
      const newCorrect = question.respuestascorrectas.filter((idx: number) => idx !== optIdx);
      onUpdate({
        ...question,
        opciones: newOpciones,
        respuestascorrectas: newCorrect,
      });
    }
  };

  return (
    <Stack gap="md">
      <Text fw={500}>Opciones de respuesta (puede haber múltiples correctas)</Text>

      <Stack gap="md">
        {question.opciones.map((opt: any, optIdx: number) => (
          <Card key={opt.id} p="md" withBorder radius="sm" bg="gray.0">
            <Group justify="space-between" align="flex-start" mb="sm">
              <Group>
                <input
                  type="checkbox"
                  checked={question.respuestascorrectas.includes(optIdx)}
                  onChange={() => toggleCorrect(optIdx)}
                  title="Marcar como respuesta correcta"
                />
                <Text fw={500} size="sm">
                  Opción {optIdx + 1}
                </Text>
              </Group>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => handleRemoveOption(optIdx)}
                disabled={question.opciones.length <= QUIZ_CONFIG.MIN_OPTIONS}
                title="Eliminar opción"
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Group>

            <BlocksContainer
              blocks={opt.blocks}
              onBlocksChange={(blocks: any) => updateOptionBlocks(optIdx, blocks)}
            />
          </Card>
        ))}
      </Stack>

      {onAddOption && (
        <button onClick={onAddOption} style={{ marginTop: '8px' }}>
          Agregar opción
        </button>
      )}
    </Stack>
  );
}
