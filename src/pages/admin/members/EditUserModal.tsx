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
}

type AnyRecord = Record<string, any>;

function toSelectData(
  options: any[] = []
): Array<string | { value: string; label: string }> {
  if (!Array.isArray(options)) return [];
  // Acepta ["a","b"] o [{label,value}]
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
  // Si no hay triggerValues, con que el campo dependiente tenga valor
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
}: Props) {
  // Sólo props visibles
  const visibleProps = useMemo(
    () => (userProps ?? []).filter((p) => (p as any).visible !== false),
    [userProps]
  );

  const form = useForm<AnyRecord>({
    initialValues: {},
  });

  // Inicialización (sólo visibles)
  useEffect(() => {
    if (!user) return;
    const initialValues: AnyRecord = {};
    visibleProps.forEach((prop) => {
      const name = prop.name;
      const raw = user.properties?.[name];
      const t = prop.type.toLowerCase();

      if (t === "boolean") {
        initialValues[name] = String(raw).toLowerCase() === "true";
      } else {
        // Para selects (list), Mantine espera string | null
        initialValues[name] = raw ?? "";
      }
    });
    form.setValues(initialValues);
  }, [user, visibleProps]);

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
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
          />
        );

      case "email":
        return (
          <TextInput
            key={name}
            type="email"
            label={cleanLabel}
            disabled={!enabled}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
          />
        );

      case "textarea":
        return (
          <Textarea
            key={name}
            label={cleanLabel}
            disabled={!enabled}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
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
          />
        );

      case "list": {
        const data = toSelectData((prop as any).options);
        // Mantine Select requiere controlado: value y onChange(string | null)
        const value = form.values[name] ?? "";
        return (
          <Select
            key={name}
            label={cleanLabel}
            disabled={!enabled}
            data={data as any}
            searchable
            clearable
            // importante: controlado
            value={value === "" ? null : String(value)}
            onChange={(val) => form.setFieldValue(name, val ?? "")}
            // para evitar warnings cuando data cambia
            checkIconPosition="right"
            nothingFoundMessage="Sin opciones"
          />
        );
      }

      default:
        return (
          <TextInput
            key={name}
            label={cleanLabel}
            disabled={!enabled}
            value={form.values[name] ?? ""}
            onChange={(e) => form.setFieldValue(name, e.currentTarget.value)}
          />
        );
    }
  };

  const handleSubmit = (values: AnyRecord) => {
    // Sólo enviar las visibles
    const allowed = new Set(visibleProps.map((p) => p.name));
    const filtered: AnyRecord = {};
    Object.keys(values).forEach((k) => {
      if (allowed.has(k)) filtered[k] = values[k];
    });
    onSave(filtered);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Editar miembro">
      <Text>{user?._id}</Text>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {visibleProps.length === 0 ? (
            <Text size="sm" c="gray.6">
              No hay propiedades visibles para editar.
            </Text>
          ) : (
            visibleProps.map(renderField)
          )}
          <Button type="submit" mt="md">
            Guardar cambios
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}
