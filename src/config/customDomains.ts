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
