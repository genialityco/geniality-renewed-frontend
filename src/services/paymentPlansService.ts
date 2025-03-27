import api from "./api";
import { PaymentPlan } from "./types";

export interface PaymentPlanPayload {
  days: number;
  date_until: string; // Debe estar en formato ISO (string)
  price: number;
  organization_user_id: string;
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
