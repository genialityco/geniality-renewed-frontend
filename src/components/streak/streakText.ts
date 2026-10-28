import type { MyStreak, StreakMedalTier } from "../../services/genonStreakService";

/** Colores de cada medalla (base, brillo, sombra) y su nombre para mostrar. */
export const TIER_STYLE: Record<
  StreakMedalTier,
  { label: string; base: string; light: string; dark: string }
> = {
  bronze: { label: "Bronce", base: "#CD7F32", light: "#EDB27A", dark: "#8A5320" },
  silver: { label: "Plata", base: "#AEB6BF", light: "#E6EAEE", dark: "#6E7781" },
  gold: { label: "Oro", base: "#E2B019", light: "#FFE38A", dark: "#9C7400" },
  diamond: { label: "Diamante", base: "#3FA7E0", light: "#B8E5FF", dark: "#1B6FA8" },
};

export const COUNTS_TEXT =
  "Cuenta como día de estudio terminar una actividad de cualquiera de tus cursos o superar un reto por WhatsApp. Solo abrir la plataforma o leer los mensajes no cuenta.";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "mar, 21 oct" a partir de "2026-10-21" (el día ya viene en la zona del curso). */
export function formatDay(ymd: string, weekday: "short" | "long" = "short") {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-CO", {
    weekday,
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatDeadline(s: MyStreak, withDay: boolean) {
  if (!s.deadline) return "";
  return new Date(s.deadline).toLocaleString("es-CO", {
    ...(withDay ? { weekday: "long", day: "numeric", month: "short" } : {}),
    hour: "numeric",
    minute: "2-digit",
    timeZone: s.timezone,
  });
}

/** "Racha de plata", "Racha en curso" o "Sin racha". */
export function streakTitle(s: MyStreak) {
  if (s.medal) return `Racha de ${s.medal.name}`;
  return s.current > 0 ? "Racha en curso" : "Sin racha activa";
}

export function daysLabel(n: number) {
  return plural(n, "día", "días");
}

export function activitiesLabel(n: number) {
  return plural(n, "actividad", "actividades");
}

/** Por qué tiene la racha. */
export function reasonText(s: MyStreak) {
  if (s.current === 0) return "";
  const recovered = s.days.filter((d) => d.covered === "challenge").length;
  const shielded = s.days.filter((d) => d.covered === "shield").length;
  const since = s.start ? ` desde el ${formatDay(s.start, "long")}` : "";
  return (
    `La lograste porque estudiaste ${daysLabel(s.current)} seguidos${since}: ` +
    "cada día terminaste al menos una actividad o superaste un reto." +
    (recovered
      ? ` ${plural(recovered, "día se recuperó", "días se recuperaron")} superando un reto de repaso.`
      : "") +
    (shielded
      ? ` ${plural(shielded, "día sin estudio lo cubrió", "días sin estudio los cubrieron")} tu protector de racha.`
      : "")
  );
}

/** Cómo se gana el protector y para qué sirve. */
export function shieldRuleText(s: MyStreak) {
  return `Si terminas ${activitiesLabel(s.shield.min_activities)} o más el mismo día, ganas un protector de racha (máximo ${s.shield.max}): si un día no puedes estudiar, cubre ese día y tu racha no se corta.`;
}

/** Protectores guardados: "Tienes 1 protector…" */
export function shieldText(s: MyStreak) {
  if (!s.shield.enabled) return "";
  if (s.shield.count > 0) {
    return `🛡️ Tienes ${plural(s.shield.count, "protector", "protectores")} de racha: si un día no estudias, cubre ese día automáticamente.`;
  }
  return shieldRuleText(s);
}

/** Qué hacer para continuar (o recuperar) la racha. */
export function nextStepText(s: MyStreak) {
  switch (s.status) {
    case "safe":
      return `Hoy ya cuenta. Para continuar, completa una actividad o supera un reto mañana (tienes hasta el ${formatDeadline(s, true)}).`;
    case "protected":
      return `Hoy aún no cuenta, pero tu protector cubre el día si no alcanzas a estudiar. Para que la racha siga sumando, completa una actividad hoy o, a más tardar, el ${formatDeadline(s, true)}.`;
    case "at_risk":
      return `Hoy aún no cuenta. Completa una actividad o supera un reto antes de las ${formatDeadline(s, false)} de hoy para no perder tus ${daysLabel(s.current)}.`;
    case "broken":
      return s.whatsapp && s.recovery
        ? `Tu racha de ${daysLabel(s.recovery.lost)} se interrumpió. Supera el reto de repaso que te enviamos por WhatsApp a más tardar el ${formatDay(s.recovery.until, "long")} para recuperarla, o empieza una nueva completando una actividad.`
        : `Tu racha de ${daysLabel(s.recovery?.lost || 0)} se interrumpió. Empieza una nueva completando una actividad hoy.`;
    default:
      return "Completa una actividad hoy para empezar tu racha.";
  }
}

/** Cuánto falta para la siguiente medalla. */
export function nextMedalText(s: MyStreak) {
  if (!s.next_medal) {
    return s.medal ? "Alcanzaste la medalla más alta. ¡Sigue así!" : "";
  }
  const { missing, name, days } = s.next_medal;
  return `Te ${missing === 1 ? "falta" : "faltan"} ${daysLabel(missing)} para la medalla de ${name} (${days} días seguidos).`;
}

export const STATUS_BADGE: Record<MyStreak["status"], { label: string; color: string }> = {
  safe: { label: "Hoy ya cuenta", color: "teal" },
  protected: { label: "Protegida hoy", color: "blue" },
  at_risk: { label: "Estudia hoy", color: "orange" },
  broken: { label: "Interrumpida", color: "red" },
  none: { label: "Sin racha", color: "gray" },
};

/** Qué hizo un día de la racha: "2 actividades · 1 reto". */
export function dayActivityText(d: MyStreak["days"][number]) {
  if (d.covered === "challenge") return "Recuperado con un reto de repaso";
  if (d.covered === "shield") return "🛡️ Sin estudio: lo cubrió tu protector";
  return [
    d.activities ? activitiesLabel(d.activities) : "",
    d.challenges ? plural(d.challenges, "reto superado", "retos superados") : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
