import api from "./api";
import { CourseAttendee } from "./types";

export interface CourseAttendeePayload {
  user_id: string;
  event_id: string;
  status?: string;
  progress?: number;
}

export const fetchAllCourseAttendees = async (): Promise<CourseAttendee[]> => {
  const response = await api.get<CourseAttendee[]>("/course-attendees");
  return response.data;
};

export const fetchCourseAttendeeById = async (
  id: string
): Promise<CourseAttendee> => {
  const response = await api.get<CourseAttendee>(`/course-attendees/${id}`);
  return response.data;
};

export const fetchCourseAttendeesByUser = async (
  userId: string
): Promise<CourseAttendee[]> => {
  const response = await api.get<CourseAttendee[]>(
    `/course-attendees/user/${userId}`
  );
  return response.data;
};

export const createCourseAttendee = async (
  attendee: Partial<CourseAttendee>
): Promise<CourseAttendee> => {
  const response = await api.post<CourseAttendee>(
    "/course-attendees",
    attendee
  );
  return response.data;
};

export const updateCourseAttendee = async (
  id: string,
  attendee: Partial<CourseAttendee>
): Promise<CourseAttendee> => {
  const response = await api.put<CourseAttendee>(
    `/course-attendees/${id}`,
    attendee
  );
  return response.data;
};

export const deleteCourseAttendee = async (
  id: string
): Promise<CourseAttendee> => {
  const response = await api.delete<CourseAttendee>(`/course-attendees/${id}`);
  return response.data;
};

export const createOrUpdateCourseAttendee = async (
  data: CourseAttendeePayload
): Promise<CourseAttendee> => {
  const response = await api.post<CourseAttendee>(
    "/course-attendees/create-or-update",
    data
  );
  return response.data;
};
