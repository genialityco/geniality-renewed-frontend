// src/api/index.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: API_URL });

// =============== Helpers de bandera para logout manual ===============
function isManualLogoutFlagSet() {
  return localStorage.getItem("manualLogout") === "1";
}
function clearManualLogoutFlag() {
  localStorage.removeItem("manualLogout");
}

// =============== Interceptor de Request ===============
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

// =============== Modal y control de una sola invocación ===============
let alreadyHandledSessionEnd = false;

function showSessionEndModal(message: string) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  const modal = document.createElement("div");
  modal.style.background = "#fff";
  modal.style.padding = "24px";
  modal.style.borderRadius = "12px";
  modal.style.maxWidth = "400px";
  modal.style.textAlign = "center";
  modal.style.fontFamily = "sans-serif";
  modal.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";

  const text = document.createElement("p");
  text.textContent = message;
  text.style.margin = "0";

  modal.appendChild(text);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Redirección diferida
  setTimeout(() => {
    localStorage.removeItem("myUserInfo");
    window.location.href = "/organization/63f552d916065937427b3b02"; // ajusta la ruta si aplica
  }, 3000);
}

function handleSessionEndOnce() {
  if (alreadyHandledSessionEnd) return;
  alreadyHandledSessionEnd = true;

  try {
    if ("BroadcastChannel" in window) {
      new BroadcastChannel("session").postMessage("revoked");
    }
  } catch {}
  localStorage.removeItem("myUserInfo");
  showSessionEndModal(
    "Tu cuenta se abrió en un nuevo dispositivo. Esta sesión se cerrará porque superaste el límite de 2 dispositivos. Si no reconoces este inicio de sesión, por favor cambia tu contraseña por seguridad"
  );
}

// =============== Interceptor de Response ===============
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message = (error?.response?.data?.message || "").toString();

    // Solo tratamos como "máximo de dispositivos" cuando el backend lo indica claramente
    const isMaxDevices = status === 401 && message === "SESSION_EXPIRED";

    // Si el cierre fue manual (bandera marcada desde el botón), NO mostrar modal.
    if (isManualLogoutFlagSet()) {
      try {
        if ("BroadcastChannel" in window) {
          new BroadcastChannel("session").postMessage("manual-logout");
        }
      } catch {}
      localStorage.removeItem("myUserInfo");
      clearManualLogoutFlag();
      // Redirige aquí si quieres que sea centralizado desde el interceptor:
      window.location.href = "/organization/63f552d916065937427b3b02";
      return Promise.reject(error);
    }

    if (isMaxDevices) {
      handleSessionEndOnce();
      return Promise.reject(new Error("SESSION_EXPIRED"));
    }

    // Otros 401/errores: no dispares modal
    return Promise.reject(error);
  }
);

export default api;
