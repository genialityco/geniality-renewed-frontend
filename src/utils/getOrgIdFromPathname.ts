import { matchPath } from "react-router-dom";

const ORG_ROUTE_PATTERNS = [
  "/organization/:orgId",
  "/organization/:orgId/*",
];

/**
 * Extrae el organizationId de una ruta actual (p.ej. "/organization/123/admin"),
 * independiente de en qué punto del árbol de componentes se llame — a diferencia
 * de useParams(), que solo funciona dentro del Route que lo define.
 */
export function getOrgIdFromPathname(pathname: string): string | null {
  for (const pattern of ORG_ROUTE_PATTERNS) {
    const match = matchPath({ path: pattern, end: false }, pathname);
    if (match?.params?.orgId) return match.params.orgId;
  }
  return null;
}
