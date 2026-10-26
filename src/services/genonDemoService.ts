import api from "./api";
import type { GenOnMode, GenOnSegment } from "./genonService";

/** Demostración guiada de Gen.ON (backend: src/genon/genon-demo.*). */

export type GenOnDemoStageKey =
  | "abandon"
  | "inactive"
  | "active"
  | "recovery"
  | "exam"
  | "graduated";

export interface GenOnDemoStep {
  id: string;
  kind: "step" | "trigger";
  key: string;
  title: string;
  explain: string;
  expect: string;
  /** Cómo aparece en la bitácora de envíos ("1.1", "3.4 riesgo") */
  log_step: string;
  /** false: plantilla sin aprobar, reto sin configurar… (ver reason) */
  ready: boolean;
  reason: string | null;
}

export interface GenOnDemoStage {
  key: GenOnDemoStageKey;
  title: string;
  situation: string;
  explain: string;
  segment: GenOnSegment;
  steps: GenOnDemoStep[];
}

export interface GenOnDemoMessage {
  _id: string;
  step: string | null;
  template: string | null;
  text: string | null;
  at: string;
  status: string;
  meta_status: "sent" | "delivered" | "read" | "failed" | null;
  error: string | null;
  delivered_at: string | null;
  read_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  reply_text: string | null;
}

export interface GenOnDemoParticipant {
  user_id: string;
  name: string;
  phone: string | null;
  segment: GenOnSegment | null;
  expected_segment: GenOnSegment | null;
  progress: number;
  streak: number;
  abandon_reason: string | null;
  exited: boolean;
  exit_reason: string | null;
  awaiting_feedback: boolean;
  enrollment_id: string | null;
  messages: GenOnDemoMessage[];
  challenges: {
    activity_id: string;
    activity_name: string | null;
    at: string;
    passed: boolean;
    correct: number;
    total: number;
    kind?: "advance" | "review" | "video";
  }[];
  feedback: { type: "support" | "comment"; text: string; at: string }[];
}

export interface GenOnDemoFeedItem {
  at: string;
  user_id: string;
  name: string;
  type: string;
  text: string;
}

export interface GenOnDemoStatus {
  _id: string;
  name: string;
  event_id: string;
  event_name: string | null;
  stage: GenOnDemoStageKey | null;
  stage_prepared_at: string | null;
  created_at: string;
  sends: { step_id: string; user_id: string; at: string; ok: boolean; error: string | null }[];
  participants: GenOnDemoParticipant[];
  feed: GenOnDemoFeedItem[];
}

export interface GenOnDemoOverview {
  program_mode: GenOnMode;
  stages: GenOnDemoStage[];
  demo: GenOnDemoStatus | null;
}

export interface GenOnDemoSendResult {
  step_id: string;
  results: { user_id: string; name: string; ok: boolean; template: string | null; error: string | null }[];
}

const base = (programId: string) => `/genon/programs/${programId}/demo`;

export const fetchGenOnDemo = async (programId: string) =>
  (await api.get<GenOnDemoOverview>(base(programId))).data;

export const fetchGenOnDemoStatus = async (programId: string, demoId: string) =>
  (await api.get<GenOnDemoStatus>(`${base(programId)}/${demoId}`)).data;

export const createGenOnDemo = async (
  programId: string,
  body: { name: string; eventId?: string }
) => (await api.post<GenOnDemoStatus>(base(programId), body)).data;

export const deleteGenOnDemo = async (programId: string, demoId: string) =>
  (await api.delete<{ participants_deleted: number }>(`${base(programId)}/${demoId}`)).data;

export const addGenOnDemoParticipant = async (
  programId: string,
  demoId: string,
  body: { name: string; phone: string }
) => (await api.post<GenOnDemoStatus>(`${base(programId)}/${demoId}/participants`, body)).data;

export const removeGenOnDemoParticipant = async (
  programId: string,
  demoId: string,
  userId: string
) =>
  (await api.delete<GenOnDemoStatus>(`${base(programId)}/${demoId}/participants/${userId}`)).data;

export const prepareGenOnDemoStage = async (
  programId: string,
  demoId: string,
  stage: GenOnDemoStageKey
) => (await api.post<GenOnDemoStatus>(`${base(programId)}/${demoId}/stage`, { stage })).data;

export const sendGenOnDemoStep = async (
  programId: string,
  demoId: string,
  stepId: string,
  userIds?: string[]
) =>
  (await api.post<GenOnDemoSendResult>(`${base(programId)}/${demoId}/send`, { stepId, userIds }))
    .data;
