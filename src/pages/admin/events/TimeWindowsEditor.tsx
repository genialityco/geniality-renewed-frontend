import { ActionIcon, Button, Group, Stack, Text } from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { FaPlus, FaTrash } from "react-icons/fa6";
import type { TimeWindow } from "../../../services/types";

interface Props {
  label: string;
  description?: string;
  value: TimeWindow[];
  onChange: (value: TimeWindow[]) => void;
  addLabel: string;
  /** Franja que se agrega al pulsar el botón */
  newWindow: TimeWindow;
}

/** Lista editable de franjas horarias "HH:mm" – "HH:mm". */
export default function TimeWindowsEditor({
  label,
  description,
  value,
  onChange,
  addLabel,
  newWindow,
}: Props) {
  const update = (index: number, field: keyof TimeWindow, time: string) =>
    onChange(value.map((w, i) => (i === index ? { ...w, [field]: time } : w)));

  return (
    <Stack gap={6}>
      <div>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {description && (
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        )}
      </div>
      {value.map((w, i) => (
        <Group key={i} gap="xs" wrap="nowrap">
          <TimeInput
            aria-label="Desde"
            value={w.start}
            onChange={(e) => update(i, "start", e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Text size="sm" c="dimmed">
            a
          </Text>
          <TimeInput
            aria-label="Hasta"
            value={w.end}
            onChange={(e) => update(i, "end", e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label="Quitar franja"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <FaTrash size={14} />
          </ActionIcon>
        </Group>
      ))}
      <Button
        variant="light"
        size="xs"
        leftSection={<FaPlus size={12} />}
        onClick={() => onChange([...value, newWindow])}
        style={{ alignSelf: "flex-start" }}
      >
        {addLabel}
      </Button>
    </Stack>
  );
}
