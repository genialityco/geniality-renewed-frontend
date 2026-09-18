/**
 * `organization_id` a veces se enviaba como la URL completa de la
 * organización (ej. "https://app.geniality.com.co/organization/<id>") en vez
 * del id solo. El backend ya lo sanea defensivamente al leer (ver
 * `sanitizeOrganizationId` en geniality-renewed-backend/src/reminders/contact.util.ts),
 * pero conviene blindar también el punto de envío para no seguir guardando
 * datos corruptos. Si detecta una URL, se queda con el segmento que sigue a
 * "organization"; si no, la deja tal cual.
 */
export function sanitizeOrganizationId(raw: string | null | undefined): string {
  const str = String(raw ?? "").trim();
  if (!/^https?:\/\//i.test(str)) return str;

  const segments = str.split("/").filter(Boolean);
  const orgIndex = segments.lastIndexOf("organization");
  if (orgIndex >= 0 && segments[orgIndex + 1]) {
    return segments[orgIndex + 1];
  }
  return segments[segments.length - 1] || str;
}
