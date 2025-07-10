// src/pages/admin/EventsTab.tsx
import {
  SimpleGrid,
  Paper,
  Image,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Box,
  Badge,
} from "@mantine/core";
import { Event } from "../../services/types";
import { FaPencil } from "react-icons/fa6";

interface Props {
  events: Event[];
  onCreate: () => void;
  onEdit: (eventId: string) => void;
}

export default function EventsTab({ events, onCreate, onEdit }: Props) {
  return (
    <Stack p="md">
      {/* Acción crear evento */}
      <Group justify="flex-start">
        <Button onClick={onCreate}>Crear Nuevo Evento</Button>
      </Group>

      {/* Grid de eventos */}
      <SimpleGrid
        cols={3}
        spacing="md"
      >
        {events.map((event) => (
          <Paper key={event._id} withBorder radius="md" shadow="sm" p="md">
            {/* Imagen de portada */}
            {(event.picture || event.styles?.event_image) && (
              <Image
                src={event.picture || event.styles.event_image!}
                alt={event.name}
                height={140}
                style={{ objectFit: "cover", borderRadius: 4 }}
              />
            )}

            {/* Contenido */}
            <Box mt="sm">
              <Title order={4} lineClamp={1}>
                {event.name}
              </Title>
              <Group p="xs" mt="xs">
                <Badge variant="outline" color="blue">
                  {event.created_at
                    ? new Date(event.created_at).toLocaleDateString("es-ES")
                    : "—"}
                </Badge>
                {event.visibility && (
                  <Badge
                    variant="light"
                    color={event.visibility === "PUBLIC" ? "green" : "gray"}
                  >
                    {event.visibility.toLowerCase()}
                  </Badge>
                )}
              </Group>
            </Box>

            {/* Botón editar */}
            <Group justify="flex-start" mt="md">
              <Button
                size="xs"
                variant="subtle"
                leftSection={<FaPencil size={12} />}
                onClick={() => onEdit(event._id!)}
              >
                Editar
              </Button>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Mensaje si no hay eventos */}
      {events.length === 0 && (
        <Text ta="center" c="dimmed">
          No hay eventos creados aún.
        </Text>
      )}
    </Stack>
  );
}
