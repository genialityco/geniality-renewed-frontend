import { useMemo, useEffect, useState, useCallback } from "react";
import { TextInput, Textarea, Checkbox, Select } from "@mantine/core";
import { Country, State, City } from "country-state-city";
import { UserProperty, PropertyType } from "../../../services/types";

type Props = {
  prop: UserProperty;
  value: any;
  onChange: (name: string, value: any) => void;
  formValues?: Record<string, any>;
  externalError?: string;
  submittedOnce?: boolean;
};

export default function DynamicField({
  prop,
  value,
  onChange,
  formValues,
  externalError,
  submittedOnce,
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
    (llabel.includes("nombre") && !llabel.includes("correo"));

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
    lname === "número de contacto" ||
    lname === "numero_de_contacto" ||
    lname === "phone";

  // ====== REGLAS / VALIDACIONES ======
  const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]*$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const [errorText, setErrorText] = useState<string | undefined>(undefined);

  // ====== Internacionalización de países (nombres en ES) ======
  const regionES = useMemo(() => {
    const AnyIntl: any = Intl as any;
    try {
      return AnyIntl?.DisplayNames
        ? new AnyIntl.DisplayNames(["es"], { type: "region" })
        : null;
    } catch {
      return null;
    }
  }, []);

  // ====== País / Departamento / Ciudad ======
  const countries = useMemo(() => Country.getAllCountries(), []);
  const countryOptions = useMemo(
    () =>
      countries.map((c) => {
        const es = regionES?.of?.(c.isoCode) || c.name; // "España" | "Colombia" | ...
        return { value: c.isoCode, label: es };
      }),
    [countries, regionES]
  );

  const countryByCode = useMemo(() => {
    const m = new Map<
      string,
      { nameEN: string; nameES: string; iso: string; phonecode?: string | null }
    >();
    for (const c of countries) {
      const nameES = regionES?.of?.(c.isoCode) || c.name;
      m.set(c.isoCode, {
        nameEN: c.name,
        nameES,
        iso: c.isoCode,
        phonecode: (c as any).phonecode ?? null,
      });
    }
    return m;
  }, [countries, regionES]);

  // Lookup por nombre EN y ES → ISO
  const codeByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of countries) {
      const es = regionES?.of?.(c.isoCode) || c.name;
      m.set(c.name, c.isoCode); // inglés
      m.set(es, c.isoCode); // español
    }
    return m;
  }, [countries, regionES]);

  // Resolver país seleccionado (acepta ISO, nombre EN o ES)
  const rawPais = (formValues?.pais ?? "") as string; // nombre guardado (visible)
  const rawPaisISO = (formValues?.pais_iso ?? "") as string; // ISO guardado (interno)

  const selectedCountryCode =
    (rawPaisISO && countryByCode.has(rawPaisISO) && rawPaisISO) ||
    (rawPais.length === 2 && countryByCode.has(rawPais) && rawPais) ||
    codeByName.get(rawPais) ||
    "";

  // Estados/Deptos del país
  const states = useMemo(
    () =>
      selectedCountryCode ? State.getStatesOfCountry(selectedCountryCode) : [],
    [selectedCountryCode]
  );
  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.isoCode, label: s.name })),
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

  // Ciudades
  const cities = useMemo(() => {
    if (!selectedCountryCode) return [];
    if (selectedStateCode)
      return City.getCitiesOfState(selectedCountryCode, selectedStateCode);
    return City.getCitiesOfCountry(selectedCountryCode);
  }, [selectedCountryCode, selectedStateCode]);

  const cityOptions = useMemo(
    () =>
      cities?.map((c) => ({
        value: `${c.name}::${c.stateCode ?? ""}`,
        label: c.name,
      })),
    [cities]
  );

  const selectedCityName = (value as string) || "";
  const selectedCityKey = useMemo(() => {
    if (!selectedCityName) return null;
    if (selectedStateCode) return `${selectedCityName}::${selectedStateCode}`;
    const found = cities?.find((c) => c.name === selectedCityName);
    return found ? `${found.name}::${found.stateCode ?? ""}` : null;
  }, [selectedCityName, selectedStateCode, cities]);

  // ====== OBLIGATORIEDAD DINÁMICA (depto/city solo cuando país = CO) ======
  const isLocationField = lname === "departamento" || lname === "city";
  const isColombia = selectedCountryCode === "CO";
  const effectiveMandatory =
    (prop.mandatory ?? false) || (isLocationField && isColombia);

  const isEmpty = value == null || value === "";
  const requiredError =
    submittedOnce && effectiveMandatory && isEmpty
      ? "Este campo es obligatorio."
      : undefined;

  // Error a mostrar (prioridad: externo > interno > requerido)
  const composedError = externalError ?? errorText ?? requiredError;

  // ====== Indicativo de país (auto)
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

  // ====== Sanitización en onChange (incluye recorte a 15) ======
  const sanitizeOnChange = useCallback(
    (raw: any) => {
      const nextVal = raw?.currentTarget ? raw.currentTarget.value : raw;

      // Campos numéricos: dejan solo dígitos y máx 15
      if (isIdField || isPhoneField) {
        const digitsOnly = String(nextVal || "")
          .replace(/\D+/g, "")
          .slice(0, 15);
        return digitsOnly;
      }

      // Campos de nombres/apellidos: bloquea números/caracteres especiales
      if (isNamesField || isSurnamesField) {
        const str = String(nextVal || "");
        const cleaned = str.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]/g, "");
        return cleaned;
      }

      // Email y demás: no forzamos
      return nextVal;
    },
    [isIdField, isPhoneField, isNamesField, isSurnamesField]
  );

  // ====== Validación en blur ======
  const validateOnBlur = useCallback(
    (raw: any) => {
      let val = raw?.currentTarget ? raw.currentTarget.value : raw;
      if (typeof val === "string") val = val.trimEnd();

      if (isNamesField || isSurnamesField) {
        if (val && !ONLY_LETTERS_RE.test(val))
          setErrorText("Solo letras y espacios.");
        else setErrorText(undefined);
      } else if (isEmailField) {
        if (val && !EMAIL_RE.test(val))
          setErrorText("Formato de correo inválido (ej. nombre@dominio.com).");
        else setErrorText(undefined);
      } else if (isIdField || isPhoneField) {
        if (val) {
          const digits = String(val).replace(/\D+/g, "");
          if (
            !/^\d+$/.test(digits) ||
            digits.length < 6 ||
            digits.length > 15
          ) {
            setErrorText("Debe contener solo números y entre 6 y 15 dígitos.");
          } else setErrorText(undefined);
        } else setErrorText(undefined);
      } else {
        setErrorText(undefined);
      }

      return val;
    },
    [isNamesField, isSurnamesField, isEmailField, isIdField, isPhoneField]
  );

  // ====== Helpers para bloqueo duro en input ======
  const numericKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!(isIdField || isPhoneField)) return;

    const allowedControl = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
      "Tab",
      "Enter",
    ];
    if (allowedControl.includes(e.key) || e.ctrlKey || e.metaKey) return;

    // Bloquea todo lo que no sea dígito
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    const el = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    const selStart = el.selectionStart ?? el.value.length;
    const selEnd = el.selectionEnd ?? selStart;
    const selectionLen = Math.max(0, selEnd - selStart);

    const currentDigits = el.value.replace(/\D+/g, "");
    // Si no hay selección y ya hay 15 dígitos, bloquea
    if (selectionLen === 0 && currentDigits.length >= 15) {
      e.preventDefault();
    }
  };

  const numericPaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!(isIdField || isPhoneField)) return;

    const paste = e.clipboardData?.getData("text") ?? "";
    const digitsPaste = paste.replace(/\D+/g, "");
    const el = e.currentTarget as HTMLInputElement | HTMLTextAreaElement;

    const selStart = el.selectionStart ?? el.value.length;
    const selEnd = el.selectionEnd ?? selStart;
    const before = el.value.slice(0, selStart);
    const after = el.value.slice(selEnd);

    const currentDigitsOutsideSelection = (before + after).replace(/\D+/g, "");
    const room = 15 - currentDigitsOutsideSelection.length;

    // Si no hay espacio o hay más dígitos que el espacio disponible, evita el paste por defecto
    if (room <= 0) {
      e.preventDefault();
      return;
    }
    if (digitsPaste.length > room) {
      e.preventDefault();
      const snippet = digitsPaste.slice(0, room);
      const next = (before + snippet + after).replace(/\D+/g, "");
      onChange(prop.name, next); // actualiza con lo permitido
    }
    // Si cabe, dejamos que siga y sanitizeOnChange reforzará
  };

  // ====== Props comunes para TextInput/Textarea ======
  const common = {
    label: prop.label,
    placeholder: isPhoneField ? "3121234567" : prop.label,
    required: effectiveMandatory,
    withAsterisk: !!effectiveMandatory,
    name: prop.name,
    value,
    onChange: (e: any) => onChange(prop.name, sanitizeOnChange(e)),
    onBlur: (e: any) => onChange(prop.name, validateOnBlur(e)),
    mb: "sm" as const,
    description: hintText,
    error: composedError,
  } as const;

  // Helper para envolver y poder scrollear/focalizar desde el form padre
  const wrap = (node: any) => <div data-field={prop.name}>{node}</div>;

  // ====== País ======
  if (prop.type === ("country" as any) || lname === "pais") {
    return wrap(
      <Select
        key={prop.name}
        label={prop.label}
        placeholder={prop.label}
        searchable
        clearable
        data={countryOptions} // etiquetas en español
        value={selectedCountryCode || null} // trabajamos con ISO
        required={effectiveMandatory}
        withAsterisk={!!effectiveMandatory}
        error={composedError}
        onChange={(code) => {
          const info = code ? countryByCode.get(code) : undefined;
          const countryNameES = info?.nameES ?? "";

          // Guarda ambos (recomendado)
          onChange("pais_iso", code || ""); // ISO: "ES"
          onChange(prop.name, countryNameES); // Nombre mostrado: "España"

          // Indicativo
          const normalized = getNormalizedPhoneCode(info?.phonecode ?? null);
          onChange("indicativodepais", normalized);

          // Reglas de dpto/ciudad (por ISO)
          const isCol = code === "CO";
          if ("departamento" in (formValues ?? {}))
            onChange("departamento", isCol ? "" : "No aplica");
          if ("city" in (formValues ?? {}))
            onChange("city", isCol ? "" : "No aplica");
        }}
        mb="sm"
        description={hintText}
      />
    );
  }

  // Mostrar/ocultar depto/ciudad según país (ISO CO)
  const shouldShowDeptoCity = selectedCountryCode === "CO";

  if (lname === "departamento") {
    if (!shouldShowDeptoCity) {
      if ((formValues?.departamento as string) !== "No aplica")
        onChange("departamento", "No aplica");
      return null;
    }

    const selectedStateCodeFromName =
      states.find((s) => s.name === (value as string))?.isoCode ?? null;

    return wrap(
      <Select
        key={prop.name}
        label={prop.label}
        placeholder={prop.label}
        searchable
        clearable
        data={stateOptions}
        value={selectedStateCodeFromName}
        disabled={!selectedCountryCode}
        required={effectiveMandatory}
        withAsterisk={!!effectiveMandatory}
        error={composedError}
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

    return wrap(
      <Select
        key={prop.name}
        label={prop.label}
        placeholder={prop.label}
        searchable
        clearable
        data={cityOptions}
        value={selectedCityKey}
        disabled={!selectedCountryCode}
        required={effectiveMandatory}
        withAsterisk={!!effectiveMandatory}
        error={composedError}
        onChange={(val) => {
          if (!val) {
            onChange(prop.name, "");
            return;
          }
          const [cityName, stateCode] = val.split("::");
          onChange(prop.name, cityName);

          // Autoseleccionar departamento por NOMBRE
          const stateName = stateByCode.get(stateCode || "")?.name ?? "";
          if ("departamento" in (formValues ?? {}))
            onChange("departamento", stateName);

          // Mantener país correcto por NOMBRE (ES) e ISO
          const info = selectedCountryCode
            ? countryByCode.get(selectedCountryCode)
            : undefined;
          if ("pais" in (formValues ?? {})) {
            const current = (formValues?.pais as string) || "";
            const nameES = info?.nameES ?? "";
            if (!current || current !== nameES) onChange("pais", nameES);
          }
          if ("pais_iso" in (formValues ?? {})) {
            const currentISO = (formValues?.pais_iso as string) || "";
            if (!currentISO || currentISO !== selectedCountryCode)
              onChange("pais_iso", selectedCountryCode);
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
      return wrap(
        <TextInput
          key={prop.name}
          {...common}
          type={isPhoneField ? "tel" : "text"}
          inputMode={isPhoneField || isIdField ? "numeric" : "text"}
          maxLength={isPhoneField || isIdField ? 15 : undefined} // límite duro
          onKeyDown={numericKeyDown}
          onPaste={numericPaste}
        />
      );
    case PropertyType.EMAIL:
      return wrap(
        <TextInput key={prop.name} {...common} type="email" inputMode="email" />
      );
    case PropertyType.CODEAREA:
      return wrap(
        <Textarea
          key={prop.name}
          {...common}
          onBlur={(e) => onChange(prop.name, validateOnBlur(e))}
          onKeyDown={numericKeyDown}
          onPaste={numericPaste}
        />
      );
    case PropertyType.BOOLEAN:
      return wrap(
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
      return wrap(
        <Select
          key={prop.name}
          label={prop.label}
          data={Array.isArray(prop.options) ? prop.options : []}
          placeholder={prop.label}
          required={effectiveMandatory}
          withAsterisk={!!effectiveMandatory}
          error={composedError}
          value={value || null}
          onChange={(val) => onChange(prop.name, val)}
          mb="sm"
          searchable
          clearable
          description={hintText}
        />
      );
    default:
      return wrap(<TextInput key={prop.name} {...common} />);
  }
}
