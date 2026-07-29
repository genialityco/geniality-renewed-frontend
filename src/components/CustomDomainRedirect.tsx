import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getOrgIdFromHost } from "../config/customDomains";

/**
 * En dominios white-label (ver src/config/customDomains.ts) la raíz "/" no debe
 * mostrar la lista general de organizaciones, sino la landing de la organización
 * dueña del dominio. Redirige "/" → "/organization/<orgId>" preservando el query
 * string. No interfiere con el resto de rutas (que ya incluyen el prefijo
 * /organization/... y funcionan igual en cualquier host).
 */
export default function CustomDomainRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const orgId = getOrgIdFromHost();
    if (!orgId) return;
    if (location.pathname === "/") {
      navigate(`/organization/${orgId}${location.search}`, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return null;
}
