import { useEffect } from "react";
import { Paper, Stack, Text } from "@mantine/core";
import type { MyStreak } from "../../services/genonStreakService";
import { fireConfetti } from "../../utils/confetti";
import StreakMedal from "./StreakMedal";
import {
  COUNTS_TEXT,
  daysLabel,
  nextMedalText,
  nextStepText,
  reasonText,
  shieldText,
  TIER_STYLE,
} from "./streakText";

const FLAME_COLORS = ["#F76707", "#FD7E14", "#FFA94D", "#FFD43B", "#FA5252"];

interface StreakCelebrationProps {
  streak: MyStreak;
  /** Qué logró ahora (si no, solo muestra la racha de hoy) */
  kind?: "milestone" | "day" | null;
}

function title(s: MyStreak, kind: StreakCelebrationProps["kind"]) {
  if (kind === "milestone" && s.medal) return `¡Ganaste la medalla de racha de ${s.medal.name}!`;
  if (s.current === 1) return "¡Empezaste una racha de estudio!";
  return `🔥 ¡${daysLabel(s.current)} seguidos estudiando!`;
}

/**
 * La racha al terminar una actividad: cuántos días lleva, por qué la logró y
 * cómo seguir. Lanza confeti al aparecer (más si ganó una medalla).
 */
export default function StreakCelebration({ streak: s, kind = null }: StreakCelebrationProps) {
  const medalWon = kind === "milestone" && !!s.medal;
  const color = s.medal ? TIER_STYLE[s.medal.tier].dark : "#D9480F";

  useEffect(() => {
    const tier = s.medal ? TIER_STYLE[s.medal.tier] : null;
    fireConfetti(
      medalWon && tier ? [tier.base, tier.light, tier.dark, ...FLAME_COLORS] : FLAME_COLORS,
      medalWon ? 140 : 80
    );
    // Una vez por logro (y al abrir el modal con la racha)
  }, [s.enrollment_id, s.current, medalWon]);

  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      w="100%"
      style={{ borderColor: `${color}55`, background: `${color}0D` }}
    >
      <Stack gap="sm" align="center">
        <StreakMedal
          tier={s.medal?.tier || null}
          days={s.medal ? s.current : undefined}
          size={medalWon ? 84 : 56}
        />
        <Stack gap={2} align="center">
          <Text size="lg" fw={800} ta="center" c={color}>
            {title(s, kind)}
          </Text>
          <Text size="sm" c="dimmed" ta="center">
            Tu racha: {daysLabel(s.current)} seguidos estudiando {s.event_name}
          </Text>
        </Stack>

        <Stack gap={4} w="100%">
          <Text size="sm" fw={700}>
            ¿Por qué la lograste?
          </Text>
          <Text size="sm">{reasonText(s)}</Text>
        </Stack>

        <Stack gap={4} w="100%">
          <Text size="sm" fw={700}>
            ¿Cómo sigues?
          </Text>
          <Text size="sm">{nextStepText(s)}</Text>
          <Text size="sm" c="dimmed">
            {nextMedalText(s)}
          </Text>
          {s.shield.enabled && (
            <Text size="sm" c={s.shield.count > 0 ? "blue" : "dimmed"}>
              {shieldText(s)}
            </Text>
          )}
        </Stack>

        <Text size="xs" c="dimmed" w="100%">
          {COUNTS_TEXT}
          {medalWon && s.whatsapp ? " También te enviamos este logro por WhatsApp." : ""}
        </Text>
      </Stack>
    </Paper>
  );
}
