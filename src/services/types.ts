export interface AccessSettings {
  days: number;
  price: number;
  type: "free" | "payment";
}

export interface Organization {
  _id: string;
  name: string;
  author: string;
  description: string;
  access_settings: AccessSettings;
  visibility: "PUBLIC" | "PRIVATE";
}

export interface Event {
  created_at: string | number | Date;
  styles: any;
  _id: string;
  name: string;
  address?: string;
  type_event: "onlineEvent" | "inPerson";
  datetime_from: string;
  datetime_to: string;
  picture?: string;
  venue?: string;
  location?: string;
  visibility: "PUBLIC" | "PRIVATE";
  description?: string;
  allow_register: boolean;
  organizer_id: string;
  author_id: string;
  position_ids?: string[];
  event_platform?: "zoom" | "google_meet" | "microsoft_teams";
  language?: string;
}

export interface Module {
  videos: boolean;
  _id: string;
  module_name: string;
  order: number;
  event_id: string;
  updated_at: string;
  created_at: string;
}

export interface Activity {
  video_progress: number;
  module_id: string;
  _id: any;
  id: string;
  name: string;
  datetime_start?: string;
  datetime_end?: string;
  event_id: Event;
  date_start_zoom?: string;
  date_end_zoom?: string;
  description?: string;
  short_description?: string;
  host_ids: string[];
  video?: string;
  is_info_only: boolean;
  selected_document: string[];
  type_id?: string;
  transcription_id?: string;
}

export interface GenerateGameRequest {
  gameType: string;
  transcript: string;
}

export interface GenerateGameResponse {
  gameContent: string[];
}

export interface Host {
  _id: string;
  name: string;
  image: string;
  description_activity: boolean;
  description: string;
  profession?: string | null;
  published: boolean;
  order: number;
  index: number;
  event_id: string;
  activities_ids: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  firebase_uid: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityAttendee {
  _id: string;
  user_id: string;
  activity_id: string;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CourseAttendee {
  _id: string;
  user_id: string;
  event_id: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}


// Interfaz en TypeScript para tu Quiz
export interface Quiz {
  _id: string;
  activity_id: string;      // ID de la actividad
  quiz_json: any;           // El JSON de Survey
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizAttempt {
  _id: string;
  quiz_id: string;
  user_id: string;
  attempt_number: number;
  answers_data: any;
  total_score: number;
  max_score: number;
  createdAt?: string | number | Date;
  updatedAt?: string;
}