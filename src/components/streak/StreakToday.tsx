import { Group, Paper, Stack, Text } from "@mantine/core";
import { IconFlame, IconShieldCheck } from "@tabler/icons-react";
import type { MyStreak } from "../../services/genonStreakService";
import { activitiesLabel, daysLabel } from "./streakText";

/** Qué gana con el protector hoy, o cuánto le falta. */
function shieldLine(s: MyStreak) {
  const { shield } = s;
  if (!shield.enabled) return null;
  if (shield.earned_today) {
    return "¡Ganaste un protector de racha! Si un día no puedes estudiar, cubre ese día y tu racha no se corta.";
  }
  if (shield.count >= shield.max) return "Ya tienes tu protector de racha guardado.";
  const missing = shield.min_activities - s.today_activities;
  return missing > 0
    ? `Te ${missing === 1 ? "falta" : "faltan"} ${activitiesLabel(missing)} hoy para ganar un protector de racha.`
    : null;
}

/**
 * La racha al terminar otra actividad el mismo día: el día ya contaba, así
 * que no hay celebración ni confeti. Muestra cuántas lleva hoy y el protector.
 */
export default function StreakToday({ streak: s }: { streak: MyStreak }) {
  const intense = s.today_activities >= 2;
  const shield = shieldLine(s);
  return (
    <Paper withBorder radius="md" p="sm" w="100%" style={{ borderColor: "#D9480F33" }}>
      <Stack gap={6}>
        <Group gap={6} wrap="nowrap">
          <IconFlame size={20} color="#D9480F" style={{ flexShrink: 0 }} />
          <Text size="sm" fw={700} c="#D9480F">
            {intense
              ? `Día intenso: ${activitiesLabel(s.today_activities)} hoy`
              : "Hoy ya cuenta para tu racha"}
          </Text>
        </Group>
        <Text size="sm">
          Tu racha sigue en {daysLabel(s.current)}. Mañana, una actividad la lleva a{" "}
          {daysLabel(s.current + 1)}.
        </Text>
        {shield && (
          <Group gap={6} wrap="nowrap" align="flex-start">
            <IconShieldCheck
              size={18}
              style={{ flexShrink: 0, marginTop: 2 }}
              color={
                s.shield.earned_today || s.shield.count > 0
                  ? "var(--mantine-color-blue-6)"
                  : "var(--mantine-color-gray-5)"
              }
            />
            <Text size="sm" c={s.shield.earned_today ? "blue" : "dimmed"} fw={s.shield.earned_today ? 600 : 400}>
              {shield}
            </Text>
          </Group>
        )}
      </Stack>
    </Paper>
  );
}
