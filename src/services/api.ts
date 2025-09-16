// src/api/index.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || ""; // fallback relativo
const api = axios.create({ baseURL: API_URL });

// ⇢ Request interceptor: adjunta uid y sessionToken
api.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem("myUserInfo");
      if (raw) {
        const { uid, sessionToken } = JSON.parse(raw) as {
          uid?: string;
          sessionToken?: string;
        };
        config.headers = config.headers ?? {};
        if (uid) (config.headers as any)["x-uid"] = uid;
        if (sessionToken)
          (config.headers as any)["x-session-token"] = sessionToken;
      }
    } catch {
      // Si no se puede parsear, limpia para evitar loops
      localStorage.removeItem("myUserInfo");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ⇢ Response interceptor: expulsa si el token ya no es válido (deduplicado)
let alreadyHandledSessionEnd = false;

function handleSessionEndOnce() {
  if (alreadyHandledSessionEnd) return;
  alreadyHandledSessionEnd = true;

  try {
    // avisa a otras pestañas (opcional)
    if ("BroadcastChannel" in window) {
      new BroadcastChannel("session").postMessage("revoked");
    }
  } catch {}

  localStorage.removeItem("myUserInfo");
  alert("Tu cuenta ya está activa en 2 dispositivos. Para poder continuar en este, cerraremos automáticamente la sesión más antigua.");
  window.location.reload();
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message = (error?.response?.data?.message || "").toString();

    // Trata como sesión inválida cualquiera de estos casos
    const isSessionExpired =
      status === 401 &&
      (message === "SESSION_EXPIRED" ||
        message === "No autenticado" ||
        message === "Unauthorized");

    if (isSessionExpired) {
      handleSessionEndOnce();
      return Promise.reject(new Error("SESSION_EXPIRED"));
    }

    return Promise.reject(error);
  }
);

export default api;
