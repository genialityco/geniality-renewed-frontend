/**
 * Analytics utility — centralizes all user interaction tracking.
 * Uses gtag (Google Analytics 4) if available, otherwise logs to console in dev.
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

function track(eventName: string, params?: EventParams) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  } else if (import.meta.env.DEV) {
    console.log(`[Analytics] ${eventName}`, params);
  }
}

// ─── Landing / Contenido ────────────────────────────────────────────────────

/** Click en una tarjeta de curso/evento */
export function trackCourseClick(eventId: string, eventName?: string) {
  track("course_click", { event_id: eventId, event_name: eventName });
}

/** Click en una tarjeta de actividad */
export function trackActivityClick(activityId: string, activityName?: string) {
  track("activity_click", { activity_id: activityId, activity_name: activityName });
}

/** Click en el botón Buscar con el término ingresado */
export function trackSearch(query: string, organizationId?: string) {
  track("search", { search_term: query, organization_id: organizationId });
}

// ─── Perfil — Tabs ───────────────────────────────────────────────────────────

/** Acceso a la pestaña Mis Cursos */
export function trackProfileTabMyCourses() {
  track("profile_tab_view", { tab: "mis_cursos" });
}

/** Acceso a la pestaña Mis Organizaciones */
export function trackProfileTabMyOrganizations() {
  track("profile_tab_view", { tab: "mis_organizaciones" });
}

/** Acceso a la pestaña Información Personal */
export function trackProfileTabPersonalInfo() {
  track("profile_tab_view", { tab: "informacion_personal" });
}

/** Acceso a la pestaña Mi Plan */
export function trackProfileTabMembershipPlan() {
  track("profile_tab_view", { tab: "mi_plan" });
}

// ─── Perfil — Acciones ───────────────────────────────────────────────────────

/** Click en Guardar cambios en Información Personal */
export function trackSavePersonalInfo(userId: string) {
  track("save_personal_info", { user_id: userId });
}

/** Click en Visitar organización desde Mis Organizaciones */
export function trackVisitOrganization(organizationId: string, organizationName?: string) {
  track("visit_organization_click", {
    organization_id: organizationId,
    organization_name: organizationName,
  });
}

/** Click en ADMIN de una organización desde Mis Organizaciones */
export function trackAdminOrganizationClick(organizationId: string) {
  track("admin_organization_click", { organization_id: organizationId });
}

/** Click en suscribirse / ver planes (paywall) */
export function trackOpenPaywall(organizationId?: string) {
  track("open_paywall", { organization_id: organizationId });
}

/** Click en iniciar sesión desde el modal de suscripción */
export function trackSubscriptionStart(organizationId?: string) {
  track("subscription_start_click", { organization_id: organizationId });
}
