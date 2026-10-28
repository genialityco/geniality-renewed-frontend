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
 * safe: hoy ya cuenta · protected: hoy aún no estudia, pero un protector
 * cubre el día · at_risk: hoy aún no estudia · broken: se cortó (quizá
 * recuperable) · none: sin racha
 */
export type StreakStatus = "none" | "safe" | "protected" | "at_risk" | "broken";

export interface StreakDay {
  day: string;
  activities: number;
  challenges: number;
  /** Día sin estudio que no cortó la racha: un reto de repaso o un protector */
  covered: "challenge" | "shield" | null;
}

export interface MyStreak {
  /** Inscripción donde se guardan los logros vistos */
  enrollment_id: string;
  event_id: string;
  /** Cursos del programa: en cualquiera se suma a la racha */
  event_ids: string[];
  /** Cursos de la persona ("A y B" o "tus cursos") */
  event_name: string;
  organization_id: string;
  timezone: string;
  today: string;
  current: number;
  best: number;
  active_today: boolean;
  /** Actividades terminadas hoy, en todos sus cursos */
  today_activities: number;
  start: string | null;
  /** Protector: un día con varias actividades cubre un día sin estudio */
  shield: {
    enabled: boolean;
    min_activities: number;
    max: number;
    /** Guardados */
    count: number;
    earned_today: boolean;
  };
  /** Mostrar el botón de examen en la ventana de actividad completada */
  practice_button: boolean;
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
