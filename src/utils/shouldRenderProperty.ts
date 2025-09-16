import { UserProperty } from "../services/types";

function hasMeaningfulValue(v: any) {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return v === true; // solo true cuenta como “seleccionado”
  return true;
}

/**
 * Mostrar si:
 * - No hay dependencia => true
 * - Hay dependencia con triggerValues => el valor del fieldName coincide (o intersecta si es array)
 * - Hay dependencia SIN triggerValues => basta con que el fieldName tenga “algún valor”
 */
export default function shouldRenderProperty(
  prop: UserProperty,
  values: Record<string, any>
) {
  const dep = prop?.dependency;
  if (!dep || !dep.fieldName) return true;

  const triggers = Array.isArray(dep.triggerValues) ? dep.triggerValues : [];
  const depValue = values[dep.fieldName];

  if (triggers.length > 0) {
    if (Array.isArray(depValue))
      return depValue.some((v) => triggers.includes(v));
    return triggers.includes(depValue);
  }

  // “Presencia”: con solo que el campo dependiente esté “seleccionado”, mostramos
  return hasMeaningfulValue(depValue);
}
