// src/pages/auth/components/validators.ts
import { PropertyType, UserProperty } from "../../../services/types";
import shouldRenderProperty from "../../../utils/shouldRenderProperty";

/** Expresiones comunes */
export const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]+$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Determina si un valor está “provisto” según su tipo */
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

/** obligatorio efectivo: prop.mandatory || (depto/city && pais === "Colombia") */
export function isEffectiveMandatory(
    prop: UserProperty,
    values: Record<string, any>
): boolean {
    const name = (prop?.name || "").toLowerCase();
    const isLocation = name === "departamento" || name === "city";
    const isColombia = (values?.pais || "") === "Colombia";
    return !!(prop?.mandatory || (isLocation && isColombia));
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
        const visible = shouldRenderProperty(p as any, values);
        if (!visible) continue;

        const name = p.name;
        const label = (p.label as string) || name;
        let val = values[name];

        // Requeridos efectivos (dependen de país/depto/ciudad)
        if (isEffectiveMandatory(p, values)) {
            const provided = isProvidedByType(val, p.type);
            if (!provided) {
                const msg = "Este campo es obligatorio.";
                fieldErrors[name] = msg;
                modalItems.push({ name, label, msg });
                continue;
            }
        }

        // Normaliza para validaciones de string
        if (typeof val === "string") val = val.trim();

        const {
            isEmailField,
            isNamesField,
            isSurnamesField,
            isIdField,
            isPhoneField,
        } = detectKinds(label, name, p.type);

        // Email
        if (isEmailField && val && !EMAIL_RE.test(String(val))) {
            const msg = "Formato de correo inválido.";
            fieldErrors[name] = msg;
            modalItems.push({ name, label, msg });
            continue;
        }

        // ID/Teléfono: solo dígitos y 6–15 de largo
        if ((isIdField || isPhoneField) && val) {
            const digits = String(val).replace(/\D+/g, "");
            if (!/^\d+$/.test(digits) || digits.length < 6 || digits.length > 15) {
                const msg = "Debe contener solo números y entre 6 y 15 dígitos.";
                fieldErrors[name] = msg;
                modalItems.push({ name, label, msg });
                continue;
            }
        }

        // Nombres/Apellidos: solo letras
        if (
            (isNamesField || isSurnamesField) &&
            val &&
            !ONLY_LETTERS_RE.test(String(val))
        ) {
            const msg = "Solo letras y espacios.";
            fieldErrors[name] = msg;
            modalItems.push({ name, label, msg });
            continue;
        }

        // Dependencias explícitas
        if (name === "departamento" && values.pais === "Colombia" && !val) {
            const msg = "Selecciona un departamento.";
            fieldErrors[name] = msg;
            modalItems.push({ name, label, msg });
            continue;
        }
        if (name === "city" && values.pais === "Colombia" && !val) {
            const msg = "Selecciona una ciudad.";
            fieldErrors[name] = msg;
            modalItems.push({ name, label, msg });
            continue;
        }
    }

    return { fieldErrors, modalItems };
}
