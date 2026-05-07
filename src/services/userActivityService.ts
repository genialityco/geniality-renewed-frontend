import api from './api';

/**
 * Servicio para rastrear actividad del usuario
 */

export const userActivityService = {
  /**
   * Inicia una nueva sesión de usuario
   */
  async startSession(userId: string, firebaseUid: string, organizationId: string) {
    const response = await api.post('/user-activity/session-start', {
      user_id: userId,
      firebase_uid: firebaseUid,
      organization_id: organizationId,
    });
    return response.data;
  },

  /**
   * Finaliza la sesión del usuario
   */
  async endSession(userId: string, organizationId: string) {
    const response = await api.post('/user-activity/session-end', {
      user_id: userId,
      organization_id: organizationId,
    });
    return response.data;
  },

  /**
   * Actualiza el tiempo dedicado a un curso
   */
  async updateCourseTime(
    userId: string,
    organizationId: string,
    courseId: string,
    eventId: string,
    timeDeltaMs: number,
    courseName?: string,
  ) {
    const response = await api.post('/user-activity/update-course-time', {
      user_id: userId,
      organization_id: organizationId,
      course_id: courseId,
      event_id: eventId,
      time_delta_ms: timeDeltaMs,
      course_name: courseName,
    });
    return response.data;
  },

  /**
   * Actualiza el tiempo dedicado a una actividad
   */
  async updateActivityTime(
    userId: string,
    organizationId: string,
    activityId: string,
    eventId: string,
    timeDeltaMs: number,
    activityName?: string,
  ) {
    const response = await api.post('/user-activity/update-activity-time', {
      user_id: userId,
      organization_id: organizationId,
      activity_id: activityId,
      event_id: eventId,
      time_delta_ms: timeDeltaMs,
      activity_name: activityName,
    });
    return response.data;
  },

  /**
   * Obtiene el registro de actividad actual del usuario
   */
  async getActiveActivity(userId: string, organizationId: string) {
    const response = await api.get(`/user-activity/active/${userId}/${organizationId}`);
    return response.data;
  },

  /**
   * Obtiene el último registro de actividad del usuario
   */
  async getLastActivity(userId: string, organizationId: string) {
    const response = await api.get(`/user-activity/last/${userId}/${organizationId}`);
    return response.data;
  },

  /**
   * Obtiene el histórico de actividad del usuario
   */
  async getActivityHistory(userId: string, organizationId: string) {
    const response = await api.get(`/user-activity/history/${userId}/${organizationId}`);
    return response.data;
  },
};
