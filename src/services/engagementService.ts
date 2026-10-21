import api from "./api";

/** Mensajes que inicia la plataforma (ver engagement/ en el backend). */
export type EngagementKind =
  | "inactivity_reminder"
  | "weekly_report"
  | "course_ranking"
  | "practice_review"
  | "practice_invite";

export const ENGAGEMENT_KIND_LABELS: Record<EngagementKind, string> = {
  inactivity_reminder: "Recordatorio de inactividad",
  weekly_report: "Reporte semanal",
  course_ranking: "Comparación con el grupo",
  practice_review: "Repaso automático",
  practice_invite: "Simulacro enviado por admin",
};

export type EngagementStatus =
  | "pending"
  | "sent"
  | "fallback_email"
  | "failed"
  | "holdout"
  | "capped";

export type MetaStatus = "sent" | "delivered" | "read" | "failed";

/** Diferencia contra el grupo de control, con intervalo de confianza 95 %. */
export interface EngagementLift {
  /** Puntos porcentuales */
  value: number | null;
  ci_low: number | null;
  ci_high: number | null;
  /** El intervalo no incluye 0 */
  significant: boolean | null;
}

export interface EngagementKindSummary {
  kind: EngagementKind | "all";
  total: number;
  sent: number;
  fallback_email: number;
  failed: number;
  capped: number;
  holdout: number;
  /** sent + fallback_email */
  delivered: number;

  /** Envíos por WhatsApp con estados de Meta */
  with_status: number;
  meta_delivered: number;
  meta_read: number;
  meta_failed: number;
  delivery_rate: number | null;
  read_rate: number | null;

  replied: number;
  reply_rate: number | null;
  /** Envíos cuyo enlace permitía medir el clic */
  click_tracked: number;
  clicked: number;
  click_rate: number | null;
  opted_out: number;

  /** Entregados con la ventana ya cumplida (entran en las tasas) */
  matured: number;
  returned: number;
  return_rate: number | null;
  progressed: number;
  progress_rate: number | null;
  completed: number;
  completion_rate: number | null;

  holdout_matured: number;
  holdout_returned: number;
  holdout_return_rate: number | null;
  holdout_progressed: number;
  holdout_progress_rate: number | null;
  return_lift: EngagementLift;
  /** Diferencia en avance: el resultado principal */
  lift: EngagementLift;
  /** Algún grupo tiene muy pocos casos para sacar conclusiones */
  small_sample: boolean;

  /** Solo para simulacros (null en los demás tipos) */
  practice_started: number | null;
  practice_completed: number | null;
  practice_start_rate: number | null;
  practice_avg_score: number | null;
}

export interface EngagementSummary {
  from: string;
  to: string;
  window_hours: number;
  min_sample: number;
  truncated: boolean;
  totals: EngagementKindSummary;
  kinds: EngagementKindSummary[];
}

export interface EngagementMessageRow {
  _id: string;
  kind: EngagementKind;
  status: EngagementStatus;
  at: string;
  user_id: string;
  name: string;
  email: string;
  event_id: string | null;
  template: string | null;
  error: string | null;
  meta_status: MetaStatus | null;
  delivered_at: string | null;
  read_at: string | null;
  meta_error: string | null;
  click_tracked: boolean;
  clicked_at: string | null;
  replied_at: string | null;
  reply_text: string | null;
  opted_out_at: string | null;
  matured: boolean;
  returned_at: string | null;
  progressed_at: string | null;
  completed_at: string | null;
  practice: {
    status: string;
    started_at: string | null;
    score: number | null;
  } | null;
}

export interface EngagementFilter {
  from?: string;
  to?: string;
  kind?: EngagementKind;
  windowHours?: number;
}

const base = (organizationId: string) =>
  `/engagement/organization/${organizationId}`;

/** GET /engagement/organization/:organizationId/summary (solo admins) */
export async function fetchEngagementSummary(
  organizationId: string,
  filter: EngagementFilter
): Promise<EngagementSummary> {
  const { data } = await api.get<EngagementSummary>(
    `${base(organizationId)}/summary`,
    { params: filter }
  );
  return data;
}

/** GET /engagement/organization/:organizationId/messages (solo admins) */
export async function fetchEngagementMessages(
  organizationId: string,
  filter: EngagementFilter & { status?: EngagementStatus; limit?: number }
): Promise<EngagementMessageRow[]> {
  const { data } = await api.get<EngagementMessageRow[]>(
    `${base(organizationId)}/messages`,
    { params: filter }
  );
  return data;
}

/**
 * Registra el clic en el botón de un mensaje de WhatsApp. El enlace trae
 * ?ref=<id del envío>; se llama al cargar la app, antes de que el router
 * redirija (p. ej. al login) y se pierda el parámetro.
 */
export function captureEngagementClick(): void {
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (!ref) return;
    // Se quita de la URL para no contarlo de nuevo al recargar o compartir
    url.searchParams.delete("ref");
    window.history.replaceState(window.history.state, "", url.toString());
    // "test" viene de "Probar plantillas": solo se comprueba que el enlace abre
    if (!/^[a-f0-9]{24}$/.test(ref)) return;
    api.post("/engagement/clicks", { ref }).catch(() => undefined);
  } catch {
    // Nunca debe impedir que cargue la app
  }
}
