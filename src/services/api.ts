// src/api/index.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "";
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

// ====== Modal mínimo para logout exitoso ======
let logoutModalShown = false;
function showLogoutModalOnce() {
  if (logoutModalShown) return;
  logoutModalShown = true;

  try {
    localStorage.removeItem("myUserInfo");
  } catch {}

  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,.5);
    display: flex; align-items: center; justify-content: center; z-index: 9999;
  `;
  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white; padding: 28px 32px; border-radius: 10px;
    box-shadow: 0 8px 30px rgba(0,0,0,.2); text-align: center; min-width: 240px;
  `;
  const p = document.createElement("p");
  p.textContent = "Sesión cerrada correctamente";
  p.style.cssText = `margin:0; font-size:18px; font-weight:600; color:#111;`;
  modal.appendChild(p);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  setTimeout(() => window.location.reload(), 1600);
}

// Detecta éxito de logout en más escenarios (200/204, success: true, msg con "logout")
function isLogoutSuccess(response: any): boolean {
  const url = response?.config?.url || "";
  const status = Number(response?.status || 0);
  const isLogoutEndpoint = /\/users\/logout(?:$|[/?#])/i.test(url);
  if (!isLogoutEndpoint) return false;

  if (status === 204) return true;

  if (status >= 200 && status < 300) {
    const data = response?.data ?? {};
    const msg = ((data?.message || data?.msg || "") + "").toUpperCase().trim();
    const ok = data?.success === true;
    if (ok) return true;
    if (msg === "LOGOUT_SUCCESS") return true;
    if (/LOGOUT/.test(msg)) return true;
    if (!data || Object.keys(data).length === 0) return true;
  }
  return false;
}

// ⇢ Response interceptor: SOLO modal en logout exitoso
api.interceptors.response.use(
  (response) => {
    if (isLogoutSuccess(response)) {
      try {
        if ("BroadcastChannel" in window) {
          new BroadcastChannel("session").postMessage("logout");
        }
      } catch {}
      showLogoutModalOnce(); // ← ÚNICO modal
    }
    return response;
  },
  async (error) => {
    // Importante: aquí NO mostramos modal. El alert lo maneja tu signOut catch.
    return Promise.reject(error);
  }
);

export default api;
