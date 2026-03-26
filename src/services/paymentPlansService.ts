import api from "./api";
import { PaymentPlan } from "./types";

export interface PaymentPlanPayload {
  days: number;
  date_until: string; 
  price: number;
  organization_user_id: string;
  payment_request_id?: string;
  source?: string; 
}

/**
 * Crea un PaymentPlan y, según la lógica del backend, actualiza el OrganizationUser.
 */
export const createPaymentPlan = async (
  data: PaymentPlanPayload
): Promise<PaymentPlan> => {
  const response = await api.post<PaymentPlan>("/payment-plans", data);
  return response.data;
};

/**
 * Valida el acceso del usuario según su PaymentPlan.
 */
export const validatePaymentPlanAccess = async (
  organizationUserId: string
): Promise<{ access: boolean }> => {
  const response = await api.get<{ access: boolean }>(
    `/payment-plans/validate/${organizationUserId}`
  );
  return response.data;
};

export const fetchPaymentPlanByUserId = async (
  userId: string
): Promise<PaymentPlan> => {
  const response = await api.get<PaymentPlan>(
    `/payment-plans/by-user/${userId}`
  );
  return response.data;
};

export interface SubscriptionReport {
  totalPaid: number;
  totalActive: number;
  totalExpired: number;
  totalRenewals: number;
  renewalsGateway: number;
  renewalsMigrated: number;
  activeNotRenewed: number;
  activeRenewed: number;
  totalUnpaid: number;
  bySource: { gateway: number; admin: number; manual: number };
  platformPayments: number;
  migratedPayments: number;
  generatedAt: string;
}

/**
 * Obtiene el reporte de suscripciones de una organización.
 */
export const fetchSubscriptionReport = async (
  organizationId: string
): Promise<SubscriptionReport> => {
  const response = await api.get<SubscriptionReport>(
    `/payment-plans/report/${organizationId}`
  );
  return response.data;
};

// ── Reconciliación Wompi ─────────────────────────────────────────────────

export interface WompiTransactionRow {
  transactionId: string;
  reference: string | null;
  status: string;
  amount: number;
  currency: string;
  customerEmail: string | null;
  paymentMethodType: string | null;
  wompiCreatedAt: string | null;
  paymentRequest: { _id: string; reference: string; status: string } | null;
  organizationUser: {
    _id: string;
    email: string | null;
    identification: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  paymentPlan: {
    _id: string;
    status: "active" | "expired";
    date_until: string;
    price: number;
    source: string;
  } | null;
  matchedBy:
    | "reference"
    | "transaction_id_on_pr"
    | "transaction_id_on_plan"
    | "email"
    | null;
  dbStatus: "fully_linked" | "has_user_no_plan" | "no_db_match";
}

export interface PlanWithoutWompiRow {
  paymentPlanId: string;
  organizationUserId: string;
  email: string | null;
  identification: string | null;
  firstName: string | null;
  lastName: string | null;
  source: string;
  status: "active" | "expired";
  date_until: string;
  price: number;
  transactionId: string | null;
  payment_request_id: string | null;
  created_at: string;
}

export interface WompiReconcileResult {
  summary: {
    wompiTotal: number;
    fullyLinked: number;
    hasUserNoPlan: number;
    noDbMatch: number;
    matchedPlans: number;
    plansWithoutWompi: number;
    totalPlans: number;
    generatedAt: string;
  };
  wompiTransactions: WompiTransactionRow[];
  plansWithoutWompi: PlanWithoutWompiRow[];
}

// ── Clasificación completa ───────────────────────────────────────────────

export type SubscriptionClassification =
  | "pagado_sin_renovar"
  | "pagado_renovado_pagando"
  | "pagado_renovado_cortesia"
  | "cortesia_sin_renovar"
  | "cortesia_renovada_pagando"
  | "cortesia_renovada_cortesia"
  | "sin_plan";

export interface ClassificationWompiPayment {
  transactionId: string | null;
  reference: string | null;
  amount: number;
  paymentDate: string | null;
  isOriginalPeriod: boolean;
}

export interface ClassificationItem {
  organizationUserId: string;
  email: string | null;
  identification: string | null;
  firstName: string | null;
  lastName: string | null;
  paymentPlan: {
    _id: string;
    status: "active" | "expired";
    date_until: string;
    price: number;
    source: string;
    created_at: string;
    days: number;
    isRenewed: boolean;
  } | null;
  wompiPayments: ClassificationWompiPayment[];
  classification: SubscriptionClassification;
}

export interface FullClassificationSummary extends Record<SubscriptionClassification, number> {
  total: number;
  generatedAt: string;

  // Totales por estado de plan
  totalWithPlan: number;
  totalActive: number;
  totalExpired: number;

  // Renovación sobre TODOS los que tienen plan (activos + vencidos)
  totalRenewed: number;
  totalNotRenewed: number;
  renewedActive: number;
  renewedExpired: number;
  notRenewedActive: number;
  notRenewedExpired: number;
  // Cruce renovación × fuente de pago
  totalRenewed_conWompi: number;
  totalRenewed_sinWompi: number;
  totalNotRenewed_conWompi: number;
  totalNotRenewed_sinWompi: number;
  // Triple cruce: renovación × fuente × estado
  renewedActive_conWompi: number;
  renewedActive_sinWompi: number;
  renewedExpired_conWompi: number;
  renewedExpired_sinWompi: number;
  notRenewedActive_conWompi: number;
  notRenewedActive_sinWompi: number;
  notRenewedExpired_conWompi: number;
  notRenewedExpired_sinWompi: number;

  // Histórico total (activos + vencidos) — comparable con reconciliación Wompi
  totalConWompi: number;
  totalSinWompi: number;

  // De los activos: fuente de pago (wompiPayments.length > 0 como fuente de verdad)
  activePagaron: number;
  activeCortesia: number;

  // De los activos con pago Wompi — desglose
  activePagaron_sinRenovar: number;
  activePagaron_renovaronPagando: number;
  activePagaron_renovaronCortesia: number;
  activePagaron_cortesiaRenovoPagando: number;

  // De los activos sin pago Wompi
  activeCortesia_sinRenovar: number;
  activeCortesia_renovaronCortesia: number;

  // De los vencidos
  expiredConWompi: number;
  expiredSinWompi: number;
}

export interface UnmatchedWompiTransaction {
  transactionId: string | null;
  customerEmail: string | null;
  reference: string | null;
  amount: number;
  createdAt: string | null;
}

export interface FullClassificationResult {
  summary: FullClassificationSummary;
  items: ClassificationItem[];
  unmatchedWompiTransactions: UnmatchedWompiTransaction[];
}

export const fetchFullClassification = async (
  organizationId: string,
  fromDate = "2023-01-01T00:00:00Z",
  amountCOP = 50000
): Promise<FullClassificationResult> => {
  const response = await api.get<FullClassificationResult>(
    "/wompi/full-classification",
    { params: { organizationId, from_date: fromDate, amountCOP } }
  );
  return response.data;
};

export const fetchWompiReconcileReport = async (params: {
  organizationId: string;
  from_date: string;
  until_date: string;
  status?: string;
  amountCOP?: number;
}): Promise<WompiReconcileResult> => {
  const response = await api.get<WompiReconcileResult>(
    "/wompi/reconcile-report",
    { params }
  );
  return response.data;
};

/**
 * Actualiza el campo date_until de un PaymentPlan.
 */
export const updatePaymentPlanDateUntil = async (
  paymentPlanId: string,
  date_until: string,
  nameUser: string,
  source?: string
): Promise<PaymentPlan> => {
  const response = await api.patch<PaymentPlan>(
    `/payment-plans/${paymentPlanId}/date-until`,
    { date_until, nameUser, source }
  );
  return response.data;
};
