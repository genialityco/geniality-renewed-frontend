import { useEffect, useState } from "react";
import { Button } from "@mantine/core";

interface Props {
  value: string;
  onSearch: (text: string) => void;
}

export default function SearchForm({ value, onSearch }: Props) {
  const [text, setText] = useState(value);

  useEffect(() => setText(value), [value]);

  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        type="text"
        placeholder="Buscar nombre o email"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          onSearch(v);
        }}
        style={{ padding: 4, borderRadius: 4, border: "1px solid #ddd" }}
      />
      {text && (
        <Button
          variant="subtle"
          onClick={() => {
            setText("");
            onSearch("");
          }}
        >
          Limpiar
        </Button>
      )}
    </div>
  );
}
