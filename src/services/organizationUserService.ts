import api from "./api";
import { OrganizationUser, User } from "./types";

export interface OrganizationUserPayload {
  properties: any;
  rol_id: string;
  organization_id: string;
  user_id: string | User;
  position_id: string;
  payment_plan_id?: string;
}

/**
 * Obtiene un organization-user por su user_id
 */
export const fetchOrganizationUserByUserId = async (
  userId: string
): Promise<OrganizationUser> => {
  const response = await api.get<OrganizationUser>(
    `/organization-users/${userId}`
  );
  return response.data;
};


/**
 * Crea o actualiza un organization-user.
 * Se envía un payload con los campos definidos.
 */
export const createOrUpdateOrganizationUser = async (
  data: OrganizationUserPayload
): Promise<OrganizationUser> => {
  const response = await api.post<OrganizationUser>(
    "/organization-users",
    data
  );
  return response.data;
};

/**
 * Obtiene todos los organization-users por organization_id con paginación
 */
export const fetchOrganizationUsersByOrganizationId = async (
  organizationId: string,
  page = 1,
  limit = 20,
  search = ""
): Promise<{ results: OrganizationUser[]; total: number }> => {
  let url = `/organization-users/by-organization/${organizationId}?page=${page}&limit=${limit}`;
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search)}`;
  }
  const response = await api.get<{
    results: OrganizationUser[];
    total: number;
  }>(url);
  return response.data;
};

/**
 * Obtiene un organization-user por su email (en properties.email)
 */
export const fetchOrganizationUserByEmail = async (
  email: string
): Promise<OrganizationUser | null> => {
  const response = await api.get<OrganizationUser | null>(
    `/organization-users/by-email/${encodeURIComponent(email)}`
  );
  return response.data;
};

export const fetchAllOrganizationUsersByOrganizationId = async (
  organizationId: string,
  search = ""
): Promise<OrganizationUser[]> => {
  let url = `/organization-users/all-by-organization/${organizationId}`;
  if (search && search.trim()) {
    url += `?search=${encodeURIComponent(search)}`;
  }
  const response = await api.get<OrganizationUser[]>(url);
  return response.data;
};

export const deleteOrganizationUser = async (organizationUserId: string) => {
  const url = `/organization-users/${organizationUserId}/delete`;
  const { data } = await api.post<{ message: string }>(url); // POST, no DELETE
  return data;
};


export async function fetchOrganizationsByUser(userId: string) {
  const url = `/organization-users/organizations-by-user/${userId}`;
  const data = await api.get<{ organization: any; membership: any }[]>(url);
  return data.data;
}


