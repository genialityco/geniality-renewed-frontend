// src/api/index.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ⇢ Request interceptor: adjunta uid y sessionToken
api.interceptors.request.use(
  (config) => {
    const raw = localStorage.getItem("myUserInfo");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { uid?: string; sessionToken?: string };
        // Asegura objeto headers
        config.headers = config.headers ?? {};
        if (parsed.uid) {
          (config.headers as any)["x-uid"] = parsed.uid;
        }
        if (parsed.sessionToken) {
          (config.headers as any)["x-session-token"] = parsed.sessionToken;
        }
      } catch {
        // Si algo falla al parsear, ignora y continúa
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ⇢ Response interceptor: expulsa si el token ya no es válido
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message;

    if (status === 401 && message === "SESSION_EXPIRED") {
      localStorage.removeItem("myUserInfo");
      alert("Tu sesión fue cerrada porque se inició en otro dispositivo.");
      // Redirige o recarga según tu flujo:
      // window.location.href = "/login";
      window.location.reload();
      // Importante: corta la cadena aquí para no propagar el error original
      return Promise.reject(new Error("SESSION_EXPIRED"));
    }
    return Promise.reject(error);
  }
);

export default api;
