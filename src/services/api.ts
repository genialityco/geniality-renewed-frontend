// src/api/index.ts
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Agrega el sessionToken a cada request
// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     // Si el backend responde con 401 y SESSION_EXPIRED
//     if (
//       error.response &&
//       error.response.status === 401 &&
//       error.response.data?.message === "SESSION_EXPIRED"
//     ) {
//       // Limpia la sesión, muestra alerta y redirige
//       localStorage.removeItem("myUserInfo");
//       // Opcional: window.location = '/login';
//       alert("Tu sesión fue cerrada porque se inició en otro dispositivo.");
//       // Puedes recargar o redirigir como prefieras
//       window.location.reload();
//       return;
//     }
//     // Otros errores siguen normal
//     return Promise.reject(error);
//   }
// );

export default api;
