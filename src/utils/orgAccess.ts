// Helpers de control de acceso por organización.
//
// El acceso de administración a una organización se concede a quien sea
// AUTOR de la organización O tenga un rol administrativo en su membresía.
// Esta lógica vivía duplicada en MyOrganizations y en el guard RequireAdmin;
// se centraliza aquí para que ambos decidan exactamente igual y no se puedan
// desincronizar (p. ej. bloquear a un autor por no tener rol_id === "admin").

const ADMIN_ROLES = ["admin", "owner", "super_admin"];

/**
 * ¿`userId` es autor de la organización? `author` puede venir como string,
 * array de ids u objeto poblado con `_id`, según cómo se haya guardado.
 */
export function isOrgAuthor(author: any, userId: string | null): boolean {
  if (!author || !userId) return false;

  if (Array.isArray(author)) {
    return author.some((id) => String(id) === String(userId));
  }
  if (typeof author === "string") {
    return String(author) === String(userId);
  }
  if (typeof author === "object" && author._id) {
    return String(author._id) === String(userId);
  }
  return false;
}

/**
 * ¿La membresía (`organizationUserData`) tiene un rol administrativo?
 * `rol_id` puede ser un string o un objeto poblado con `_id`.
 */
export function hasAdminRole(organizationUserData: any): boolean {
  if (!organizationUserData) return false;
  const rid =
    typeof organizationUserData.rol_id === "string"
      ? organizationUserData.rol_id
      : organizationUserData.rol_id?._id;
  return ADMIN_ROLES.includes(String(rid || "").toLowerCase());
}
