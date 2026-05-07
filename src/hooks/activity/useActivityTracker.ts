import { useEffect, useRef, useCallback } from 'react';
import { userActivityService } from '../../services/userActivityService';

interface ActivityTrackerConfig {
  userId: string | null;
  firebaseUid: string | null;
  organizationId: string;
}

// Evita reiniciar sesión múltiples veces en la misma pestaña
const activeTrackerKeys = new Set<string>();

export const useActivityTracker = ({
  userId,
  firebaseUid,
  organizationId,
}: ActivityTrackerConfig) => {
  const trackerKey = userId && organizationId ? `${userId}:${organizationId}` : null;
  const sessionStartRef = useRef<Date | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const updateIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  const isSessionEndedRef = useRef(false); // Prevenir finalizar múltiples veces
  const sessionUserIdRef = useRef<string | null>(null);
  const sessionOrganizationIdRef = useRef<string | null>(null);

  /**
   * Inicia una nueva sesión
   */
  const startSession = useCallback(async () => {
    if (!userId || !firebaseUid || !organizationId) {
      console.warn('useActivityTracker: Parámetros incompletos para iniciar sesión');
      return;
    }

    if (trackerKey && activeTrackerKeys.has(trackerKey)) {
      console.log('ℹ️ useActivityTracker: sesión ya activa en esta pestaña, no se reinicia');
      return;
    }

    try {
      isSessionEndedRef.current = false; // Reset cuando se inicia nueva sesión
      const data = await userActivityService.startSession(userId, firebaseUid, organizationId);
      sessionIdRef.current = data._id;
      sessionStartRef.current = new Date(data.session_start);
      sessionUserIdRef.current = userId;
      sessionOrganizationIdRef.current = organizationId;
      if (trackerKey) {
        activeTrackerKeys.add(trackerKey);
      }
      console.log('Sesión iniciada:', { sessionIdRef: sessionIdRef.current, startTime: sessionStartRef.current });
    } catch (error) {
      console.error('Error iniciando sesión:', error);
    }
  }, [userId, firebaseUid, organizationId, trackerKey]);

  /**
   * Finaliza la sesión actual
   */
  const endSession = useCallback(async (overrideUserId?: string | null, overrideOrganizationId?: string | null) => {
    // Prevenir finalizar múltiples veces
    if (isSessionEndedRef.current) {
      return;
    }

    const targetUserId = overrideUserId ?? sessionUserIdRef.current ?? userId;
    const targetOrganizationId =
      overrideOrganizationId ?? sessionOrganizationIdRef.current ?? organizationId;

    if (!targetUserId || !targetOrganizationId) {
      console.warn('useActivityTracker: Parámetros incompletos para finalizar sesión');
      return;
    }

    isSessionEndedRef.current = true;

    try {
      await userActivityService.endSession(targetUserId, targetOrganizationId);
      console.log('Sesión finalizada');
      sessionStartRef.current = null;
      sessionIdRef.current = null;
      sessionUserIdRef.current = null;
      sessionOrganizationIdRef.current = null;
      activeTrackerKeys.delete(`${targetUserId}:${targetOrganizationId}`);
    } catch (error) {
      console.error('Error finalizando sesión:', error);
    }
  }, [userId, organizationId]);

  /**
   * Actualiza el tiempo dedicado a un curso
   */
  const trackCourseTime = useCallback(
    async (courseId: string, eventId: string, timeDeltaMs: number) => {
      if (!userId || !organizationId || timeDeltaMs <= 0) {
        return;
      }

      try {
        await userActivityService.updateCourseTime(
          userId,
          organizationId,
          courseId,
          eventId,
          Math.round(timeDeltaMs),
        );
      } catch (error) {
        console.error('Error actualizando tiempo de curso:', error);
      }
    },
    [userId, organizationId],
  );

  /**
   * Actualiza el tiempo dedicado a una actividad
   */
  const trackActivityTime = useCallback(
    async (activityId: string, eventId: string, timeDeltaMs: number) => {
      if (!userId || !organizationId || timeDeltaMs <= 0) {
        return;
      }

      try {
        await userActivityService.updateActivityTime(
          userId,
          organizationId,
          activityId,
          eventId,
          Math.round(timeDeltaMs),
        );
      } catch (error) {
        console.error('Error actualizando tiempo de actividad:', error);
      }
    },
    [userId, organizationId],
  );

  /**
   * Obtiene la actividad actual del usuario
   */
  const getActiveActivity = useCallback(async () => {
    if (!userId || !organizationId) {
      return null;
    }

    try {
      return await userActivityService.getActiveActivity(userId, organizationId);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // No hay sesión activa
      }
      console.error('Error obteniendo actividad:', error);
      return null;
    }
  }, [userId, organizationId]);

  /**
   * Obtiene el último registro de actividad del usuario
   */
  const getLastActivity = useCallback(async () => {
    if (!userId || !organizationId) {
      return null;
    }

    try {
      return await userActivityService.getLastActivity(userId, organizationId);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error obteniendo última actividad:', error);
      return null;
    }
  }, [userId, organizationId]);

  /**
   * Obtiene el histórico de actividad del usuario
   */
  const getActivityHistory = useCallback(async () => {
    if (!userId || !organizationId) {
      return [];
    }

    try {
      return await userActivityService.getActivityHistory(userId, organizationId);
    } catch (error) {
      console.error('Error obteniendo histórico:', error);
      return [];
    }
  }, [userId, organizationId]);

  /**
   * Inicializa el rastreador al montar el componente
   */
  useEffect(() => {
    if (!userId || !firebaseUid || !organizationId || isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;
    console.log('🚀 useActivityTracker: Iniciando sesión para usuario', userId);
    startSession();

    // Detectar cuando el usuario cierra la ventana o abandona la página
    const handleBeforeUnload = () => {
      console.log('👋 beforeunload: Finalizando sesión');
      endSession(sessionUserIdRef.current, sessionOrganizationIdRef.current);
    };

    const handleUnload = () => {
      console.log('👋 unload: Finalizando sesión');
      endSession(sessionUserIdRef.current, sessionOrganizationIdRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    // Limpiar solo los event listeners, NO finalizar sesión
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);

      // Limpiar interval si existe
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      
      // NO finalizar sesión aquí - dejar que continúe en el servidor
      // La sesión se finalizará cuando se cierre la ventana (beforeunload/unload)
    };
  }, [userId, firebaseUid, organizationId, startSession, endSession]);

  /**
   * Finalizar sesión si el usuario hace logout
   */
  useEffect(() => {
    // Si no hay userId y teníamos sesión inicializada, es un logout
    if (!userId && isInitializedRef.current && !isSessionEndedRef.current) {
      console.log('🛑 Usuario deslogueado, finalizando sesión');
      isInitializedRef.current = false;
      endSession(sessionUserIdRef.current, sessionOrganizationIdRef.current);
    }
  }, [userId, endSession]);

  return {
    startSession,
    endSession,
    trackCourseTime,
    trackActivityTime,
    getActiveActivity,
    getLastActivity,
    getActivityHistory,
    sessionStartRef,
    sessionIdRef,
  };
};
