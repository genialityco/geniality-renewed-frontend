import api from "./api";

/** Racha académica del estudiante (backend: src/genon/genon-my-streak.service.ts). */

export type StreakMedalTier = "bronze" | "silver" | "gold" | "diamond";

export interface StreakMedal {
  tier: StreakMedalTier;
  /** "bronce", "plata", "oro", "diamante" */
  name: string;
  /** Días del hito que la otorga */
  days: number;
}

/**
 * safe: hoy ya cuenta · at_risk: hoy aún no estudia · broken: se cortó
 * (quizá recuperable) · none: sin racha
 */
export type StreakStatus = "none" | "safe" | "at_risk" | "broken";

export interface StreakDay {
  day: string;
  activities: number;
  challenges: number;
  /** Día sin estudio que un reto de repaso recuperó */
  recovered: boolean;
}

export interface MyStreak {
  enrollment_id: string;
  event_id: string;
  event_name: string;
  organization_id: string;
  timezone: string;
  today: string;
  current: number;
  best: number;
  active_today: boolean;
  start: string | null;
  status: StreakStatus;
  /** Hasta cuándo hay que estudiar para no perderla */
  deadline: string | null;
  medal: StreakMedal | null;
  next_medal: (StreakMedal & { missing: number }) | null;
  milestones: number[];
  /** Qué hizo cada día de la racha (el más reciente primero) */
  days: StreakDay[];
  /** Racha cortada que un reto de repaso por WhatsApp aún puede recuperar */
  recovery: { lost: number; until: string } | null;
  /** Le llegan los mensajes de Gen.ON por WhatsApp */
  whatsapp: boolean;
  /** Logro de hoy que la plataforma aún no le mostró */
  celebrate: {
    key: string;
    kind: "milestone" | "day";
    days: number;
    medal: StreakMedal | null;
  } | null;
}

export const fetchMyStreaks = async (filter: {
  organizationId?: string;
  eventId?: string;
}): Promise<MyStreak[]> => {
  const { data } = await api.get<{ streaks: MyStreak[] }>("/genon/me/streaks", {
    params: filter,
  });
  return data.streaks || [];
};

export const markStreakSeen = async (enrollmentId: string, key: string) => {
  await api.post(`/genon/me/streaks/${enrollmentId}/seen`, { key });
};

/** Evento de ventana: se terminó una actividad (la racha puede haber cambiado). */
export const ACTIVITY_COMPLETED_EVENT = "genon:activity-completed";
