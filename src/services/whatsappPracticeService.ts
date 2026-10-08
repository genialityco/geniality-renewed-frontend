import api from "./api";
import { ActivityQuestionType, QuestionOption, QuestionPair } from "./activityQuestionService";

/** Simulacros de práctica por WhatsApp (backend: ai-evaluations/practice). */

export interface WhatsappOptIn {
  opt_in: boolean;
  opt_in_at: string | null;
  has_phone: boolean;
  phone_masked: string | null;
}

export type PracticeSessionStatus =
  | "invited"
  | "choosing"
  | "in_progress"
  | "completed"
  | "declined"
  | "cancelled"
  | "expired";

export interface PracticePreview {
  student: {
    user_id: string;
    name: string;
    email: string;
    has_phone: boolean;
    phone_masked: string | null;
    opt_in: boolean;
  };
  min_progress: number;
  courses: {
    event_id: string;
    event_name: string;
    questions: number;
    activities: { activity_id: string; name: string; progress: number; questions: number }[];
  }[];
  total_questions: number;
  active_session: { id: string; status: PracticeSessionStatus; created_at: string } | null;
}

export interface PracticeSendInput {
  email: string;
  num_questions?: number;
  min_progress?: number;
  /** Curso del simulacro (obligatorio al enviar; en la vista previa, opcional) */
  event_id?: string;
}

export interface PracticeSendResult {
  session_id: string;
  status: PracticeSessionStatus;
  invite_channel: "template" | "interactive";
  questions: number;
  courses: string[];
  /** Actividades recientes entre las que el estudiante elegirá al empezar */
  activities?: string[];
  phone_masked: string | null;
}

export interface PracticeSessionSummary {
  _id: string;
  user_name: string;
  email: string;
  status: PracticeSessionStatus;
  invite_channel: "template" | "interactive" | null;
  /** manual: lo envió un admin · auto: repaso automático */
  trigger?: "manual" | "auto" | "student";
  /** whatsapp: simulacro por WhatsApp · web: "Evaluar mis conocimientos" en la plataforma */
  channel?: "whatsapp" | "web";
  total_questions: number;
  answered_count: number | null;
  correct_count: number | null;
  score: number | null;
  courses: string[];
  invited_at: string;
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

export interface PracticeSessionDetail {
  _id: string;
  user_name: string;
  email: string;
  status: PracticeSessionStatus;
  score: number | null;
  correct_count: number | null;
  answered_count: number | null;
  questions: {
    question_id: string;
    activity_name: string;
    event_name: string;
    type: ActivityQuestionType;
    question: string;
    answer: string;
    options: QuestionOption[];
    pairs: QuestionPair[];
    explanation: string;
    topic: string;
    start_time: number | null;
    response: {
      raw: string;
      score: number;
      correct: boolean;
      skipped: boolean;
      feedback: string;
      answered_at: string;
    } | null;
  }[];
  messages: { role: "user" | "assistant"; content: string; created_at: string }[];
  invited_at: string;
  started_at?: string;
  finished_at?: string;
}

// ─── Estudiante ──────────────────────────────────────────────────────────

const meBase = (organizationId: string) =>
  `/whatsapp-practice/me/organization/${organizationId}/opt-in`;

export const fetchWhatsappOptIn = async (organizationId: string) => {
  const r = await api.get<WhatsappOptIn>(meBase(organizationId));
  return r.data;
};

export const saveWhatsappOptIn = async (organizationId: string, optIn: boolean) => {
  const r = await api.put<WhatsappOptIn>(meBase(organizationId), { opt_in: optIn });
  return r.data;
};

// ─── Admin ───────────────────────────────────────────────────────────────

const adminBase = (organizationId: string) =>
  `/whatsapp-practice/organization/${organizationId}`;

export const previewPractice = async (organizationId: string, data: PracticeSendInput) => {
  const r = await api.post<PracticePreview>(`${adminBase(organizationId)}/preview`, data);
  return r.data;
};

export const sendPractice = async (organizationId: string, data: PracticeSendInput) => {
  const r = await api.post<PracticeSendResult>(`${adminBase(organizationId)}/send`, data);
  return r.data;
};

export const fetchPracticeSessions = async (organizationId: string, email?: string) => {
  const r = await api.get<PracticeSessionSummary[]>(`${adminBase(organizationId)}/sessions`, {
    params: email ? { email } : undefined,
  });
  return r.data;
};

export const fetchPracticeSession = async (organizationId: string, sessionId: string) => {
  const r = await api.get<PracticeSessionDetail>(
    `${adminBase(organizationId)}/sessions/${sessionId}`
  );
  return r.data;
};

/** Organizaciones que administra el usuario (donde puede enviar simulacros). */
export const fetchPracticeAdminOrganizations = async () => {
  const r = await api.get<{ _id: string; name: string }[]>(
    "/whatsapp-practice/admin-organizations"
  );
  return r.data;
};
