// src/pages/auth/components/validators.ts
import { PropertyType, UserProperty } from "../../../services/types";
import shouldRenderProperty from "../../../utils/shouldRenderProperty";

/** Expresiones comunes */
export const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]+$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Determina si un valor está "provisto" según su tipo */
export function isProvidedByType(value: any, type?: string): boolean {
    const t = (type ?? "").toLowerCase();
    if (t === "boolean") return value === true; // checkbox obligatorio => marcado
    if (Array.isArray(value)) return value.length > 0; // multiselect/lista múltiple
    if (typeof value === "string") return value.trim().length > 0; // texto/email/etc
    if (value === null || value === undefined) return false;
    return true; // números/objetos => considerar provistos
}

/** Clasifica el campo por nombre/label/tipo para aplicar reglas */
export function detectKinds(
    label: string,
    name: string,
    type?: PropertyType | string
) {
    const lname = (name || "").toLowerCase();
    const llabel = (label || "").toLowerCase();

    const isEmailField = type === PropertyType.EMAIL || lname === "email";

    const isNamesField =
        lname === "nombres" ||
        llabel.includes("nombres") ||
        lname === "names" ||
        (llabel.includes("nombre") && !llabel.includes("correo"));

    const isSurnamesField =
        lname === "apellidos" ||
        llabel.includes("apellidos") ||
        lname === "surnames" ||
        llabel.includes("apellido");

    const isIdField =
        lname === "id" ||
        lname === "documento" ||
        lname === "documentoid" ||
        lname === "documentoidentidad" ||
        lname === "documento_de_identidad" ||
        lname === "cedula" ||
        lname === "cédula" ||
        lname === "doc" ||
        lname === "doc_identidad";

    const isPhoneField =
        lname.includes("phone") ||
        lname.includes("cel") ||
        llabel.includes("contacto") ||
        llabel.includes("tel") ||
        llabel.includes("teléfono") ||
        llabel.includes("telefono") ||
        lname === "numero de contacto" ||
        lname === "número de contacto" ||
        lname === "numero_de_contacto" ||
        lname === "phone";

    return {
        isEmailField,
        isNamesField,
        isSurnamesField,
        isIdField,
        isPhoneField,
    };
}

/** 
 * Obligatorio efectivo: el campo DEBE ser visible Y mandatory === true
 * Casos especiales: depto/city son obligatorios solo si país === "Colombia" Y son visibles
 */
export function isEffectiveMandatory(
    prop: UserProperty,
    values: Record<string, any>
): boolean {
    // REGLA FUNDAMENTAL: Si el campo no es visible, NO puede ser obligatorio
    const isVisible = shouldRenderProperty(prop as any, values);
    if (!isVisible) return false;

    const name = (prop?.name || "").toLowerCase();

    // Casos especiales para Colombia
    const isLocation = name === "departamento" || name === "city";
    const isColombia = (values?.pais || "") === "Colombia";

    if (isLocation && isColombia) {
        // Solo obligatorio si es visible Y Colombia está seleccionada
        return true;
    }

    // Para el resto de campos: solo obligatorio si es visible Y mandatory === true
    return !!(isVisible && prop?.mandatory);
}

/** Limpia etiquetas HTML y devuelve solo el texto, con opción de truncar */
function cleanHtmlLabel(label: string, maxLength?: number): string {
    if (!label || typeof label !== 'string') return label || '';

    const cleaned = label
        .replace(/<[^>]*>/g, '') // Elimina todas las etiquetas HTML
        .replace(/&nbsp;/g, ' ') // Reemplaza &nbsp; con espacios
        .replace(/&amp;/g, '&')  // Reemplaza &amp; con &
        .replace(/&lt;/g, '<')   // Reemplaza &lt; con <
        .replace(/&gt;/g, '>')   // Reemplaza &gt; con >
        .replace(/&quot;/g, '"') // Reemplaza &quot; con "
        .replace(/&#39;/g, "'")  // Reemplaza &#39; con '
        .replace(/\s+/g, ' ')    // Normaliza espacios múltiples
        .trim();                 // Elimina espacios al inicio y final

    // Truncar si es muy largo
    if (maxLength && cleaned.length > maxLength) {
        return cleaned.substring(0, maxLength).trim() + '...';
    }

    return cleaned;
}

export type FieldErrors = Record<string, string>;
export type ModalItem = { name: string; label: string; msg: string };

/**
 * Valida TODO lo visible y devuelve:
 *  - fieldErrors: { campo: "mensaje de error" }
 *  - modalItems:  [{ name, label, msg }]
 */
export function validateRegistrationAll(
    properties: UserProperty[] = [],
    values: Record<string, any>
): { fieldErrors: FieldErrors; modalItems: ModalItem[] } {
    const fieldErrors: FieldErrors = {};
    const modalItems: ModalItem[] = [];

    for (const p of properties) {
        // Solo procesamos campos visibles
        const visible = shouldRenderProperty(p as any, values);
        if (!visible) continue;

        const name = p.name;
        const rawLabel = (p.label as string) || name;
        const cleanLabel = cleanHtmlLabel(rawLabel, 80); // Trunca a 80 caracteres para el modal
        let val = values[name];

        // Verificamos si es efectivamente obligatorio (visible + mandatory/especial)
        if (isEffectiveMandatory(p, values)) {
            const provided = isProvidedByType(val, p.type);
            if (!provided) {
                const msg = "Este campo es obligatorio.";
                fieldErrors[name] = msg;
                modalItems.push({ name, label: cleanLabel, msg }); // Usa label limpio y truncado
                continue; // Si falta un obligatorio, no validamos formato
            }
        }

        // Solo validamos formato si hay valor (campos opcionales pueden estar vacíos)
        if (!val) continue;

        // Normaliza para validaciones de string
        if (typeof val === "string") val = val.trim();
        if (!val) continue; // Si queda vacío después del trim, saltamos

        const {
            isEmailField,
            isNamesField,
            isSurnamesField,
            isIdField,
            isPhoneField,
        } = detectKinds(cleanLabel, name, p.type);

        // Email
        if (isEmailField && !EMAIL_RE.test(String(val))) {
            const msg = "Formato de correo inválido.";
            fieldErrors[name] = msg;
            modalItems.push({ name, label: cleanLabel, msg });
            continue;
        }

        // ID/Teléfono: solo dígitos y 6–15 de largo
        if (isIdField || isPhoneField) {
            const digits = String(val).replace(/\D+/g, "");
            if (!/^\d+$/.test(digits) || digits.length < 6 || digits.length > 15) {
                const msg = "Debe contener solo números y entre 6 y 15 dígitos.";
                fieldErrors[name] = msg;
                modalItems.push({ name, label: cleanLabel, msg });
                continue;
            }
        }

        // Nombres/Apellidos: solo letras
        if (
            (isNamesField || isSurnamesField) &&
            !ONLY_LETTERS_RE.test(String(val))
        ) {
            const msg = "Solo letras y espacios.";
            fieldErrors[name] = msg;
            modalItems.push({ name, label: cleanLabel, msg });
            continue;
        }
    }

    return { fieldErrors, modalItems };
}