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
      localStorage.removeItem("myUserInfo");
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ⇢ Response interceptor: expulsa si el token ya no es válido (deduplicado)
let alreadyHandledSessionEnd = false;

function handleSessionEnd(reason: "logout" | "revoked") {
  if (alreadyHandledSessionEnd) return;
  alreadyHandledSessionEnd = true;

  try {
    // avisa a otras pestañas (opcional)
    if ("BroadcastChannel" in window) {
      new BroadcastChannel("session").postMessage(reason);
    }
  } catch {}

  localStorage.removeItem("myUserInfo");
  showSessionEndModal(reason);
}

function showSessionEndModal(reason: "logout" | "revoked") {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    padding: 32px;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 400px;
  `;

  const message = document.createElement("p");
  message.style.cssText = `
    margin: 0;
    font-size: 18px;
    font-weight: 500;
    color: #333;
  `;

  // Mensaje según el tipo de cierre de sesión
  if (reason === "logout") {
    message.textContent = "Sesión cerrada correctamente";
  } else {
    message.textContent =
      "Tu sesión se cerró porque iniciaste en otro dispositivo";
  }

  modal.appendChild(message);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  setTimeout(() => {
    window.location.reload();
  }, 2000);
}

api.interceptors.response.use(
  (response) => {
    // Detectar logout exitoso
    const message = response?.data?.message || "";
    if (
      message === "LOGOUT_SUCCESS" ||
      response.config?.url?.includes("/logout")
    ) {
      handleSessionEnd("logout");
    }
    return response;
  },
  async (error) => {
    const status = error?.response?.status;
    const message = (error?.response?.data?.message || "").toString();

    // Detectar sesión revocada por otro dispositivo
    const isSessionRevoked =
      status === 401 &&
      (message === "SESSION_REVOKED" ||
        message === "SESSION_EXPIRED" ||
        message === "No autenticado" ||
        message === "Unauthorized");

    if (isSessionRevoked) {
      handleSessionEnd("revoked");
      return Promise.reject(new Error("SESSION_REVOKED"));
    }

    return Promise.reject(error);
  }
);

export default api;
