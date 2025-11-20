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

  const sortedEvents = [...events]
    .filter((event) => event.visibility === "PUBLIC")
    .sort((a, b) => {
      const aTime = a.datetime_from
        ? new Date(a.datetime_from).getTime()
        : Number.POSITIVE_INFINITY;
      const bTime = b.datetime_from
        ? new Date(b.datetime_from).getTime()
        : Number.POSITIVE_INFINITY;
      return bTime - aTime;
    });

  return (
    <Grid gutter="xs">
      {sortedEvents.map((event) => (
        <Grid.Col key={event._id} span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <Paper
            p="xs"
            onClick={() => onClick(event._id)}
            style={{ cursor: "pointer" }}
          >
            {(event.picture || event.styles?.event_image) && (
              <Image
                src={event.picture || event.styles?.event_image}
                alt={event.name}
                style={{ objectFit: "contain" }}
              />
            )}
            <Title order={4} mt="xs" style={{ textAlign: "left" }}>
              {event.name}
            </Title>
            <Text size="sm" c="gray" style={{ textAlign: "left" }}>
              {event.datetime_from
                ? new Date(event.datetime_from).toLocaleDateString("es-ES")
                : "Fecha no disponible"}
            </Text>
          </Paper>
        </Grid.Col>
      ))}
    </Grid>
  );
}
