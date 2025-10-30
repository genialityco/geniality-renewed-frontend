import { Grid, Paper, Image, Title, Text } from "@mantine/core";
import { Event } from "../../../services/types";

export default function EventsGrid({
  events,
  onClick,
}: {
  events: Event[];
  onClick: (eventId: string) => void;
}) {
  if (!events.length) return <Text>No hay eventos disponibles.</Text>;
  return (
    <Grid gutter="xs">
      {events
        .filter((event) => event.visibility === "PUBLIC")
        .map((event) => (
          <Grid.Col key={event._id} span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Paper
              p="xs"
              onClick={() => onClick(event._id)}
              style={{ cursor: "pointer" }}
            >
              {(event.picture || event.styles?.event_image) && (
                <Image
                  src={event.picture || event.styles?.banner_image}
                  alt={event.name}
                  style={{ objectFit: "contain" }}
                />
              )}
              <Title order={4} mt="xs" style={{ textAlign: "left" }}>
                {event.name}
              </Title>
              <Text size="sm" c="gray" style={{ textAlign: "left" }}>
                {event.createdAt
                  ? new Date(event.createdAt).toLocaleDateString("es-ES")
                  : "Fecha no disponible"}
              </Text>
            </Paper>
          </Grid.Col>
        ))}
    </Grid>
  );
}
