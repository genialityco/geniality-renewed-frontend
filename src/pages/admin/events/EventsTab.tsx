// src/pages/admin/EventsTab.tsx
import {
  Table,
  Paper,
  Image,
  Text,
  Button,
  Group,
  Stack,
  Badge,
} from "@mantine/core";
import { FaPencil, FaTrash } from "react-icons/fa6";
import { Event } from "../../../services/types";

interface Props {
  events: Event[];
  onCreate: () => void;
  onEdit: (eventId: string) => void;
  onDelete: (eventId: string) => void;
}

export default function EventsTab({
  events,
  onCreate,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Stack p="xs" gap="md">
      <Group justify="flex-start">
        <Button onClick={onCreate}>Crear Nuevo Evento</Button>
      </Group>

      <Paper withBorder radius="md" shadow="sm" p={0}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Imagen</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Fecha de Creación</Table.Th>
              <Table.Th>Visibilidad</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {events.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed">
                    No hay eventos creados aún.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              events.map((event) => (
                <Table.Tr key={event._id}>
                  {/* Imagen */}
                  <Table.Td>
                    {event.picture || event.styles?.event_image ? (
                      <Image
                        src={event.picture || event.styles.banner_image}
                        alt={event.name}
                        height={48}
                        width={80}
                        style={{ objectFit: "cover", borderRadius: 4 }}
                      />
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  {/* Nombre */}
                  <Table.Td>
                    <Text fw={500} lineClamp={1}>
                      {event.name}
                    </Text>
                  </Table.Td>
                  {/* Fecha de creación */}
                  <Table.Td>
                    <Badge variant="outline" color="blue">
                      {event.created_at || event.createdAt
                        ? new Date(
                            event.created_at || event.createdAt
                          ).toLocaleDateString("es-ES")
                        : "—"}
                    </Badge>
                  </Table.Td>
                  {/* Visibilidad */}
                  <Table.Td>
                    {event.visibility ? (
                      <Badge
                        variant="light"
                        color={event.visibility === "PUBLIC" ? "green" : "gray"}
                      >
                        {event.visibility.toLowerCase()}
                      </Badge>
                    ) : (
                      <Text c="dimmed" size="sm">
                        —
                      </Text>
                    )}
                  </Table.Td>
                  {/* Acciones */}
                  <Table.Td>
                    <Button
                      size="xs"
                      variant="subtle"
                      leftSection={<FaPencil size={12} />}
                      onClick={() => onEdit(event._id!)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="xs"
                      variant="subtle"
                      color="red"
                      leftSection={<FaTrash size={12} />}
                      onClick={() => onDelete(event._id!)}
                    >
                      Eliminar
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
