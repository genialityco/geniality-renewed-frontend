// userService.ts
import api from "./api";
import { User } from "./types";

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
 *   { firebase_uid, name, email }
 */
export const createOrUpdateUser = async (payload: {
  firebase_uid: string;
  name: string;
  email: string;
}): Promise<User> => {
  const response = await api.post<User>("/users", payload);
  return response.data;
};
