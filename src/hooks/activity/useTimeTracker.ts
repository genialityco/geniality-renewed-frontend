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

/**
 * Hook que rastrea el tiempo que el usuario pasa en un curso o actividad
 * y lo sincroniza periódicamente con el backend
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
  const elapsedTimeRef = useRef<number>(0);
  const lastUpdateRef = useRef<number>(Date.now());
  const trackerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Sincroniza el tiempo con el backend
   */
  const syncTime = useCallback(async () => {
    if (!userId || !organizationId || elapsedTimeRef.current === 0) {
      return;
    }

    try {
      // Si hay courseId, sincronizar tiempo de curso
      if (courseId && eventId) {
        await userActivityService.updateCourseTime(
          userId,
          organizationId,
          courseId,
          eventId,
          elapsedTimeRef.current,
          courseName,
        );
      }

      // Si hay activityId, sincronizar tiempo de actividad
      if (activityId && eventId) {
        await userActivityService.updateActivityTime(
          userId,
          organizationId,
          activityId,
          eventId,
          elapsedTimeRef.current,
          activityName,
        );
      }

      // Resetear contador después de sincronizar
      elapsedTimeRef.current = 0;
      lastUpdateRef.current = Date.now();
    } catch (error: any) {
      if (error?.response?.status === 404) {
        // Si la sesión ya no está activa, evitar ruido de logs en cleanup/race conditions
        return;
      }
      console.error('Error sincronizando tiempo:', error);
    }
  }, [userId, organizationId, courseId, eventId, courseName, activityId, activityName]);

  /**
   * Obtener el tiempo transcurrido sin sincronizar
   */
  const getElapsedTime = useCallback(() => {
    return elapsedTimeRef.current;
  }, []);

  /**
   * Resetear el tiempo
   */
  const resetTime = useCallback(() => {
    elapsedTimeRef.current = 0;
    lastUpdateRef.current = Date.now();
  }, []);

  /**
   * Inicializar rastreador
   */
  useEffect(() => {
    if (!userId || !organizationId || isInitializedRef.current) {
      return;
    }

    // Si no está activo, no iniciar rastreador
    if (!isActive) {
      return;
    }

    // Si no hay courseId ni activityId, no hay nada que rastrear
    if (!courseId && !activityId) {
      return;
    }

    isInitializedRef.current = true;
    lastUpdateRef.current = Date.now();

    // El rastreador de tiempo se ejecuta cada 100ms para mayor precisión
    trackerIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const delta = now - lastUpdateRef.current;
      elapsedTimeRef.current += delta;
      lastUpdateRef.current = now;
    }, 100);

    // Sincronizar con el backend cada 30 segundos
    syncIntervalRef.current = setInterval(() => {
      syncTime();
    }, 30000);

    // Sincronizar cuando se desmonta el componente
    return () => {
      if (trackerIntervalRef.current) {
        clearInterval(trackerIntervalRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      // Sincronizar antes de desmontar (best effort)
      syncTime();
      isInitializedRef.current = false;
    };
  }, [userId, organizationId, courseId, eventId, courseName, activityId, activityName, isActive, syncTime]);

  /**
   * Sincronizar cuando se cambia de curso/actividad
   */
  useEffect(() => {
    if (isInitializedRef.current) {
      // Al cambiar de curso/actividad, sincronizar primero y luego resetear
      syncTime();
    }
  }, [courseId, activityId]);

  /**
   * Detener rastreador cuando isActive se vuelve false
   */
  useEffect(() => {
    if (!isActive && trackerIntervalRef.current) {
      clearInterval(trackerIntervalRef.current);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      // Sincronizar antes de detener
      syncTime();
    }
  }, [isActive, syncTime]);

  return {
    getElapsedTime,
    resetTime,
    syncTime,
  };
};
