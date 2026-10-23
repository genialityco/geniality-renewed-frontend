// src/services/authLinkService.ts
import api from "./api";

/** Parámetro de la URL con el token de acceso directo (enlaces de WhatsApp). */
export const LOGIN_PARAM = "login";

export interface AuthLinkRedeemResult {
  /** Token de Firebase para signInWithCustomToken */
  customToken: string;
  /** Token de sesión de la plataforma (header x-session-token) */
  sessionToken: string;
  organizationId: string;
  user: { _id: string; uid: string; names?: string; email?: string; phone?: string };
}

/** Canjea el token del enlace por una sesión. Falla si venció o no es válido. */
export const redeemAuthLink = async (token: string) =>
  (await api.post<AuthLinkRedeemResult>("/auth-links/redeem", { token })).data;
