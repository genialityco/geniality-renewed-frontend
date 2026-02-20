/**
 * Editor de preguntas de opción única
 */

import { Stack, Text, Card, Group, ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { SingleChoiceQuestion } from "../types";
import BlocksContainer from "../BlocksContainer";
import { QUIZ_CONFIG } from "../../../constants/quizConstants";

interface SingleChoiceEditorProps {
  question: SingleChoiceQuestion;
  onUpdate: (q: SingleChoiceQuestion) => void;
  onAddOption?: () => void;
  onRemoveOption?: (idx: number) => void;
}

export default function SingleChoiceEditor({
  question,
  onUpdate,
  onAddOption,
  onRemoveOption,
}: SingleChoiceEditorProps) {
  const updateOptionBlocks = (optIdx: number, blocks: any[]) => {
    const newOpciones = [...question.opciones];
    newOpciones[optIdx] = { ...newOpciones[optIdx], blocks };
    onUpdate({ ...question, opciones: newOpciones });
  };

  const handleRemoveOption = (optIdx: number) => {
    if (onRemoveOption) {
      onRemoveOption(optIdx);
    } else {
      const newOpciones = question.opciones.filter((_: any, j: number) => j !== optIdx);
      let newCorrect = question.respuestacorrecta;
      if (newCorrect >= newOpciones.length) {
        newCorrect = Math.max(0, newOpciones.length - 1);
      }
      onUpdate({
        ...question,
        opciones: newOpciones,
        respuestacorrecta: newCorrect,
      });
    }
  };

  return (
    <Stack gap="md">
      <Text fw={500}>Opciones de respuesta</Text>

      <Stack gap="md">
        {question.opciones.map((opt: any, optIdx: number) => (
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
