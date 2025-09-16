import { useMemo, useEffect, useState, useCallback } from "react";
import { TextInput, Textarea, Checkbox, Select } from "@mantine/core";
import { Country, State, City } from "country-state-city";
import { UserProperty, PropertyType } from "../../../services/types";

type Props = {
  prop: UserProperty;
  value: any;
  onChange: (name: string, value: any) => void;
  formValues?: Record<string, any>;
};

export default function DynamicField({
  prop,
  value,
  onChange,
  formValues,
}: Props) {
  // Respeta visibilidad (true por defecto si no viene)
  const isVisible = prop.visible !== false && (prop as any).visible !== "false";
  if (!isVisible) return null;

  const hintText = (prop as any).description?.toString?.() || undefined;

  // ====== DETECCIÓN DE TIPOS ESPECÍFICOS PARA VALIDACIÓN ======
  const lname = (prop.name || "").toLowerCase();
  const llabel = (prop.label || "").toLowerCase();

  const isNamesField =
    lname === "nombres" ||
    llabel.includes("nombres") ||
    lname === "names" ||
    llabel.includes("nombre") && !llabel.includes("correo");

  const isSurnamesField =
    lname === "apellidos" ||
    llabel.includes("apellidos") ||
    lname === "surnames" ||
    llabel.includes("apellido");

  const isEmailField = prop.type === PropertyType.EMAIL || lname === "email";

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

  // Detectar campo teléfono / número de contacto
  const isPhoneField =
    lname.includes("phone") ||
    lname.includes("cel") ||
    llabel.includes("contacto") ||
    llabel.includes("tel") ||
    llabel.includes("teléfono") ||
    llabel.includes("telefono") ||
    lname === "numero de contacto" ||
    lname === "phone";

  // ====== REGLAS / VALIDACIONES ======
  // 1) Nombres/Apellidos: solo letras (incluyendo tildes) y espacios
  const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]*$/;

  // 2) Email: validación simple RFC-like
  const EMAIL_RE =
    // eslint-disable-next-line no-useless-escape
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  // 3) Numéricos (ID / contacto): solo dígitos
  const ONLY_DIGITS_RE = /^\d*$/;

  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  const sanitizeOnChange = useCallback(
    (raw: any) => {
      // Normalizamos el valor entrante
      const nextVal = raw?.currentTarget ? raw.currentTarget.value : raw;

      // Campos numéricos: dejan solo dígitos
      if (isIdField || isPhoneField) {
        const digitsOnly = String(nextVal || "").replace(/\D+/g, "");
        return digitsOnly;
      }

      // Campos de nombres/apellidos: bloquea números/caracteres especiales
      if (isNamesField || isSurnamesField) {
        const str = String(nextVal || "");
        // Permitimos letras (tildes), espacios y guion
        const cleaned = str.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]/g, "");
        return cleaned;
      }

      // Email y demás: no forzamos, solo devolvemos tal cual
      return nextVal;
    },
    [isIdField, isPhoneField, isNamesField, isSurnamesField]
  );

  const validateOnBlur = useCallback(
    (raw: any) => {
      let val = raw?.currentTarget ? raw.currentTarget.value : raw;
      // 4) Trim de espacios al final para todos los campos de texto/textarea
      if (typeof val === "string") val = val.trimEnd();

      // Validaciones específicas
      if (isNamesField || isSurnamesField) {
        if (val && !ONLY_LETTERS_RE.test(val)) {
          setErrorText("Solo letras y espacios.");
        } else {
          setErrorText(undefined);
        }
      } else if (isEmailField) {
        if (val && !EMAIL_RE.test(val)) {
          setErrorText("Formato de correo inválido (ej. nombre@dominio.com).");
        } else {
          setErrorText(undefined);
        }
      } else if (isIdField || isPhoneField) {
        if (val && (!ONLY_DIGITS_RE.test(val) || String(val).length < 6)) {
          setErrorText("Debe contener solo números y mínimo 6 dígitos.");
        } else {
          setErrorText(undefined);
        }
      } else {
        setErrorText(undefined);
      }

      // Devolver el valor (ya con trimEnd)
      return val;
    },
    [isNamesField, isSurnamesField, isEmailField, isIdField, isPhoneField]
  );

  // Placeholder
  const placeholder =
    isPhoneField ? "3121234567" : prop.label;

  // Common props para TextInput/Textarea
  const common = {
    label: prop.label,
    placeholder,
    required: prop.mandatory,
    value,
    onChange: (e: any) => onChange(prop.name, sanitizeOnChange(e)),
    onBlur: (e: any) => onChange(prop.name, validateOnBlur(e)),
    mb: "sm" as const,
    description: hintText,
    error: errorText,
  };

  // ====== País / Departamento / Ciudad ======
  const countries = useMemo(() => Country.getAllCountries(), []);
  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.isoCode, label: c.name })), // value = ISO2 único
    [countries]
  );
  const countryByCode = useMemo(() => {
    const m = new Map<string, { name: string; iso: string; phonecode?: string | null }>();
    for (const c of countries)
      m.set(c.isoCode, { name: c.name, iso: c.isoCode, phonecode: (c as any).phonecode ?? null });
    return m;
  }, [countries]);
  const countryCodeByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of countries) m.set(c.name, c.isoCode);
    return m;
  }, [countries]);

  const selectedCountryName = (formValues?.pais ?? "") as string;
  const selectedCountryCode = countryCodeByName.get(selectedCountryName) || "";

  // Estados/Deptos del país
  const states = useMemo(
    () => (selectedCountryCode ? State.getStatesOfCountry(selectedCountryCode) : []),
    [selectedCountryCode]
  );
  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.isoCode, label: s.name })), // value = isoCode (único)
    [states]
  );
  const stateByCode = useMemo(() => {
    const m = new Map<string, { name: string; code: string }>();
    for (const s of states) m.set(s.isoCode, { name: s.name, code: s.isoCode });
    return m;
  }, [states]);

  const selectedStateName = (formValues?.departamento ?? "") as string;
  const selectedStateCode =
    states.find((s) => s.name === selectedStateName)?.isoCode || "";

  // Ciudades (value único = name::stateCode)
  const cities = useMemo(() => {
    if (!selectedCountryCode) return [];
    if (selectedStateCode) {
      return City.getCitiesOfState(selectedCountryCode, selectedStateCode);
    }
    return City.getCitiesOfCountry(selectedCountryCode);
  }, [selectedCountryCode, selectedStateCode]);

  const cityOptions = useMemo(
    () =>
      cities?.map((c) => {
        const key = `${c.name}::${c.stateCode ?? ""}`;
        return { value: key, label: c.name };
      }),
    [cities]
  );

  // Mantener valor seleccionado de ciudad (guardas solo el nombre)
  const selectedCityName = (value as string) || "";
  const selectedCityKey = useMemo(() => {
    if (!selectedCityName) return null;
    if (selectedStateCode) return `${selectedCityName}::${selectedStateCode}`;
    const found = cities?.find((c) => c.name === selectedCityName);
    return found ? `${found.name}::${found.stateCode ?? ""}` : null;
  }, [selectedCityName, selectedStateCode, cities]);

  // ====== Indicativo de país (auto) ======
  const getNormalizedPhoneCode = (code?: string | null) => {
    if (!code) return "";
    const first = String(code).split(",")[0].trim();
    return first ? `+${first.replace(/^\+/, "")}` : "";
  };

  useEffect(() => {
    if (!selectedCountryCode) return;
    const phonecode = countryByCode.get(selectedCountryCode)?.phonecode ?? null;
    const normalized = getNormalizedPhoneCode(phonecode);
    if (normalized && formValues?.indicativodepais !== normalized) {
      onChange("indicativodepais", normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountryCode]);

  // ====== Renders especiales ======

  // País
  if (prop.type === ("country" as any) || lname === "pais") {
    return (
      <Select
        key={prop.name}
        label={prop.label}
        placeholder={prop.label}
        searchable
        clearable
        data={countryOptions}
        value={selectedCountryCode || null}
        onChange={(code) => {
          const countryName = code ? countryByCode.get(code)?.name ?? "" : "";
          onChange(prop.name, countryName); // guardas NOMBRE

          // Indicativo de país (auto)
          const phonecode = code ? countryByCode.get(code)?.phonecode ?? null : null;
          const normalized = getNormalizedPhoneCode(phonecode);
          onChange("indicativodepais", normalized);

          // Reglas de dpto/ciudad
          const isColombia = countryName === "Colombia";
          if ("departamento" in (formValues ?? {})) onChange("departamento", isColombia ? "" : "No aplica");
          if ("city" in (formValues ?? {})) onChange("city", isColombia ? "" : "No aplica");
        }}
        mb="sm"
        description={hintText}
      />
    );
  }

  // Ocultar depto/ciudad si país ≠ Colombia
  const shouldShowDeptoCity = selectedCountryName === "Colombia";

  if (lname === "departamento") {
    if (!shouldShowDeptoCity) {
      if ((formValues?.departamento as string) !== "No aplica")
        onChange("departamento", "No aplica");
      return null;
    }

    const selectedStateCodeFromName =
      states.find((s) => s.name === (value as string))?.isoCode ?? null;

    return (
      <Select
        key={prop.name}
        label={prop.label}
        placeholder={prop.label}
        searchable
        clearable
        data={stateOptions}
        value={selectedStateCodeFromName}
        disabled={!selectedCountryCode}
        onChange={(code) => {
          const stateName = code ? stateByCode.get(code)?.name ?? "" : "";
          onChange(prop.name, stateName);
          if ("city" in (formValues ?? {})) onChange("city", "");
        }}
        mb="sm"
        description={hintText}
      />
    );
  }

  if (prop.type === ("city" as any) || lname === "city") {
    if (!shouldShowDeptoCity) {
      if ((formValues?.city as string) !== "No aplica")
        onChange("city", "No aplica");
      return null;
    }

    return (
      <Select
        key={prop.name}
        label={prop.label}
        placeholder={prop.label}
        searchable
        clearable
        data={cityOptions}
        value={selectedCityKey}
        disabled={!selectedCountryCode}
        onChange={(val) => {
          if (!val) {
            onChange(prop.name, "");
            return;
          }
          const [cityName, stateCode] = val.split("::");
          onChange(prop.name, cityName);

          // Autoseleccionar departamento por NOMBRE
          const stateName = stateByCode.get(stateCode || "")?.name ?? "";
          if ("departamento" in (formValues ?? {})) onChange("departamento", stateName);

          // Mantener país correcto por NOMBRE
          const countryName = countryByCode.get(selectedCountryCode)?.name ?? "";
          if ("pais" in (formValues ?? {})) {
            const current = (formValues?.pais as string) || "";
            if (!current || current !== countryName) onChange("pais", countryName);
          }
        }}
        mb="sm"
        description={hintText}
      />
    );
  }

  // ====== Resto de tipos ======
  switch (prop.type) {
    case PropertyType.TEXT:
      return (
        <TextInput
          key={prop.name}
          {...common}
          type={isPhoneField ? "tel" : "text"}
          inputMode={isPhoneField || isIdField ? "numeric" : "text"}
        />
      );
    case PropertyType.EMAIL:
      return (
        <TextInput
          key={prop.name}
          {...common}
          type="email"
          inputMode="email"
        />
      );
    case PropertyType.CODEAREA:
      return <Textarea key={prop.name} {...common} onBlur={(e) => onChange(prop.name, validateOnBlur(e))} />;
    case PropertyType.BOOLEAN:
      return (
        <Checkbox
          key={prop.name}
          label={<span dangerouslySetInnerHTML={{ __html: prop.label }} />}
          checked={!!value}
          onChange={(e) => onChange(prop.name, e.currentTarget.checked)}
          mb="sm"
          description={hintText}
        />
      );
    case PropertyType.LIST:
      return (
        <Select
          key={prop.name}
          label={prop.label}
          data={Array.isArray(prop.options) ? prop.options : []}
          placeholder={prop.label}
          required={prop.mandatory}
          value={value || null}
          onChange={(val) => onChange(prop.name, val)}
          mb="sm"
          searchable
          clearable
          description={hintText}
        />
      );
    default:
      return <TextInput key={prop.name} {...common} />;
  }
}
