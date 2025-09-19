// src/services/paymentRequestsService.ts
import api from "./api";
import { OrganizationUser, PaymentPlan } from "./types";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "VOIDED"
  | "ERROR";

export interface PaymentRequestPayload {
  reference: string;
  userId: string;
  organizationUserId?: string;
  organizationId: string;
  amount: number;
  currency?: string; // opcional ('COP')
}

export interface PaymentRequest {
  _id: string;
  reference: string;
  userId: string;
  organizationUserId?: string;
  organizationId: string;
  amount: number;
  currency?: string;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentRequestRow = {
  reference: string;
  transactionId?: string;
  status: "CREATED" | "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR";
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  wompi_snapshots?: Array<{
    source: "webhook" | "poll" | "redirect" | "reconcile";
    at: string;
    payload: any;
  }>;
  rawWebhook?: any;

  organizationUser?: OrganizationUser | null;
  paymentPlan?: PaymentPlan | null;
};

// 1) Crear intento de pago
export const createPaymentRequest = async (
  data: PaymentRequestPayload
): Promise<PaymentRequest> => {
  const res = await api.post<PaymentRequest>("/payment-requests", {
    currency: "COP",
    ...data,
  });
  return res.data;
};

// 2) Obtener por reference
export const fetchPaymentRequestByReference = async (reference: string) => {
  const res = await api.get<PaymentRequest>(
    `/payment-requests/by-reference/${encodeURIComponent(reference)}`
  );
  return res.data ?? null;
};

// 3) Obtener por transactionId
export const fetchPaymentRequestByTransactionId = async (
  transactionId: string
) => {
  const res = await api.get<PaymentRequest>(
    `/payment-requests/by-transaction/${encodeURIComponent(transactionId)}`
  );
  return res.data ?? null;
};

export const linkTransaction = async (
  reference: string,
  transactionId: string
) => {
  await api.post(
    `/payment-requests/${encodeURIComponent(reference)}/link-transaction`,
    { transactionId }
  );
};

export async function searchPaymentRequests(params: {
  organizationId: string;
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}): Promise<{ items: any[]; total: number }> {
  const res = await api.get("/payment-requests/search", { params });
  return res.data;
}
