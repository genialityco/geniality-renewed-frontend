import api from "./api";

/** Logros del estudiante (backend: src/genon/genon-achievements.service.ts). */

export type AchievementType =
  | "activitiesCompleted"
  | "videosCompleted"
  | "modulesCompleted"
  | "coursesStarted"
  | "coursesCompleted"
  | "courseProgress"
  | "streakDays"
  | "studyDays"
  | "challengesPassed";

export interface AchievementDef {
  /** Se guarda en cada logro otorgado: cambiarlo cuenta como un logro nuevo */
  id: string;
  enabled: boolean;
  type: AchievementType;
  threshold: number;
  title: string;
  /** Felicitación: {nombre}, {umbral}, {valor} y {singular|plural} */
  text?: string;
}

export interface AchievementsConfig {
  enabled: boolean;
  /** Pestaña «Mis logros» y aviso al conseguirlos */
  show_to_student: boolean;
  /** Grupo de control: se registra el logro, pero no lo ven */
  holdout_percent: number;
  items: AchievementDef[];
}

export interface MyAchievementItem {
  id: string;
  type: AchievementType;
  title: string;
  threshold: number;
  achieved: boolean;
  achieved_at: string | null;
  /** Avance hacia el umbral (tope: el umbral) */
  progress: number;
  value: number;
  /** Felicitación del logro conseguido */
  text: string | null;
}

export interface MyAchievements {
  program_id: string;
  event_ids: string[];
  /** Cursos de la persona en el programa ("A y B" o "tus cursos") */
  event_name: string;
  achieved: number;
  total: number;
  items: MyAchievementItem[];
  /** Logros conseguidos que la plataforma aún no le mostró */
  celebrate: { id: string; title: string; text: string }[];
}

export interface AchievementsReport {
  enabled: boolean;
  holdout_percent: number;
  achievements: {
    id: string;
    type: AchievementType;
    title: string;
    threshold: number;
    enabled: boolean;
    awarded: number;
    holdout: number;
    seen: number;
    first: string | null;
    last: string | null;
  }[];
  recent: {
    achievement_id: string;
    title: string;
    user_id: string;
    name: string;
    email: string;
    value: number;
    holdout: boolean;
    seen_at: string | null;
    created_at: string;
  }[];
}

/** Cómo se lee el avance de cada tipo: "3 de 5 videos completos". */
export const ACHIEVEMENT_UNITS: Record<AchievementType, [string, string]> = {
  activitiesCompleted: ["actividad terminada", "actividades terminadas"],
  videosCompleted: ["video completo", "videos completos"],
  modulesCompleted: ["módulo terminado", "módulos terminados"],
  coursesStarted: ["curso iniciado", "cursos iniciados"],
  coursesCompleted: ["curso terminado", "cursos terminados"],
  courseProgress: ["% de avance", "% de avance"],
  streakDays: ["día seguido", "días seguidos"],
  studyDays: ["día con estudio", "días con estudio"],
  challengesPassed: ["reto superado", "retos superados"],
};

export function achievementProgressText(i: Pick<MyAchievementItem, "type" | "progress" | "threshold">) {
  const [one, many] = ACHIEVEMENT_UNITS[i.type];
  if (i.type === "courseProgress") return `${i.progress} de ${i.threshold} % de avance en un curso`;
  return `${i.progress} de ${i.threshold} ${i.threshold === 1 ? one : many}`;
}

export const fetchMyAchievements = async (organizationId: string): Promise<MyAchievements[]> => {
  const { data } = await api.get<{ programs: MyAchievements[] }>("/genon/me/achievements", {
    params: { organizationId },
  });
  return data.programs || [];
};

export const markAchievementsSeen = async (programId: string, ids: string[]) => {
  await api.post(`/genon/me/achievements/${programId}/seen`, { ids });
};

export const fetchAchievementsReport = async (programId: string) =>
  (await api.get<AchievementsReport>(`/genon/programs/${programId}/achievements/report`)).data;
