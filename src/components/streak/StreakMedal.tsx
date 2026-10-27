import { useId } from "react";
import { IconFlame } from "@tabler/icons-react";
import type { StreakMedalTier } from "../../services/genonStreakService";
import { TIER_STYLE } from "./streakText";

interface StreakMedalProps {
  /** Sin medalla (racha antes del primer hito): llama */
  tier: StreakMedalTier | null;
  /** Número dentro de la medalla (días del hito) */
  days?: number;
  size?: number;
  /** Medalla aún no ganada (en la escalera del perfil) */
  locked?: boolean;
}

/** Medalla de racha con cinta, del color de su tipo. */
export default function StreakMedal({ tier, days, size = 28, locked = false }: StreakMedalProps) {
  const gradientId = useId();
  if (!tier) {
    return <IconFlame size={size} color="#F76707" fill="#FFD8A8" aria-label="Racha en curso" />;
  }
  const c = locked
    ? { base: "#CED4DA", light: "#F1F3F5", dark: "#868E96" }
    : TIER_STYLE[tier];

  return (
    <svg
      width={size * 0.8}
      height={size}
      viewBox="0 0 32 40"
      role="img"
      aria-label={`Medalla de ${TIER_STYLE[tier].label.toLowerCase()}`}
      style={{ flexShrink: 0, opacity: locked ? 0.7 : 1 }}
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="60%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
      </defs>
      {/* Cinta */}
      <path d="M7 0h8l3 15h-8z" fill={locked ? "#ADB5BD" : "#E03131"} />
      <path d="M25 0h-8l-3 15h8z" fill={locked ? "#CED4DA" : "#1C7ED6"} />
      {/* Medalla */}
      <circle cx="16" cy="26.5" r="12.5" fill={`url(#${gradientId})`} stroke={c.dark} strokeWidth="1.2" />
      <circle cx="16" cy="26.5" r="9" fill="none" stroke={c.light} strokeOpacity="0.8" strokeWidth="1" />
      {days !== undefined ? (
        <text
          x="16"
          y="30"
          textAnchor="middle"
          fontSize={days >= 100 ? 7.5 : 10}
          fontWeight={800}
          fontFamily="system-ui, sans-serif"
          fill={c.dark}
        >
          {days}
        </text>
      ) : (
        <path
          d="M16 20l1.9 3.9 4.3.6-3.1 3 .7 4.3-3.8-2-3.8 2 .7-4.3-3.1-3 4.3-.6z"
          fill={c.dark}
        />
      )}
    </svg>
  );
}
