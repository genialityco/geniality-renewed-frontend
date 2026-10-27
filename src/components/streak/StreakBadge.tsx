import { Badge, Button, Group, Popover, Stack, Text, UnstyledButton } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import type { MyStreak } from "../../services/genonStreakService";
import StreakMedal from "./StreakMedal";
import {
  daysLabel,
  nextMedalText,
  nextStepText,
  STATUS_BADGE,
  streakTitle,
  TIER_STYLE,
} from "./streakText";

interface StreakBadgeProps {
  streak: MyStreak | null;
  /** Solo la medalla y los días (pantallas pequeñas) */
  compact?: boolean;
}

/** Tipo de racha en el encabezado: medalla y días; al tocarla, cómo seguir. */
export default function StreakBadge({ streak, compact = false }: StreakBadgeProps) {
  const navigate = useNavigate();
  if (!streak || streak.current === 0) return null;
  const { medal } = streak;
  const color = medal ? TIER_STYLE[medal.tier].dark : "#D9480F";
  const status = STATUS_BADGE[streak.status];

  return (
    <Popover width={300} position="bottom-end" shadow="md" withArrow>
      <Popover.Target>
        <UnstyledButton
          aria-label={`${streakTitle(streak)}: ${daysLabel(streak.current)}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 10px 2px 6px",
            borderRadius: 999,
            border: `1px solid ${color}40`,
            background: `${color}10`,
            flexShrink: 0,
          }}
        >
          <StreakMedal tier={medal?.tier || null} days={medal?.days} size={26} />
          <Text size="sm" fw={700} c={color}>
            {compact ? streak.current : daysLabel(streak.current)}
          </Text>
          {!compact && medal && (
            <Text size="xs" c="dimmed" visibleFrom="sm">
              {TIER_STYLE[medal.tier].label}
            </Text>
          )}
        </UnstyledButton>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs">
          <Group gap="sm" wrap="nowrap">
            <StreakMedal tier={medal?.tier || null} days={medal?.days} size={44} />
            <Stack gap={0}>
              <Text fw={700}>{streakTitle(streak)}</Text>
              <Text size="xs" c="dimmed">
                {daysLabel(streak.current)} seguidos · {streak.event_name}
              </Text>
            </Stack>
          </Group>
          <Badge color={status.color} variant="light" w="fit-content">
            {status.label}
          </Badge>
          <Text size="sm">{nextStepText(streak)}</Text>
          <Text size="sm" c="dimmed">
            {nextMedalText(streak)}
          </Text>
          <Button
            size="xs"
            variant="light"
            color="orange"
            onClick={() =>
              navigate(`/organization/${streak.organization_id}/profile?tab=streak`)
            }
          >
            Ver mi racha
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
