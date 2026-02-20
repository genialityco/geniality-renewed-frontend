/**
 * Renderizador de emparejamientos
 */

import { Stack, Box, Grid, Select, Text } from "@mantine/core";
import { MatchingPair } from "../QuizEditor/types";
import BlocksRenderer from "../BlocksRenderer";

interface MatchingRendererProps {
  questionId: string;
  pairs: MatchingPair[];
  answers: Record<string, number>; // pairId -> rightIndex
  onChange: (pairId: string, selectedRightIndex: number) => void;
}

export default function MatchingRenderer({
  pairs,
  answers,
  onChange,
}: MatchingRendererProps) {
  return (
    <div>
      <Text size="sm" c="dimmed" mb="md">
        Relaciona los elementos del lado izquierdo con las opciones del lado derecho
      </Text>

      <Grid>
        {/* Lado izquierdo */}
        <Grid.Col span={6}>
          <Stack gap="sm">
            {pairs.map((pair) => (
              <Box
                key={pair.id}
                p="sm"
                style={{
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  backgroundColor: "#fff",
                }}
              >
                <BlocksRenderer blocks={pair.leftBlocks} inline />
              </Box>
            ))}
          </Stack>
        </Grid.Col>

        {/* Lado derecho */}
        <Grid.Col span={6}>
          <Stack gap="sm">
            {pairs.map((pair, _pairIdx) => {
              // Obtener etiqueta de cada opción del lado derecho
              const rightOptions = pair.rightBlocks.map((blockItem: any, idx: number) => {
                const blocks = Array.isArray(blockItem) ? blockItem : blockItem.blocks || [blockItem];
                const textBlock = blocks.find((b: any) => b.type === "text");
                const label = textBlock?.content || `Opción ${idx + 1}`;
                return {
                  value: idx.toString(),
                  label,
                };
              });

              return (
                <Select
                  key={`select-${pair.id}`}
                  placeholder="Selecciona una opción"
                  value={answers[pair.id] !== undefined ? answers[pair.id].toString() : ""}
                  onChange={(value) => {
                    console.log(`✅ Matching - Par ${pair.id}: valor seleccionado = ${value}, answers[pair.id] pregunta = ${answers[pair.id]}`);
                    if (value !== null) {
                      onChange(pair.id, parseInt(value));
                    }
                  }}
                  data={rightOptions}
                  searchable={false}
                />
              );
            })}
          </Stack>
        </Grid.Col>
      </Grid>
    </div>
  );
}
