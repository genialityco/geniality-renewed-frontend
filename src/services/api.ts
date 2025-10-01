// src/api/index.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";
const api = axios.create({ baseURL: API_URL });

// ⇢ Request interceptor
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

let alreadyHandledSessionEnd = false;

// 👉 Modal simple sin botón
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

  // opcional: redirigir después de unos segundos
  setTimeout(() => {
    localStorage.removeItem("myUserInfo");
    window.location.href = "/organization/63f552d916065937427b3b02"; // ajusta la ruta
  }, 3000); // 3 segundos
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

  showSessionEndModal("Sesión finalizada.");
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message = (error?.response?.data?.message || "").toString();

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
