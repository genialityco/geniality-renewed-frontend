import { useState } from "react";
import { Button } from "@mantine/core";

interface Props {
  value: string;
  onSearch: (text: string) => void;
}

export default function SearchForm({ value, onSearch }: Props) {
  const [text, setText] = useState(value);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(text);
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input
        type="text"
        placeholder="Buscar nombre o email"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ padding: 4, borderRadius: 4, border: "1px solid #ddd" }}
      />
      <Button type="submit">Buscar</Button>
      {text && (
        <Button variant="subtle" onClick={() => { setText(""); onSearch(""); }}>
          Limpiar
        </Button>
      )}
    </form>
  );
}
