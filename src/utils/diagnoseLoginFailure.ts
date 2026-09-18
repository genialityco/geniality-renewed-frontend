import {
  fetchOrganizationUserByEmail,
  fetchOrganizationUserByUserAndOrg,
} from "../services/organizationUserService";

/**
 * Motivo real por el que falló un intento de inicio de sesión.
 *
 * - `not-registered`: el correo no existe como miembro de ninguna organización.
 * - `other-organization`: existe, pero no en la organización desde la que se
 *   está intentando entrar.
 * - `wrong-password`: sí es miembro de esta organización, así que lo que no
 *   coincide es la cédula/ID.
 * - `unknown`: no se pudo averiguar (backend caído, red, etc.).
 */
export type LoginFailureReason =
  | "not-registered"
  | "other-organization"
  | "wrong-password"
  | "unknown";

const unwrapId = (v: any): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v._id != null) return String(v._id);
  return null;
};

/**
 * Firebase devuelve `auth/invalid-credential` tanto cuando el correo no existe
 * como cuando la contraseña es incorrecta: con la protección de enumeración de
 * correos activada ya no emite `auth/user-not-found`. Por eso no se puede
 * distinguir "usuario no registrado" de "cédula equivocada" desde el error de
 * Firebase, y todos los casos terminaban mostrando "Email o cédula/ID
 * incorrecto" aunque la persona nunca se hubiera registrado.
 *
 * Esta función resuelve la ambigüedad preguntándole al backend, que sí sabe
 * quién es miembro y de qué organización.
 */
export async function diagnoseLoginFailure(
  email: string,
  organizationId?: string
): Promise<LoginFailureReason> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return "unknown";

  try {
    // Búsqueda global y exacta (el backend ancla y escapa el email).
    const orgUser = await fetchOrganizationUserByEmail(cleanEmail);
    if (!orgUser) return "not-registered";

    if (!organizationId) return "wrong-password";

    // `fetchOrganizationUserByEmail` es un findOne: si la persona pertenece a
    // varias organizaciones devuelve una cualquiera, no necesariamente la de
    // esta URL. Hay que confirmar la pertenencia con la consulta scoped.
    const userId = unwrapId((orgUser as any).user_id);
    if (!userId) return "wrong-password";

    const membership = await fetchOrganizationUserByUserAndOrg(
      userId,
      organizationId
    );
    return membership ? "wrong-password" : "other-organization";
  } catch {
    // Nunca romper el flujo de error del login por culpa del diagnóstico.
    return "unknown";
  }
}

export default diagnoseLoginFailure;
