import { Grid, Paper, Image, Title, Text, Group } from "@mantine/core";
import { FaStar } from "react-icons/fa";
import { Event } from "../../../services/types";

export default function EventsGrid({
  events,
  onClick,
  memberShipStatus = false,
}: {
  events: Event[];
  onClick: (eventId: string) => void;
  memberShipStatus?: boolean;
}) {
  if (!events.length) return <Text>No hay eventos disponibles.</Text>;

  const sortedEvents = [...events]
    .filter((event) => {
      // Si el evento es público, siempre se muestra
      if (event.visibility === "PUBLIC") return true;
      // Si el evento es exclusivo para miembros y el usuario tiene membresía activa
      if (event.visibility === "EXCLUSIVE_FOR_MEMBERS" && memberShipStatus) return true;
      // Los eventos privados nunca se muestran en esta vista
      return false;
    })
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
            style={{ 
              cursor: "pointer",
              border: event.visibility === "EXCLUSIVE_FOR_MEMBERS" ? "2px solid #ff8c00" : undefined,
            }}
          >
            {(event.picture || event.styles?.event_image) && (
              <Image
                src={event.picture || event.styles?.banner_image || ""}
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
            {event.visibility === "EXCLUSIVE_FOR_MEMBERS" && (
              <Group gap={4} mt="xs">
                <FaStar size={14} color="#ff8c00" />
                <Text size="xs" c="orange" fw={500}>
                  Evento exclusivo
                </Text>
              </Group>
            )}
          </Paper>
        </Grid.Col>
      ))}
    </Grid>
  );
}
