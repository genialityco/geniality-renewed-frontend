import { useEffect, useRef, useCallback } from 'react';
import { userActivityService } from '../../services/userActivityService';

interface TimeTrackerConfig {
  userId: string | null;
  organizationId: string;
  courseId?: string;
  eventId?: string;
  courseName?: string;
  activityId?: string;
  activityName?: string;
  isActive: boolean; // Si está activamente viendo
}

/** Cada cuánto se envía el tiempo acumulado al backend. */
const SYNC_INTERVAL_MS = 30_000;
/** Cada cuánto se suma el tiempo transcurrido. */
const TICK_MS = 1_000;
/**
 * Máximo que puede sumar un tick. Si el equipo se suspende con la pestaña
 * visible, el siguiente tick llega horas después; sin este tope esas horas
 * contarían como estudio.
 */
const MAX_TICK_MS = 5_000;

interface TrackTarget {
  userId: string;
  organizationId: string;
  eventId: string;
  courseId?: string;
  activityId?: string;
}

/**
 * Envía `deltaMs` al curso y/o actividad del target. Con `keepalive` usa
 * fetch keepalive para que el envío sobreviva al cierre de la pestaña.
 */
async function sendTime(
  target: TrackTarget,
  names: { courseName?: string; activityName?: string },
  deltaMs: number,
  keepalive: boolean,
) {
  const common = {
    user_id: target.userId,
    organization_id: target.organizationId,
    event_id: target.eventId,
    time_delta_ms: deltaMs,
  };

  if (keepalive) {
    if (target.courseId) {
      userActivityService.sendTimeOnUnload('update-course-time', {
        ...common,
        course_id: target.courseId,
        course_name: names.courseName,
      });
    }
    if (target.activityId) {
      userActivityService.sendTimeOnUnload('update-activity-time', {
        ...common,
        activity_id: target.activityId,
        activity_name: names.activityName,
      });
    }
    return;
  }

  await Promise.all([
    target.courseId
      ? userActivityService.updateCourseTime(
          target.userId,
          target.organizationId,
          target.courseId,
          target.eventId,
          deltaMs,
          names.courseName,
        )
      : null,
    target.activityId
      ? userActivityService.updateActivityTime(
          target.userId,
          target.organizationId,
          target.activityId,
          target.eventId,
          deltaMs,
          names.activityName,
        )
      : null,
  ]);
}

/**
 * Hook que rastrea el tiempo que el usuario pasa en un curso o actividad
 * y lo sincroniza periódicamente con el backend.
 *
 * El tiempo corre mientras `isActive` sea true y se atribuye siempre al
 * curso/actividad en que se generó: al cambiar de actividad, lo pendiente se
 * envía a la anterior antes de empezar a contar la nueva. Al ocultar o cerrar
 * la pestaña se envía con keepalive para no perder el último tramo.
 */
export const useTimeTracker = ({
  userId,
  organizationId,
  courseId,
  eventId,
  courseName,
  activityId,
  activityName,
  isActive = true,
}: TimeTrackerConfig) => {
  // Tiempo acumulado aún no enviado
  const pendingMsRef = useRef(0);
  // Momento del último tick; null mientras el rastreo está detenido
  const lastTickRef = useRef<number | null>(null);
  const isActiveRef = useRef(isActive);
  // Los nombres pueden llegar después (se cargan aparte); no cambian el target
  const namesRef = useRef({ courseName, activityName });
  namesRef.current = { courseName, activityName };
  // Envía lo pendiente del target actual (lo asigna el efecto principal)
  const flushRef = useRef<(keepalive?: boolean) => void>(() => {});

  /** Suma al pendiente el tiempo transcurrido desde el último tick. */
  const accumulate = useCallback(() => {
    if (lastTickRef.current === null) return;
    const now = Date.now();
    pendingMsRef.current += Math.min(now - lastTickRef.current, MAX_TICK_MS);
    lastTickRef.current = now;
  }, []);

  useEffect(() => {
    if (!userId || !organizationId || !eventId || (!courseId && !activityId)) {
      return;
    }

    const target: TrackTarget = { userId, organizationId, eventId, courseId, activityId };
    pendingMsRef.current = 0;
    lastTickRef.current = isActiveRef.current ? Date.now() : null;

    const flush = (keepalive = document.visibilityState === 'hidden') => {
      accumulate();
      const delta = Math.round(pendingMsRef.current);
      if (delta <= 0) return;
      // Se descuenta antes de enviar para que dos flush seguidos no manden
      // el mismo tramo dos veces.
      pendingMsRef.current = 0;
      sendTime(target, namesRef.current, delta, keepalive).catch((error) => {
        console.error('Error sincronizando tiempo:', error);
      });
    };
    flushRef.current = flush;

    const tickInterval = setInterval(accumulate, TICK_MS);
    const syncInterval = setInterval(() => flush(), SYNC_INTERVAL_MS);
    const handlePageHide = () => flush(true);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      clearInterval(tickInterval);
      clearInterval(syncInterval);
      window.removeEventListener('pagehide', handlePageHide);
      // Cambio de actividad/curso o desmontaje: lo pendiente es del target
      // que se va.
      flush();
      lastTickRef.current = null;
      flushRef.current = () => {};
    };
  }, [userId, organizationId, eventId, courseId, activityId, accumulate]);

  /** Pausar/reanudar sin cambiar de target. */
  useEffect(() => {
    isActiveRef.current = isActive;
    if (isActive) {
      if (lastTickRef.current === null) lastTickRef.current = Date.now();
    } else {
      // Suma hasta el momento de la pausa y envía (keepalive si la pestaña
      // se está ocultando, que es también lo que precede a cerrarla).
      flushRef.current();
      lastTickRef.current = null;
    }
  }, [isActive]);

  const getElapsedTime = useCallback(() => {
    accumulate();
    return pendingMsRef.current;
  }, [accumulate]);

  const resetTime = useCallback(() => {
    pendingMsRef.current = 0;
    if (lastTickRef.current !== null) lastTickRef.current = Date.now();
  }, []);

  const syncTime = useCallback(async () => {
    flushRef.current();
  }, []);

  return {
    getElapsedTime,
    resetTime,
    syncTime,
  };
};
