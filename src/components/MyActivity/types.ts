/**
 * Tipos para el componente MyActivity
 */

export interface CourseTime {
  course_id: string;
  event_id: string;
  course_name?: string;
  time_spent_ms: number;
  last_updated: string;
}

export interface ActivityTime {
  activity_id: string;
  event_id: string;
  activity_name?: string;
  time_spent_ms: number;
  last_updated: string;
}

export interface UserActivity {
  _id: string;
  user_id: string;
  firebase_uid: string;
  organization_id: string;
  session_start: string;
  session_end: string | null;
  session_duration_ms: number;
  courses: CourseTime[];
  activities: ActivityTime[];
  total_courses_time_ms: number;
  total_activities_time_ms: number;
  last_updated: string;
  is_active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
