// Lista de países (nombre en español + código ISO 3166-1 alpha-2).
// La bandera se genera como emoji a partir del código ISO, sin imágenes externas.

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string; // Nombre en español
}

export const COUNTRIES: Country[] = [
  { code: "AR", name: "Argentina" },
  { code: "BO", name: "Bolivia" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "CU", name: "Cuba" },
  { code: "EC", name: "Ecuador" },
  { code: "SV", name: "El Salvador" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "MX", name: "México" },
  { code: "NI", name: "Nicaragua" },
  { code: "PA", name: "Panamá" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Perú" },
  { code: "PR", name: "Puerto Rico" },
  { code: "DO", name: "República Dominicana" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "CA", name: "Canadá" },
  { code: "PT", name: "Portugal" },
  { code: "FR", name: "Francia" },
  { code: "IT", name: "Italia" },
  { code: "DE", name: "Alemania" },
  { code: "GB", name: "Reino Unido" },
  { code: "IE", name: "Irlanda" },
  { code: "NL", name: "Países Bajos" },
  { code: "BE", name: "Bélgica" },
  { code: "CH", name: "Suiza" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Suecia" },
  { code: "NO", name: "Noruega" },
  { code: "DK", name: "Dinamarca" },
  { code: "FI", name: "Finlandia" },
  { code: "PL", name: "Polonia" },
  { code: "GR", name: "Grecia" },
  { code: "RU", name: "Rusia" },
  { code: "TR", name: "Turquía" },
  { code: "IL", name: "Israel" },
  { code: "SA", name: "Arabia Saudita" },
  { code: "AE", name: "Emiratos Árabes Unidos" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japón" },
  { code: "KR", name: "Corea del Sur" },
  { code: "SG", name: "Singapur" },
  { code: "PH", name: "Filipinas" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Tailandia" },
  { code: "VN", name: "Vietnam" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "Nueva Zelanda" },
  { code: "ZA", name: "Sudáfrica" },
  { code: "EG", name: "Egipto" },
  { code: "MA", name: "Marruecos" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenia" },
];

// Convierte un código ISO 3166-1 alpha-2 en su emoji de bandera.
export function flagEmoji(code: string): string {
  if (!code || code.length !== 2) return "";
  const A = 0x1f1e6; // 🇦 (Regional Indicator Symbol Letter A)
  const chars = code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(A + (c.charCodeAt(0) - 65)));
  return chars.join("");
}

// Devuelve el emoji de bandera a partir del nombre del país guardado.
export function flagForCountryName(name?: string | null): string {
  if (!name) return "";
  const country = COUNTRIES.find((c) => c.name === name);
  return country ? flagEmoji(country.code) : "";
}

// Datos listos para <Select data={...} /> de Mantine.
export const COUNTRY_SELECT_DATA = COUNTRIES.map((c) => ({
  value: c.name,
  label: `${flagEmoji(c.code)}  ${c.name}`,
}));
