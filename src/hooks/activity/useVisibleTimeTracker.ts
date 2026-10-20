import { useEffect, useCallback, useState } from 'react';
import { useTimeTracker } from './useTimeTracker';

interface VisibleTimeTrackerConfig {
  userId: string | null;
  organizationId: string;
  courseId?: string;
  eventId?: string;
  courseName?: string;
  activityId?: string;
  activityName?: string;
}

/**
 * Hook que rastrea el tiempo SOLO mientras la pestaña está visible.
 *
 * No se pausa cuando la ventana pierde el foco: al hacer clic en el
 * reproductor (iframe de Vimeo/Bunny/YouTube) la página dispara `blur`, y
 * antes eso detenía el conteo durante todo el video.
 */
export const useVisibleTimeTracker = ({
  userId,
  organizationId,
  courseId,
  eventId,
  courseName,
  activityId,
  activityName,
}: VisibleTimeTrackerConfig) => {
  const [isPageVisible, setIsPageVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );
  const [isPaused, setIsPaused] = useState(false);

  const isActive = isPageVisible && !isPaused;

  const timeTracker = useTimeTracker({
    userId,
    organizationId,
    courseId,
    eventId,
    courseName,
    activityId,
    activityName,
    isActive,
  });

  /**
   * Detectar cuando el usuario cambia de tab
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return {
    isActive,
    isPageVisible,
    isPaused,
    pauseTracking: useCallback(() => setIsPaused(true), []),
    resumeTracking: useCallback(() => setIsPaused(false), []),
    getElapsedTime: timeTracker.getElapsedTime,
    resetTime: timeTracker.resetTime,
    syncTime: timeTracker.syncTime,
  };
};
