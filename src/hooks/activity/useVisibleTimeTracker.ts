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
 * Hook que rastrea el tiempo SOLO cuando el usuario está activamente viendo
 * (tab visible y ventana en foco del navegador)
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
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // El tracker solo está activo si el tab es visible Y la ventana está en foco
  const isActive = isPageVisible && isWindowFocused && !isPaused;

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

  /**
   * Detectar cuando la ventana pierde/recupera el foco
   */
  useEffect(() => {
    const handleFocus = () => setIsWindowFocused(true);
    const handleBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return {
    isActive,
    isPageVisible,
    isWindowFocused,
    isPaused,
    pauseTracking: useCallback(() => setIsPaused(true), []),
    resumeTracking: useCallback(() => setIsPaused(false), []),
    getElapsedTime: timeTracker.getElapsedTime,
    resetTime: timeTracker.resetTime,
    syncTime: timeTracker.syncTime,
  };
};
