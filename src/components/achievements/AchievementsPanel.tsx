import { Badge, Card, Group, Progress, SimpleGrid, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconLock, IconTrophy } from "@tabler/icons-react";
import { useAchievements } from "../../context/AchievementsContext";
import {
  achievementProgressText,
  MyAchievementItem,
  MyAchievements,
} from "../../services/genonAchievementsService";

const GOLD = "#9C7400";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

/** Pestaña «Mis logros» del perfil: logros conseguidos y avance hacia los que faltan. */
export default function AchievementsPanel() {
  const { programs } = useAchievements();

  if (!programs.length) {
    return (
      <Text c="dimmed" py="md">
        Aún no hay logros disponibles en tus cursos.
      </Text>
    );
  }

  return (
    <Stack py="md">
      {programs.map((p) => (
        <ProgramAchievements key={p.program_id} program={p} />
      ))}
    </Stack>
  );
}

function ProgramAchievements({ program: p }: { program: MyAchievements }) {
  // Conseguidos primero (el más reciente arriba); luego los más cercanos
  const items = [...p.items].sort((a, b) => {
    if (a.achieved !== b.achieved) return a.achieved ? -1 : 1;
    if (a.achieved) return (b.achieved_at || "").localeCompare(a.achieved_at || "");
    return b.progress / b.threshold - a.progress / a.threshold;
  });

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={2}>
            <Title order={4}>Mis logros</Title>
            <Text size="sm" c="dimmed">
              {p.event_name}
            </Text>
          </Stack>
          <Badge color="yellow" variant="light" size="lg">
            {p.achieved} de {p.total}
          </Badge>
        </Group>
        <Progress value={p.total ? (p.achieved / p.total) * 100 : 0} color="yellow" size="sm" radius="xl" />
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          {items.map((i) => (
            <AchievementCard key={i.id} item={i} />
          ))}
        </SimpleGrid>
        <Text size="xs" c="dimmed">
          Los logros cuentan lo que haces en cualquiera de los cursos del programa: actividades y
          videos terminados, módulos, cursos, tu racha y los retos superados por WhatsApp.
        </Text>
      </Stack>
    </Card>
  );
}

function AchievementCard({ item: i }: { item: MyAchievementItem }) {
  return (
    <Card
      withBorder
      radius="md"
      padding="sm"
      style={
        i.achieved
          ? { borderColor: "#E2B01988", background: "#E2B01912" }
          : { background: "var(--mantine-color-gray-0)" }
      }
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon
          size={40}
          radius="xl"
          variant={i.achieved ? "filled" : "light"}
          color={i.achieved ? "yellow" : "gray"}
          style={{ flexShrink: 0 }}
        >
          {i.achieved ? <IconTrophy size={22} /> : <IconLock size={20} />}
        </ThemeIcon>
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="sm" c={i.achieved ? GOLD : undefined}>
            {i.title}
          </Text>
          {i.achieved ? (
            <>
              {i.text && <Text size="sm">{i.text}</Text>}
              {i.achieved_at && (
                <Text size="xs" c="dimmed">
                  Conseguido el {formatDate(i.achieved_at)}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text size="xs" c="dimmed">
                {achievementProgressText(i)}
              </Text>
              <Progress value={(i.progress / i.threshold) * 100} color="yellow" size="xs" radius="xl" />
            </>
          )}
        </Stack>
      </Group>
    </Card>
  );
}
