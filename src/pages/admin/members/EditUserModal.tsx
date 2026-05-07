// src/pages/AdminOrganizationEvents/EditUserModal.tsx
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  onSave: (updatedProperties: any, memberShipStatus?: boolean) => void;
  mode?: "edit" | "create";
}

type AnyRecord = Record<string, any>;

function isValidPropConfig(prop: UserProperty): boolean {
  const hasValidName =
    typeof prop?.name === "string" && prop.name.trim().length > 0;
  const hasValidType =
    typeof (prop as any)?.type === "string" &&
    String((prop as any).type).trim().length > 0;

  return hasValidName && hasValidType;
}

function normalizeName(
  name?: string,
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
  const [memberShipStatus, setMemberShipStatus] = useState(false);

  const lastInitKeyRef = useRef<string | null>(null);

  // Sólo props visibles
  const visibleProps = useMemo(
    () =>
      (userProps ?? []).filter(
        (p) => (p as any).visible !== false && isValidPropConfig(p),
      ),
    [userProps],
  );

  // Clave estable para inicializar solo cuando realmente cambie el contexto del modal
  const initKey = useMemo(() => {
    const propsKey = visibleProps
      .map((p) => `${p.name}:${String((p as any).type).toLowerCase()}`)
      .join("|");

    const userKey = isCreateMode ? "create" : (user?._id ?? "no-user");

    return `${mode}|${userKey}|${propsKey}`;
  }, [visibleProps, isCreateMode, mode, user?._id]);

  // Nombres reales de los campos
  const countryProp = useMemo(
    () => visibleProps.find((p) => normalizeName(p.name) === "country"),
    [visibleProps],
  );

  const cityProp = useMemo(
    () => visibleProps.find((p) => normalizeName(p.name) === "city"),
    [visibleProps],
  );

  const deptProp = useMemo(
    () => visibleProps.find((p) => normalizeName(p.name) === "department"),
    [visibleProps],
  );

  const countryName = countryProp?.name;
  const cityName = cityProp?.name;
  const deptName = deptProp?.name;

  // Datos de países
  const countries = useMemo(() => Country.getAllCountries(), []);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.isoCode, label: c.name })),
    [countries],
  );

  const countryByCode = useMemo(() => {
    const m = new Map<
      string,
      { name: string; iso: string; phonecode?: string | null }
    >();

    for (const c of countries) {
      m.set(c.isoCode, {
        name: c.name,
        iso: c.isoCode,
        phonecode: (c as any).phonecode ?? null,
      });
    }

    return m;
  }, [countries]);

  const countryCodeByName = useMemo(() => {
    const m = new Map<string, string>();

    for (const c of countries) {
      m.set(c.name, c.isoCode);
    }

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

            if (enabled && prop.mandatory && isEmpty) {
              errors[prop.name] = "Este campo es obligatorio";
            }

            if (prop.type.toLowerCase() === "email" && value) {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
              if (!emailRegex.test(String(value))) {
                errors[prop.name] = "Formato de correo inválido";
              }
            }

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

            const isNamesField =
              lname === "nombres" ||
              lname === "names" ||
              lname === "apellidos" ||
              lname === "surnames";

            if (isNamesField && value) {
              const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]*$/;
              if (!ONLY_LETTERS_RE.test(String(value))) {
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
    ? String(form.values[countryName] ?? "")
    : "";

  const selectedCountryCode = countryCodeByName.get(selectedCountryName) || "";

  // Estados/Departamentos
  const states = useMemo(
    () =>
      selectedCountryCode ? State.getStatesOfCountry(selectedCountryCode) : [],
    [selectedCountryCode],
  );

  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.isoCode, label: s.name })),
    [states],
  );

  const stateByCode = useMemo(() => {
    const m = new Map<string, { name: string; code: string }>();

    for (const s of states) {
      m.set(s.isoCode, { name: s.name, code: s.isoCode });
    }

    return m;
  }, [states]);

  const selectedStateName = deptName ? String(form.values[deptName] ?? "") : "";

  const selectedStateCode =
    states.find((s) => s.name === selectedStateName)?.isoCode || "";

  // Ciudades
  const cities = useMemo(() => {
    if (!selectedCountryCode) return [];

    if (selectedStateCode) {
      return (
        City.getCitiesOfState(selectedCountryCode, selectedStateCode) ?? []
      );
    }

    return City.getCitiesOfCountry(selectedCountryCode) ?? [];
  }, [selectedCountryCode, selectedStateCode]);

  const cityOptions = useMemo(
    () =>
      cities.map((c) => ({
        value: `${c.name}::${c.stateCode ?? ""}`,
        label: c.name,
      })),
    [cities],
  );

  const selectedCityName = cityName ? String(form.values[cityName] ?? "") : "";

  const selectedCityKey = useMemo(() => {
    if (!selectedCityName) return null;

    if (selectedStateCode) {
      return `${selectedCityName}::${selectedStateCode}`;
    }

    const found = cities.find((c) => c.name === selectedCityName);
    return found ? `${found.name}::${found.stateCode ?? ""}` : null;
  }, [selectedCityName, selectedStateCode, cities]);

  const getNormalizedPhoneCode = (code?: string | null) => {
    if (!code) return "";
    const first = String(code).split(",")[0].trim();
    return first ? `+${first.replace(/^\+/, "")}` : "";
  };

  const isColombia = selectedCountryName === "Colombia";

  const sanitizeNumeric = useCallback((raw: any, maxLength = 15) => {
    const str = raw?.currentTarget ? raw.currentTarget.value : raw;
    return String(str || "")
      .replace(/\D+/g, "")
      .slice(0, maxLength);
  }, []);

  const sanitizeNames = useCallback((raw: any) => {
    const str = raw?.currentTarget ? raw.currentTarget.value : raw;
    return String(str || "").replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]/g, "");
  }, []);

  const validateOnBlur = useCallback((prop: UserProperty, value: any) => {
    const lname = prop.name.toLowerCase();
    const val = typeof value === "string" ? value.trimEnd() : value;

    const isNamesField =
      lname === "nombres" ||
      lname === "names" ||
      lname === "apellidos" ||
      lname === "surnames";
    if (isNamesField && val) {
      const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]*$/;
      if (!ONLY_LETTERS_RE.test(String(val))) {
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
      if (!EMAIL_RE.test(String(val))) {
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

    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[prop.name];
      return newErrors;
    });
  }, []);

  // Inicialización controlada: solo al abrir el modal o cuando cambia de usuario/esquema real
  useEffect(() => {
    if (!opened) {
      lastInitKeyRef.current = null;
      return;
    }

    if (lastInitKeyRef.current === initKey) {
      return;
    }

    const initialValues: AnyRecord = {};

    if (isCreateMode) {
      visibleProps.forEach((prop) => {
        const t = prop.type.toLowerCase();
        initialValues[prop.name] = t === "boolean" ? false : "";
      });
      setMemberShipStatus(false);
    } else if (user) {
      visibleProps.forEach((prop) => {
        const name = prop.name;
        const raw = user.properties?.[name];
        const t = prop.type.toLowerCase();

        initialValues[name] =
          t === "boolean" ? String(raw).toLowerCase() === "true" : (raw ?? "");
      });
      setMemberShipStatus(user.memberShipStatus ?? false);
    }

    form.setValues(initialValues);
    form.resetDirty();
    setFieldErrors({});
    setIsSubmitting(false);
    lastInitKeyRef.current = initKey;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initKey, isCreateMode, user, visibleProps]);

  // Limpiar valores cuando una dependencia deshabilita un campo
  useEffect(() => {
    visibleProps.forEach((prop) => {
      const name = prop.name;
      const enabled = isPropEnabled(prop, form.values);
      if (!enabled && form.values[name]) {
        form.setFieldValue(
          name,
          prop.type.toLowerCase() === "boolean" ? false : "",
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values, visibleProps]);

  // Si country cambia y no es Colombia -> city y department no aplican
  useEffect(() => {
    if (!countryName) return;

    if (!isColombia) {
      if (cityName && form.values[cityName] !== "No aplica") {
        form.setFieldValue(cityName, "No aplica");
      }

      if (deptName && form.values[deptName] !== "No aplica") {
        form.setFieldValue(deptName, "No aplica");
      }
    } else {
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
    const indicativoField = visibleProps.find(
      (p) => p.name.toLowerCase() === "indicativodepais",
    );

    if (!indicativoField) return;

    if (!selectedCountryCode) {
      if (form.values[indicativoField.name]) {
        form.setFieldValue(indicativoField.name, "");
      }
      return;
    }

    const phonecode = countryByCode.get(selectedCountryCode)?.phonecode ?? null;
    const normalized = getNormalizedPhoneCode(phonecode);

    if (normalized && form.values[indicativoField.name] !== normalized) {
      form.setFieldValue(indicativoField.name, normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountryCode, visibleProps, countryByCode]);

  const renderField = (prop: UserProperty) => {
    const name = prop.name;
    const lname = name.toLowerCase();
    const cleanLabel =
      typeof prop.label === "string"
        ? prop.label.replace(/<[^>]*>?/gm, "")
        : String(prop.label ?? name);

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

    if ((nName === "city" || nName === "department") && !isColombia) {
      return null;
    }

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
            const currentCountryName = code
              ? (countryByCode.get(code)?.name ?? "")
              : "";
            form.setFieldValue(name, currentCountryName);
          }}
        />
      );
    }

    if (nName === "department") {
      const selectedStateCodeFromName =
        states.find((s) => s.name === String(form.values[name] ?? ""))
          ?.isoCode ?? null;

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
            const stateName = code ? (stateByCode.get(code)?.name ?? "") : "";
            form.setFieldValue(name, stateName);

            if (cityName) {
              form.setFieldValue(cityName, "");
            }
          }}
        />
      );
    }

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

            const [currentCityName, stateCode] = val.split("::");
            form.setFieldValue(name, currentCityName);

            const stateName = stateByCode.get(stateCode || "")?.name ?? "";
            if (deptName) {
              form.setFieldValue(deptName, stateName);
            }

            const currentCountryName =
              countryByCode.get(selectedCountryCode)?.name ?? "";

            if (countryProp?.name) {
              const current = String(form.values[countryProp.name] ?? "");
              if (!current || current !== currentCountryName) {
                form.setFieldValue(countryProp.name, currentCountryName);
              }
            }
          }}
        />
      );
    }

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
                  },
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
    if (isCreateMode) {
      const validation = form.validate();
      if (validation.hasErrors || Object.keys(fieldErrors).length > 0) return;
    }

    setIsSubmitting(true);

    try {
      const allowed = new Set(visibleProps.map((p) => p.name));
      const filtered: AnyRecord = {};

      Object.keys(values).forEach((k) => {
        if (allowed.has(k)) {
          filtered[k] = values[k];
        }
      });

      await onSave(filtered, memberShipStatus);
    } catch (error) {
      setIsSubmitting(false);
    }
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

        <Checkbox
          label="Miembro exclusivo"
          description="Acceso a eventos exclusivos para miembros"
          checked={memberShipStatus}
          onChange={(e) => setMemberShipStatus(e.currentTarget.checked)}
          disabled={isSubmitting}
        />

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
