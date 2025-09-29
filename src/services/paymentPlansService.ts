import api from "./api";
import { PaymentPlan } from "./types";

export interface PaymentPlanPayload {
  days: number;
  date_until: string; 
  price: number;
  organization_user_id: string;
  payment_request_id?: string;
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

/**
 * Actualiza el campo date_until de un PaymentPlan.
 */
export const updatePaymentPlanDateUntil = async (
  paymentPlanId: string,
  date_until: string,
  nameUser: string
): Promise<PaymentPlan> => {
  const response = await api.patch<PaymentPlan>(
    `/payment-plans/${paymentPlanId}/date-until`,
    { date_until, nameUser }
  );
  return response.data;
};
