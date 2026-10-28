import { Badge, Card, Group, Progress, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconShieldCheck } from "@tabler/icons-react";
import type { MyStreak, StreakMedalTier } from "../../services/genonStreakService";
import { useStreak } from "../../context/StreakContext";
import StreakMedal from "./StreakMedal";
import {
  COUNTS_TEXT,
  dayActivityText,
  daysLabel,
  formatDay,
  nextMedalText,
  nextStepText,
  reasonText,
  shieldRuleText,
  STATUS_BADGE,
  streakTitle,
  TIER_STYLE,
} from "./streakText";

const TIERS: StreakMedalTier[] = ["bronze", "silver", "gold", "diamond"];

/** Pestaña "Mi racha" del perfil: estado de la racha por curso. */
export default function StreakPanel() {
  const { streaks } = useStreak();

  if (!streaks.length) {
    return (
      <Text c="dimmed" py="md">
        Aún no tienes una racha en tus cursos. {COUNTS_TEXT}
      </Text>
    );
  }

  return (
    <Stack py="md">
      {streaks.map((s) => (
        <StreakCard key={s.enrollment_id} streak={s} />
      ))}
    </Stack>
  );
}

function StreakCard({ streak: s }: { streak: MyStreak }) {
  const status = STATUS_BADGE[s.status];
  const color = s.medal ? TIER_STYLE[s.medal.tier].dark : "#D9480F";
  const prevDays = s.medal?.days || 0;
  const toNext = s.next_medal
    ? Math.round(((s.current - prevDays) / (s.next_medal.days - prevDays)) * 100)
    : 100;

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="md" wrap="nowrap">
            <StreakMedal tier={s.medal?.tier || null} days={s.medal?.days} size={64} />
            <Stack gap={2}>
              <Title order={4} c={color}>
                {streakTitle(s)}
              </Title>
              <Text size="sm" c="dimmed">
                {s.event_name}
              </Text>
              <Text size="sm">
                <b>{daysLabel(s.current)}</b> seguidos · mejor racha: {daysLabel(s.best)}
              </Text>
            </Stack>
          </Group>
          <Badge color={status.color} variant="light">
            {status.label}
          </Badge>
        </Group>

        <Stack gap={6}>
          <Text fw={700} size="sm">
            Qué hacer para continuar
          </Text>
          <Text size="sm">{nextStepText(s)}</Text>
          {s.status !== "broken" && (
            <>
              <Text size="sm" c="dimmed">
                {nextMedalText(s)}
              </Text>
              {s.next_medal && (
                <Progress value={toNext} color="orange" size="sm" radius="xl" />
              )}
            </>
          )}
        </Stack>

        {s.current > 0 && (
          <Stack gap={6}>
            <Text fw={700} size="sm">
              Por qué tienes esta racha
            </Text>
            <Text size="sm">{reasonText(s)}</Text>
            <Stack gap={4}>
              {s.days.map((d) => (
                <Group key={d.day} gap="xs" wrap="nowrap">
                  <Text size="xs" w={90} c="dimmed" style={{ flexShrink: 0 }}>
                    {d.day === s.today ? "Hoy" : formatDay(d.day)}
                  </Text>
                  <Text
                    size="xs"
                    c={d.covered === "challenge" ? "orange" : d.covered === "shield" ? "blue" : undefined}
                  >
                    {dayActivityText(d)}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Stack>
        )}

        {s.shield.enabled && (
          <Group gap="sm" wrap="nowrap" align="flex-start">
            <IconShieldCheck
              size={28}
              style={{ flexShrink: 0 }}
              color={
                s.shield.count > 0
                  ? "var(--mantine-color-blue-6)"
                  : "var(--mantine-color-gray-4)"
              }
            />
            <Stack gap={2}>
              <Text fw={700} size="sm">
                Protector de racha:{" "}
                {s.shield.count > 0 ? `tienes ${s.shield.count}` : "no tienes"}
              </Text>
              <Text size="sm" c="dimmed">
                {shieldRuleText(s)}
                {s.today_activities > 0 && s.shield.count < s.shield.max
                  ? ` Hoy llevas ${s.today_activities} de ${s.shield.min_activities}.`
                  : ""}
              </Text>
            </Stack>
          </Group>
        )}

        <Stack gap={6}>
          <Text fw={700} size="sm">
            Medallas de racha
          </Text>
          <SimpleGrid cols={{ base: 2, xs: 4 }} spacing="xs">
            {s.milestones.map((days, i) => {
              const tier = TIERS[Math.min(i, TIERS.length - 1)];
              const won = s.current >= days;
              return (
                <Stack key={days} gap={2} align="center">
                  <StreakMedal tier={tier} days={days} size={40} locked={!won} />
                  <Text size="xs" fw={won ? 700 : 400} c={won ? undefined : "dimmed"}>
                    {TIER_STYLE[tier].label}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {days} días
                  </Text>
                </Stack>
              );
            })}
          </SimpleGrid>
        </Stack>

        <Text size="xs" c="dimmed">
          {COUNTS_TEXT}
        </Text>
      </Stack>
    </Card>
  );
}
