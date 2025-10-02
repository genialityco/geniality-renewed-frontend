// src/pages/AdminOrganizationEvents/EditUserModal.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Modal,
  Button,
  Stack,
  TextInput,
  Textarea,
  Checkbox,
  Select,
  Text,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { Country, State, City } from "country-state-city";
import type { OrganizationUser, UserProperty } from "../../../services/types";

interface Props {
  opened: boolean;
  onClose: () => void;
  user: OrganizationUser | null;
  userProps: UserProperty[];
  onSave: (updatedProperties: any) => void;
  mode?: "edit" | "create";
}

type AnyRecord = Record<string, any>;

function normalizeName(
  name?: string
): "country" | "city" | "department" | "other" {
  const n = (name ?? "").toLowerCase();
  if (/(country|pa[ií]s)/.test(n)) return "country";
  if (/(city|ciudad)/.test(n)) return "city";
  if (/(department|departamento|depto)/.test(n)) return "department";
  return "other";
}

function isPropEnabled(prop: UserProperty, values: AnyRecord): boolean {
  const dep: any = (prop as any).dependency;
  if (!dep || !dep.fieldName) return true;
  const depVal = values?.[dep.fieldName];
  const triggers: any[] = dep?.triggerValues ?? [];
  if (Array.isArray(triggers) && triggers.length > 0) {
    return triggers.includes(depVal);
  }
  return (
    depVal !== undefined && depVal !== null && String(depVal).trim() !== ""
  );
}

export default function EditUserModal({
  opened,
  onClose,
  user,
  userProps,
  onSave,
  mode = "edit",
}: Props) {
  const isCreateMode = mode === "create";
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sólo props visibles
  const visibleProps = useMemo(
    () => (userProps ?? []).filter((p) => (p as any).visible !== false),
    [userProps]
  );

  // Nombres reales de los campos
  const countryProp = useMemo(
    () => visibleProps.find((p) => normalizeName(p.name) === "country"),
    [visibleProps]
  );
  const cityProp = useMemo(
    () => visibleProps.find((p) => normalizeName(p.name) === "city"),
    [visibleProps]
  );
  const deptProp = useMemo(
    () => visibleProps.find((p) => normalizeName(p.name) === "department"),
    [visibleProps]
  );

  const countryName = countryProp?.name;
  const cityName = cityProp?.name;
  const deptName = deptProp?.name;

  // Datos de países
  const countries = useMemo(() => Country.getAllCountries(), []);
  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.isoCode, label: c.name })),
    [countries]
  );
  const countryByCode = useMemo(() => {
    const m = new Map<
      string,
      { name: string; iso: string; phonecode?: string | null }
    >();
    for (const c of countries)
      m.set(c.isoCode, {
        name: c.name,
        iso: c.isoCode,
        phonecode: (c as any).phonecode ?? null,
      });
    return m;
  }, [countries]);
  const countryCodeByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of countries) m.set(c.name, c.isoCode);
    return m;
  }, [countries]);

  const form = useForm<AnyRecord>({
    initialValues: {},
    validate: isCreateMode
      ? (values) => {
          const errors: AnyRecord = {};
          visibleProps.forEach((prop) => {
            const value = values[prop.name];
            const isEmpty = value == null || value === "";
            const enabled = isPropEnabled(prop, values);

            // Validar campos obligatorios
            if (enabled && prop.mandatory && isEmpty) {
              errors[prop.name] = "Este campo es obligatorio";
            }

            // Validación email
            if (prop.type.toLowerCase() === "email" && value) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
              if (!emailRegex.test(value)) {
                errors[prop.name] = "Formato de correo inválido";
              }
            }

            // Validación ID/documento
            const lname = prop.name.toLowerCase();
            const isIdField =
              lname === "id" ||
              lname === "documento" ||
              lname === "documentoid" ||
              lname === "cedula" ||
              lname === "cédula";
            if (isIdField && value) {
              const digits = String(value).replace(/\D+/g, "");
              if (digits.length < 6 || digits.length > 15) {
                errors[prop.name] = "Debe tener entre 6 y 15 dígitos";
              }
            }

            // Validación teléfono
            const isPhoneField =
              lname.includes("phone") ||
              lname.includes("cel") ||
              lname.includes("tel") ||
              lname.includes("contacto");
            if (isPhoneField && value) {
              const digits = String(value).replace(/\D+/g, "");
              if (digits.length < 6 || digits.length > 15) {
                errors[prop.name] = "Debe tener entre 6 y 15 dígitos";
              }
            }

            // Validación nombres/apellidos
            const isNamesField =
              lname === "nombres" ||
              lname === "names" ||
              lname === "apellidos" ||
              lname === "surnames";
            if (isNamesField && value) {
              const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]*$/;
              if (!ONLY_LETTERS_RE.test(value)) {
                errors[prop.name] = "Solo letras y espacios";
              }
            }
          });
          return errors;
        }
      : undefined,
  });

  // País seleccionado
  const selectedCountryName = countryName
    ? (form.values[countryName] as string)
    : "";
  const selectedCountryCode = countryCodeByName.get(selectedCountryName) || "";

  // Estados/Departamentos
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

  const selectedStateName = deptName ? (form.values[deptName] as string) : "";
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

  const selectedCityName = cityName ? (form.values[cityName] as string) : "";
  const selectedCityKey = useMemo(() => {
    if (!selectedCityName) return null;
    if (selectedStateCode) return `${selectedCityName}::${selectedStateCode}`;
    const found = cities?.find((c) => c.name === selectedCityName);
    return found ? `${found.name}::${found.stateCode ?? ""}` : null;
  }, [selectedCityName, selectedStateCode, cities]);

  // Helper: indicativo de país
  const getNormalizedPhoneCode = (code?: string | null) => {
    if (!code) return "";
    const first = String(code).split(",")[0].trim();
    return first ? `+${first.replace(/^\+/, "")}` : "";
  };

  // Helper: ¿El país seleccionado es Colombia?
  const isColombia = selectedCountryName === "Colombia";

  // Sanitización para campos numéricos
  const sanitizeNumeric = useCallback((raw: any, maxLength = 15) => {
    const str = raw?.currentTarget ? raw.currentTarget.value : raw;
    return String(str || "")
      .replace(/\D+/g, "")
      .slice(0, maxLength);
  }, []);

  // Sanitización para nombres/apellidos
  const sanitizeNames = useCallback((raw: any) => {
    const str = raw?.currentTarget ? raw.currentTarget.value : raw;
    return String(str || "").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]/g, "");
  }, []);

  // Validación en blur
  const validateOnBlur = useCallback((prop: UserProperty, value: any) => {
    const lname = prop.name.toLowerCase();
    const val = typeof value === "string" ? value.trimEnd() : value;

    // Nombres/Apellidos
    const isNamesField =
      lname === "nombres" ||
      lname === "names" ||
      lname === "apellidos" ||
      lname === "surnames";
    if (isNamesField && val) {
      const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]*$/;
      if (!ONLY_LETTERS_RE.test(val)) {
        setFieldErrors((prev) => ({
          ...prev,
          [prop.name]: "Solo letras y espacios.",
        }));
        return;
      }
    }

    // Email
    if (prop.type.toLowerCase() === "email" && val) {
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!EMAIL_RE.test(val)) {
        setFieldErrors((prev) => ({
          ...prev,
          [prop.name]: "Formato de correo inválido (ej. nombre@dominio.com).",
        }));
        return;
      }
    }

    // ID/Documento/Teléfono
    const isIdField =
      lname === "id" ||
      lname === "documento" ||
      lname === "documentoid" ||
      lname === "cedula" ||
      lname === "cédula";
    const isPhoneField =
      lname.includes("phone") ||
      lname.includes("cel") ||
      lname.includes("tel") ||
      lname.includes("contacto");

    if ((isIdField || isPhoneField) && val) {
      const digits = String(val).replace(/\D+/g, "");
      if (!/^\d+$/.test(digits) || digits.length < 6 || digits.length > 15) {
        setFieldErrors((prev) => ({
          ...prev,
          [prop.name]: "Debe contener solo números y entre 6 y 15 dígitos.",
        }));
        return;
      }
    }

    // Limpiar error si todo está bien
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[prop.name];
      return newErrors;
    });
  }, []);

  // Inicialización
  useEffect(() => {
    const initialValues: AnyRecord = {};

    if (isCreateMode) {
      visibleProps.forEach((prop) => {
        const t = prop.type.toLowerCase();
        initialValues[prop.name] = t === "boolean" ? false : "";
      });
    } else if (user) {
      visibleProps.forEach((prop) => {
        const name = prop.name;
        const raw = user.properties?.[name];
        const t = prop.type.toLowerCase();

        if (t === "boolean") {
          initialValues[name] = String(raw).toLowerCase() === "true";
        } else {
          initialValues[name] = raw ?? "";
        }
      });
    }

    form.setValues(initialValues);
    form.resetDirty();
    setFieldErrors({});
    setIsSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, visibleProps, isCreateMode, opened]);

  // Limpiar valores cuando una dependencia deshabilita un campo
  useEffect(() => {
    visibleProps.forEach((prop) => {
      const name = prop.name;
      const enabled = isPropEnabled(prop, form.values);
      if (!enabled && form.values[name]) {
        form.setFieldValue(
          name,
          prop.type.toLowerCase() === "boolean" ? false : ""
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values, visibleProps]);

  // Efecto: si country cambia y NO es Colombia -> limpiar city & department
  useEffect(() => {
    if (!countryName) return;
    const shouldShowDeptoCity = isColombia;

    if (!shouldShowDeptoCity) {
      if (cityName && form.values[cityName] !== "No aplica") {
        form.setFieldValue(cityName, "No aplica");
      }
      if (deptName && form.values[deptName] !== "No aplica") {
        form.setFieldValue(deptName, "No aplica");
      }
    } else {
      // Si es Colombia y tienen "No aplica", limpiar
      if (cityName && form.values[cityName] === "No aplica") {
        form.setFieldValue(cityName, "");
      }
      if (deptName && form.values[deptName] === "No aplica") {
        form.setFieldValue(deptName, "");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountryName]);

  // Auto-indicativo cuando cambia país
  useEffect(() => {
    if (!selectedCountryCode || !countryName) return;
    const indicativoField = visibleProps.find(
      (p) => p.name.toLowerCase() === "indicativodepais"
    );
    if (!indicativoField) return;

    const phonecode = countryByCode.get(selectedCountryCode)?.phonecode ?? null;
    const normalized = getNormalizedPhoneCode(phonecode);
    if (normalized && form.values.indicativodepais !== normalized) {
      form.setFieldValue("indicativodepais", normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountryCode]);

  // Renderizador de campos
  const renderField = (prop: UserProperty) => {
    const name = prop.name;
    const lname = name.toLowerCase();
    const cleanLabel =
      typeof prop.label === "string"
        ? prop.label.replace(/<[^>]*>?/gm, "")
        : prop.label;

    const type = prop.type.toLowerCase();
    const enabled = isPropEnabled(prop, form.values);
    const nName = normalizeName(name);

    const isIdField =
      lname === "id" ||
      lname === "documento" ||
      lname === "documentoid" ||
      lname === "cedula" ||
      lname === "cédula";

    const isPhoneField =
      lname.includes("phone") ||
      lname.includes("cel") ||
      lname.includes("tel") ||
      lname.includes("contacto");

    const isNamesField =
      lname === "nombres" ||
      lname === "names" ||
      lname === "apellidos" ||
      lname === "surnames";

    const effectiveMandatory =
      prop.mandatory ||
      ((nName === "city" || nName === "department") && isColombia);

    const error = fieldErrors[name] || form.errors[name];

    // Ocultar city/department si no es Colombia
    if ((nName === "city" || nName === "department") && !isColombia) {
      return null;
    }

    // ---------- COUNTRY ----------
    if (nName === "country") {
      return (
        <Select
          key={name}
          label={cleanLabel}
          placeholder={cleanLabel}
          searchable
          clearable
          data={countryOptions}
          value={selectedCountryCode || null}
          disabled={!enabled}
          required={isCreateMode && effectiveMandatory}
          error={error}
          onChange={(code) => {
            const countryName = code ? countryByCode.get(code)?.name ?? "" : "";
            form.setFieldValue(name, countryName);
          }}
        />
      );
    }

    // ---------- DEPARTMENT ----------
    if (nName === "department") {
      const selectedStateCodeFromName =
        states.find((s) => s.name === (form.values[name] as string))?.isoCode ??
        null;

      return (
        <Select
          key={name}
          label={cleanLabel}
          placeholder={cleanLabel}
          searchable
          clearable
          data={stateOptions}
          value={selectedStateCodeFromName}
          disabled={!enabled || !selectedCountryCode}
          required={isCreateMode && effectiveMandatory}
          error={error}
          onChange={(code) => {
            const stateName = code ? stateByCode.get(code)?.name ?? "" : "";
            form.setFieldValue(name, stateName);
            if (cityName) form.setFieldValue(cityName, "");
          }}
        />
      );
    }

    // ---------- CITY ----------
    if (nName === "city") {
      return (
        <Select
          key={name}
          label={cleanLabel}
          placeholder={cleanLabel}
          searchable
          clearable
          data={cityOptions}
          value={selectedCityKey}
          disabled={!enabled || !selectedCountryCode}
          required={isCreateMode && effectiveMandatory}
          error={error}
          onChange={(val) => {
            if (!val) {
              form.setFieldValue(name, "");
              return;
            }
            const [cityName, stateCode] = val.split("::");
            form.setFieldValue(name, cityName);

            // Autoseleccionar departamento
            const stateName = stateByCode.get(stateCode || "")?.name ?? "";
            if (deptName) form.setFieldValue(deptName, stateName);

            // Mantener país correcto
            const countryName =
              countryByCode.get(selectedCountryCode)?.name ?? "";
            if (countryProp?.name) {
              const current = (form.values[countryProp.name] as string) || "";
              if (!current || current !== countryName) {
                form.setFieldValue(countryProp.name, countryName);
              }
            }
          }}
        />
      );
    }

    // ---------- Resto de tipos ----------
    switch (type) {
      case "text":
      case "codearea":
        return (
          <TextInput
            key={name}
            label={cleanLabel}
            placeholder={isPhoneField ? "3121234567" : cleanLabel}
            disabled={!enabled}
            required={isCreateMode && effectiveMandatory}
            type={isPhoneField ? "tel" : "text"}
            inputMode={isPhoneField || isIdField ? "numeric" : "text"}
            maxLength={isPhoneField || isIdField ? 15 : undefined}
            value={form.values[name] ?? ""}
            onChange={(e) => {
              let val = e.currentTarget.value;
              if (isIdField || isPhoneField) {
                val = sanitizeNumeric(val);
              } else if (isNamesField) {
                val = sanitizeNames(val);
              }
              form.setFieldValue(name, val);
            }}
            onBlur={() => validateOnBlur(prop, form.values[name])}
            error={error}
          />
        );

      case "email":
        return (
          <TextInput
            key={name}
            type="email"
            inputMode="email"
            label={cleanLabel}
            placeholder={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && effectiveMandatory}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
            onBlur={() => validateOnBlur(prop, form.values[name])}
            error={error}
          />
        );

      case "textarea":
        return (
          <Textarea
            key={name}
            label={cleanLabel}
            placeholder={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && effectiveMandatory}
            value={form.values[name] ?? ""}
            onChange={(e) => {
              let val = e.currentTarget.value;
              if (isIdField || isPhoneField) {
                val = sanitizeNumeric(val);
              }
              form.setFieldValue(name, val);
            }}
            onBlur={() => validateOnBlur(prop, form.values[name])}
            error={error}
          />
        );

      case "boolean":
        return (
          <Checkbox
            key={name}
            label={cleanLabel}
            disabled={!enabled}
            checked={Boolean(form.values[name])}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.checked)}
            error={error}
          />
        );

      case "list": {
        const data = Array.isArray((prop as any).options)
          ? (prop as any).options.map((opt: any) =>
              typeof opt === "string"
                ? { value: opt, label: opt }
                : {
                    value: opt.value ?? opt.label,
                    label: opt.label ?? opt.value,
                  }
            )
          : [];
        const value = form.values[name] ?? "";
        return (
          <Select
            key={name}
            label={cleanLabel}
            placeholder={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && effectiveMandatory}
            data={data}
            searchable
            clearable
            value={value === "" ? null : String(value)}
            onChange={(val) => form.setFieldValue(name, val ?? "")}
            error={error}
          />
        );
      }

      default:
        return (
          <TextInput
            key={name}
            label={cleanLabel}
            placeholder={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && effectiveMandatory}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
            error={error}
          />
        );
    }
  };

  const handleSubmit = async (values: AnyRecord) => {
    // Validar en modo crear
    if (isCreateMode) {
      const validation = form.validate();
      if (validation.hasErrors || Object.keys(fieldErrors).length > 0) return;
    }

    // Activar estado de carga
    setIsSubmitting(true);

    try {
      // Sólo enviar las visibles
      const allowed = new Set(visibleProps.map((p) => p.name));
      const filtered: AnyRecord = {};
      Object.keys(values).forEach((k) => {
        if (allowed.has(k)) filtered[k] = values[k];
      });

      await onSave(filtered);
    } catch (error) {
      // Si hay error, desactivar el estado de carga
      setIsSubmitting(false);
    }
    // No desactivamos aquí porque el modal se cerrará
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isCreateMode ? "Crear nuevo miembro" : "Editar miembro"}
      size="lg"
    >
      {!isCreateMode && user?._id && (
        <Text size="sm" c="dimmed" mb="xs">
          {user._id}
        </Text>
      )}

      {isCreateMode && (
        <Text size="sm" c="dimmed" mb="md">
          La contraseña inicial será el número de identificación (ID/Documento).
        </Text>
      )}

      <Stack gap="md">
        {visibleProps.length === 0 ? (
          <Text size="sm" c="gray.6">
            No hay propiedades visibles para {isCreateMode ? "crear" : "editar"}
            .
          </Text>
        ) : (
          visibleProps.map(renderField)
        )}
        <Button
          onClick={() => handleSubmit(form.values)}
          mt="md"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isCreateMode ? "Crear usuario" : "Guardar cambios"}
        </Button>
      </Stack>
    </Modal>
  );
}
