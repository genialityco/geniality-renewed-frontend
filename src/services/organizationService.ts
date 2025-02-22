import api from './api';
import { Organization } from './types';

export const fetchOrganizations = async (): Promise<Organization[]> => {
  const response = await api.get<Organization[]>('/organizations');
  return response.data;
};

export const fetchOrganizationById = async (id: string): Promise<Organization> => {
  const response = await api.get<Organization>(`/organizations/${id}`);
  return response.data;
};

export const createOrganization = async (
  organization: Partial<Organization>
): Promise<Organization> => {
  const response = await api.post<Organization>('/organizations', organization);
  return response.data;
};

export const updateOrganization = async (
  id: string,
  data: Partial<Organization>
): Promise<Organization> => {
  const response = await api.patch<Organization>(`/organizations/${id}`, data);
  return response.data;
};

export const deleteOrganization = async (id: string): Promise<void> => {
  await api.delete(`/organizations/${id}`);
};