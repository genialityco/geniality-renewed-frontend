export interface AccessSettings {
  days: number;
  price: number;
  type: "free" | "payment";
}

export interface Organization {
  [x: string]: any;
  _id: string;
  name: string;
  author: string;
  description: string;
  access_settings: AccessSettings;
  visibility: "PUBLIC" | "PRIVATE";
}

export interface Event {
  created_at: string | number | Date;
  createdAt: any;
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
  create_at: string | number | Date;
  createAt: any;
  createdAt: any;
  created_at: string | number | Date;
  video_progress: number;
  module_id: string;
  _id: any;
  id: string;
  name: string;
  datetime_start?: string;
  datetime_end?: string;
  event_id: Event | string;
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
  transcript_available?: boolean;
  transcription_job_id?: string;
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
  [x: string]: any;
  _id: string;
  uid: string;
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
  user_id: string | User;
  event_id: Event;
  status?: string;
  progress: number;
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

export interface OrganizationUser {
  _id: string;
  properties: any;
  rol_id: string;
  organization_id: string;
  user_id: string | User;
  position_id: string;
  payment_plan_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentPlan {
  payment_request_id: any;
  _id: string;
  days: number;
  date_until: string;
  price: number;
  organization_user_id: string | OrganizationUser;
  created_at: string;
  updated_at: string;
}

export enum PropertyType {
  TEXT = "text",
  EMAIL = "email",
  BOOLEAN = "boolean",
  LIST = "list",
  CODEAREA = "codearea",
  COUNTRY = "country",
  CITY = "city",
}

// 2) La interfaz que describe cada propiedad de registro
export interface UserProperty {
  dependency: any;
  name: string;               // clave interna (p. ej. "ID", "pais", "phone"…)
  label: string;     
  unique: boolean,         // etiqueta para mostrar
  type: PropertyType;         // uno de los valores de PropertyType
  mandatory: boolean;         // si es obligatorio
  options?: {                 // solo para type === LIST
    label: string;
    value: string;
  }[];
  order_weight: number;
  index: number;
  visible: boolean;
}

export type ImportReportType = {
  created: any[];
  updated: any[];
  errors: any[];
};