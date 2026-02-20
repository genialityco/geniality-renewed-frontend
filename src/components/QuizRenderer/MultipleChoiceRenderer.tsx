/**
 * Renderizador de opciones múltiples
 */

import { Stack, Checkbox } from "@mantine/core";
import { Option } from "../QuizEditor/types";
import BlocksRenderer from "../BlocksRenderer";
import { UI_CONFIG } from "../../constants/quizConstants";

interface MultipleChoiceRendererProps {
  options: Option[];
  selectedValues: number[];
  onChange: (optionIndex: number, checked: boolean) => void;
}

export default function MultipleChoiceRenderer({
  options,
  selectedValues,
  onChange,
}: MultipleChoiceRendererProps) {
  return (
    <Stack gap="sm">
      {options.map((option, optIdx) => (
        <label
          key={option.id}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: "#fff",
            border: "1px solid #e0e0e0",
            cursor: "pointer",
            transition: UI_CONFIG.TRANSITION_DURATION,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#fff";
          }}
        >
          <Checkbox
            checked={selectedValues.includes(optIdx)}
            onChange={(e) => onChange(optIdx, e.currentTarget.checked)}
            style={{ marginTop: "2px" }}
            aria-label={`Opción ${optIdx + 1}`}
          />
          <div style={{ flex: 1 }}>
            <BlocksRenderer blocks={option.blocks} inline />
          </div>
        </label>
      ))}
    </Stack>
  );
}
