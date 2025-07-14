import { TextInput, Button, Flex } from "@mantine/core";

export default function SearchBar({
  value,
  onChange,
  onSearch,
  onClear
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  return (
    <Flex justify="center" align="center" gap="md" style={{ margin: "20px 0" }}>
      <TextInput
        placeholder="Buscar en actividades y eventos.."
        value={value}
        onChange={onChange}
        onKeyDown={e => { if (e.key === "Enter") onSearch(); }}
        style={{ width: 250 }}
        rightSection={value ? (
          <Button
            size="xs"
            variant="subtle"
            color="gray"
            px={6}
            onClick={onClear}
            tabIndex={-1}
          >
            ×
          </Button>
        ) : null}
      />
      <Button onClick={onSearch}>Buscar</Button>
    </Flex>
  );
}
