// userService.ts
import api from "./api";
import { User } from "./types";

/**
 * Obtiene un usuario por su firebase_uid (GET /users/firebase/:uid)
 */
export const fetchUserByFirebaseUid = async (uid: string): Promise<User> => {
  const response = await api.get<User>(`/users/firebase/${uid}`);
  return response.data;
};

/**
 * Obtiene un usuario por su teléfono (GET /users/phone/:phone)
 */

export const getUserByPhone = async (phone: string): Promise<User | null> => {
  try {
    const response = await api.get<User>(`/users/phone/${phone}`);
    return response.data;
  } catch (error: any) {
    // Si el backend responde 404, axios pone status aquí
    if (error.response && error.response.status === 404) {
      return null; // No existe usuario
    }
    throw error; // Otros errores (red, 500, etc.)
  }
};

/**
 * Obtiene la lista de todos los usuarios (GET /users)
 */
export const fetchAllUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>("/users");
  return response.data;
};

/**
 * Obtiene un usuario por su ID (GET /users/:id)
 */
export const fetchUserById = async (id: string): Promise<User> => {
  const response = await api.get<User>(`/users/${id}`);
  return response.data;
};

/**
 * Crea o actualiza un usuario (POST /users)
 * Recibe los campos que espera tu backend:
 *   { uid, name, email }
 */
export const createOrUpdateUser = async (payload: {
  uid: string;
  names: string;
  email: string;
}): Promise<User> => {
  const response = await api.post<User>("/users", payload);
  return response.data;
};
