// src/pages/AdminOrganizationEvents/EditUserModal.tsx
import { useEffect, useMemo } from "react";
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
import type { OrganizationUser, UserProperty } from "../../../services/types";

interface Props {
  opened: boolean;
  onClose: () => void;
  user: OrganizationUser | null;
  userProps: UserProperty[];
  onSave: (updatedProperties: any) => void;
  mode?: "edit" | "create"; // ← NUEVO: modo de operación
}

type AnyRecord = Record<string, any>;

function toSelectData(
  options: any[] = []
): Array<string | { value: string; label: string }> {
  if (!Array.isArray(options)) return [];
  if (options.length > 0 && typeof options[0] === "object") {
    return options.map((o: any) => ({
      value: String(o.value ?? o.label ?? ""),
      label: String(o.label ?? o.value ?? ""),
    }));
  }
  return options.map((s) => String(s));
}

function isPropEnabled(prop: UserProperty, values: AnyRecord): boolean {
  const dep: any = (prop as any).dependency;
  if (!dep || !dep.fieldName) return true;
  const depVal = values?.[dep.fieldName];
  const triggers: any[] = dep.triggerValues ?? [];
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
  mode = "edit", // ← Por defecto: editar
}: Props) {
  const isCreateMode = mode === "create";

  // Sólo props visibles
  const visibleProps = useMemo(
    () => (userProps ?? []).filter((p) => (p as any).visible !== false),
    [userProps]
  );

  const form = useForm<AnyRecord>({
    initialValues: {},
    validate: isCreateMode
      ? (values) => {
          const errors: AnyRecord = {};
          visibleProps.forEach((prop) => {
            const value = values[prop.name];
            const isEmpty = value == null || value === "";

            // Validar campos obligatorios visibles y habilitados
            const enabled = isPropEnabled(prop, values);
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
              lname === "cedula" ||
              lname === "cédula";
            if (isIdField && value) {
              const digits = String(value).replace(/\D+/g, "");
              if (digits.length < 6 || digits.length > 15) {
                errors[prop.name] = "Debe tener entre 6 y 15 dígitos";
              }
            }
          });
          return errors;
        }
      : undefined, // En modo edición no validamos en el form
  });

  // Inicialización
  useEffect(() => {
    const initialValues: AnyRecord = {};

    if (isCreateMode) {
      // Modo crear: valores vacíos
      visibleProps.forEach((prop) => {
        const t = prop.type.toLowerCase();
        initialValues[prop.name] = t === "boolean" ? false : "";
      });
    } else if (user) {
      // Modo editar: valores del usuario
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

  const renderField = (prop: UserProperty) => {
    const name = prop.name;
    const cleanLabel =
      typeof prop.label === "string"
        ? prop.label.replace(/<[^>]*>?/gm, "")
        : prop.label;

    const type = prop.type.toLowerCase();
    const enabled = isPropEnabled(prop, form.values);

    switch (type) {
      case "text":
      case "codearea":
      case "country":
      case "city":
        return (
          <TextInput
            key={name}
            label={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && prop.mandatory}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
            error={form.errors[name]}
          />
        );

      case "email":
        return (
          <TextInput
            key={name}
            type="email"
            label={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && prop.mandatory}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
            error={form.errors[name]}
          />
        );

      case "textarea":
        return (
          <Textarea
            key={name}
            label={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && prop.mandatory}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
            error={form.errors[name]}
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
            error={form.errors[name]}
          />
        );

      case "list": {
        const data = toSelectData((prop as any).options);
        const value = form.values[name] ?? "";
        return (
          <Select
            key={name}
            label={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && prop.mandatory}
            data={data as any}
            searchable
            clearable
            value={value === "" ? null : String(value)}
            onChange={(val) => form.setFieldValue(name, val ?? "")}
            checkIconPosition="right"
            nothingFoundMessage="Sin opciones"
            error={form.errors[name]}
          />
        );
      }

      default:
        return (
          <TextInput
            key={name}
            label={cleanLabel}
            disabled={!enabled}
            required={isCreateMode && prop.mandatory}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
            error={form.errors[name]}
          />
        );
    }
  };

  const handleSubmit = (values: AnyRecord) => {
    // Validar en modo crear
    if (isCreateMode) {
      const validation = form.validate();
      if (validation.hasErrors) return;
    }

    // Sólo enviar las visibles
    const allowed = new Set(visibleProps.map((p) => p.name));
    const filtered: AnyRecord = {};
    Object.keys(values).forEach((k) => {
      if (allowed.has(k)) filtered[k] = values[k];
    });
    onSave(filtered);
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
        <Button onClick={() => handleSubmit(form.values)} mt="md">
          {isCreateMode ? "Crear usuario" : "Guardar cambios"}
        </Button>
      </Stack>
    </Modal>
  );
}
