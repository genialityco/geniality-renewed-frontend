import { TextInput, Button, Box, ActionIcon, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconSearch, IconX } from "@tabler/icons-react";

export default function SearchBar({
  value,
  onChange,
  onSearch,
  onClear,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  onClear: () => void;
}) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);

  return (
    <Box
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
        padding: "16px 12px",
        backgroundColor: "#f8f9fa",
        borderBottom: "1px solid #e9ecef",
      }}
    >
      <TextInput
        placeholder={isMobile ? "Buscar..." : "Buscar cursos, actividades, contenido..."}
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch();
        }}
        size="md"
        radius="xl"
        style={{ flex: 1, maxWidth: 520 }}
        leftSection={<IconSearch size={17} />}
        rightSection={
          value ? (
            <ActionIcon variant="subtle" color="gray" radius="xl" onClick={onClear}>
              <IconX size={15} />
            </ActionIcon>
          ) : null
        }
      />

      {isMobile ? (
        <ActionIcon
          onClick={onSearch}
          radius="xl"
          size="lg"
          variant="filled"
          color="blue"
          aria-label="Buscar"
        >
          <IconSearch size={18} />
        </ActionIcon>
      ) : (
        <Button onClick={onSearch} radius="xl" size="md" px="xl">
          Buscar
        </Button>
      )}
    </Box>
  );
}
