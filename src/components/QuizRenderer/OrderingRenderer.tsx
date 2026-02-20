/**
 * Renderizador de ordenamiento
 */

import { Stack, Box, Text } from "@mantine/core";
import { OrderingItem } from "../QuizEditor/types";
import BlocksRenderer from "../BlocksRenderer";

interface OrderingRendererProps {
  items: OrderingItem[];
  orderedItemIds: string[];
  draggedItemId: string | null;
  onDragStart: (itemId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetItemId: string) => void;
}

export default function OrderingRenderer({
  items,
  orderedItemIds,
  draggedItemId,
  onDragStart,
  onDragOver,
  onDrop,
}: OrderingRendererProps) {
  const handleDragStart = (itemId: string) => {
    console.log(`🎯 Ordenamiento - Drag start: ${itemId}`);
    onDragStart(itemId);
  };

  const handleDrop = (targetItemId: string) => {
    console.log(`✅ Ordenamiento - Drag drop to: ${targetItemId}`);
    onDrop(targetItemId);
  };

  return (
    <Stack gap="sm">
      <Text size="sm" c="dimmed">
        Arrastra los elementos para ordenarlos (1 = primero, 2 = segundo, etc.)
      </Text>

      {orderedItemIds.map((itemId, displayIdx) => {
        const item = items.find((i) => i.id === itemId);
        if (!item) return null;

        const isDragged = draggedItemId === itemId;

        return (
          <Box
            key={itemId}
            draggable
            onDragStart={() => handleDragStart(itemId)}
            onDragOver={onDragOver}
            onDrop={() => handleDrop(itemId)}
            style={{
              padding: "16px",
              paddingLeft: "12px",
              borderRadius: "8px",
              backgroundColor: isDragged ? "#e3f2fd" : "#fff",
              border: isDragged ? "2px solid #2196f3" : "1px solid #e0e0e0",
              cursor: isDragged ? "grabbing" : "grab",
              opacity: isDragged ? 0.7 : 1,
              transition: "all 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                minWidth: "24px",
                fontWeight: 600,
                color: "#666",
                fontSize: "14px",
              }}
            >
              {displayIdx + 1}.
            </div>
            <div style={{ flex: 1 }}>
              <BlocksRenderer blocks={item.blocks} inline />
            </div>
          </Box>
        );
      })}
    </Stack>
  );
}
