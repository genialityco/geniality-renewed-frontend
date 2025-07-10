import api from "./api";

// Tipos básicos
export interface PaymentRequestPayload {
  reference: string;
  userId: string;
  organizationUserId?: string;
  organizationId: string;
  amount: number;
}

export interface PaymentRequest {
  _id: string;
  reference: string;
  userId: string;
  organizationUserId?: string;
  organizationId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR';
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

// 1. Crear un nuevo intento de pago
export const createPaymentRequest = async (
  data: PaymentRequestPayload
): Promise<PaymentRequest> => {
  const response = await api.post<PaymentRequest>("/payment-requests", data);
  return response.data;
};

// 2. Obtener por reference
export const fetchPaymentRequestByReference = async (
  reference: string
): Promise<PaymentRequest> => {
  const response = await api.get<PaymentRequest>(
    `/payment-requests/by-reference/${reference}`
  );
  return response.data;
};

// 3. Obtener por transactionId
export const fetchPaymentRequestByTransactionId = async (
  transactionId: string
): Promise<PaymentRequest> => {
  const response = await api.get<PaymentRequest>(
    `/payment-requests/by-transaction/${transactionId}`
  );
  return response.data;
};
