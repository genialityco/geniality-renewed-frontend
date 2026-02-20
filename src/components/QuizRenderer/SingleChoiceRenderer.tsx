/**
 * Renderizador de opciones únicas
 */

import { Stack } from "@mantine/core";
import { Option } from "../QuizEditor/types";
import BlocksRenderer from "../BlocksRenderer";
import { UI_CONFIG } from "../../constants/quizConstants";

interface SingleChoiceRendererProps {
  questionId: string;
  options: Option[];
  selectedValue: number | undefined;
  onChange: (optionIndex: number) => void;
}

export default function SingleChoiceRenderer({
  questionId,
  options,
  selectedValue,
  onChange,
}: SingleChoiceRendererProps) {
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
          <input
            type="radio"
            name={questionId}
            value={optIdx}
            checked={selectedValue === optIdx}
            onChange={() => onChange(optIdx)}
            style={{ marginTop: "4px" }}
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
