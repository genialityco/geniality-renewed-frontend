import { Grid, Text, Card, Image, Badge, Group, Box, Overlay, AspectRatio } from "@mantine/core";
import { IconCalendar, IconStar } from "@tabler/icons-react";
import { Event } from "../../../services/types";

const EVENT_PLACEHOLDER = "https://placehold.co/640x360/e9ecef/adb5bd?text=Curso";

function EventCard({
  event,
  onClick,
}: {
  event: Event;
  onClick: () => void;
}) {
  const imageSrc =
    event.picture ||
    event.styles?.event_image ||
    event.styles?.banner_image ||
    EVENT_PLACEHOLDER;

  const dateStr = event.datetime_from
    ? new Date(event.datetime_from).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const isExclusive = event.visibility === "EXCLUSIVE_FOR_MEMBERS";

  return (
    <Card
      radius="md"
      withBorder
      shadow="sm"
      style={{
        cursor: "pointer",
        overflow: "hidden",
        transition: "transform 0.18s ease, box-shadow 0.18s ease",
        borderColor: isExclusive ? "#fd7e14" : undefined,
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 8px 24px rgba(0,0,0,0.13)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
      }}
    >
      <Card.Section style={{ position: "relative" }}>
        <AspectRatio ratio={16 / 9}>
          <Image src={imageSrc} alt={event.name} fit="cover" />
        </AspectRatio>
        {isExclusive && (
          <Box style={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
            <Badge
              color="orange"
              variant="filled"
              leftSection={<IconStar size={11} />}
              size="sm"
            >
              Exclusivo
            </Badge>
          </Box>
        )}
      </Card.Section>

      <Box p="sm">
        <Text fw={600} size="sm" lineClamp={2} style={{ lineHeight: 1.4 }}>
          {event.name}
        </Text>
        {dateStr && (
          <Group gap={5} mt={6}>
            <IconCalendar size={13} color="#868e96" />
            <Text size="xs" c="dimmed">
              {dateStr}
            </Text>
          </Group>
        )}
      </Box>
    </Card>
  );
}

export default function EventsGrid({
  events,
  onClick,
  memberShipStatus = false,
}: {
  events: Event[];
  onClick: (eventId: string) => void;
  memberShipStatus?: boolean;
}) {
  const visibleEvents = [...events]
    .filter((event) => {
      if (event.visibility === "PUBLIC") return true;
      if (event.visibility === "EXCLUSIVE_FOR_MEMBERS" && memberShipStatus)
        return true;
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

  if (!visibleEvents.length) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        No hay eventos disponibles.
      </Text>
    );
  }

  return (
    <Grid gutter="md">
      {visibleEvents.map((event) => (
        <Grid.Col key={event._id} span={{ base: 12, xs: 6, sm: 6, md: 4, lg: 3 }}>
          <EventCard event={event} onClick={() => onClick(event._id)} />
        </Grid.Col>
      ))}
    </Grid>
  );
}
