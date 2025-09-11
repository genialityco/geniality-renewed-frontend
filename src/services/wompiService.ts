// src/services/wompiService.ts
import api from "./api";

// 1) Firma de integridad para el checkout
export const getIntegritySignature = async (opts: {
  reference: string;
  amountInCents: number;
  currency?: string; // 'COP'
  expirationTime?: string; // opcional
}): Promise<string> => {
  const { reference, amountInCents, currency = "COP", expirationTime } = opts;
  const res = await api.get<{ signature: string }>(
    "/wompi/integrity-signature",
    {
      params: { reference, amountInCents, currency, expirationTime },
    }
  );
  return res.data.signature;
};

// 2) Sincronizar por transactionId (acelera conciliación)
export const syncTransactionById = async (transactionId: string) => {
  const res = await api.get(`/wompi/transactions/${transactionId}/sync`);
  return res.data; // puede devolver el PaymentRequest actualizado (si así lo programaste)
};

// 3) (opcional) helper para construir la URL del checkout
export const buildCheckoutUrl = (opts: {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency?: string; // 'COP'
  integritySignature: string;
  redirectUrl: string;
}) => {
  const {
    publicKey,
    reference,
    amountInCents,
    currency = "COP",
    integritySignature,
    redirectUrl,
  } = opts;

  const redirect = encodeURIComponent(redirectUrl);
  return `https://checkout.wompi.co/p/?public-key=${publicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${integritySignature}&redirect-url=${redirect}`;
};
