// Dominios white-label → organizationId.
//
// Cuando la app se sirve desde uno de estos hosts (configurados en el DNS del
// dominio apuntando a la plataforma de deploy), la raíz "/" no muestra la lista
// general de organizaciones sino la landing de la organización dueña del dominio.
//
// Para agregar un nuevo dominio de marca basta con añadir una línea aquí.
export const CUSTOM_DOMAIN_ORG_MAP: Record<string, string> = {
  "cursoacehipotiroidismo.com": "6a4ffd695b809f3cf38d3a64",
  "www.cursoacehipotiroidismo.com": "6a4ffd695b809f3cf38d3a64",
};

/**
 * Devuelve el organizationId asociado al host actual (o al que se le pase),
 * o null si el host no es un dominio de marca.
 */
export function getOrgIdFromHost(
  hostname: string = window.location.hostname
): string | null {
  return CUSTOM_DOMAIN_ORG_MAP[hostname.toLowerCase()] ?? null;
}

// Ruta a la que debe apuntar la raíz "/" de un dominio de marca. Por defecto se
// abre la landing de la organización (/organization/<orgId>), pero aquí se puede
// forzar a que "/" abra directamente un curso u otra vista concreta.
export const CUSTOM_DOMAIN_HOME_MAP: Record<string, string> = {
  "cursoacehipotiroidismo.com":
    "/organization/6a4ffd695b809f3cf38d3a64/course/6a500d595b809f3cf38d4e45",
  "www.cursoacehipotiroidismo.com":
    "/organization/6a4ffd695b809f3cf38d3a64/course/6a500d595b809f3cf38d4e45",
};

/**
 * Ruta de inicio configurada para el host actual (o el que se pase), o null si
 * el host no tiene una ruta de inicio específica.
 */
export function getHomePathFromHost(
  hostname: string = window.location.hostname
): string | null {
  return CUSTOM_DOMAIN_HOME_MAP[hostname.toLowerCase()] ?? null;
}
