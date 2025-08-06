// src/pages/AdminOrganizationEvents/EditUserModal.tsx
import { useEffect } from "react";
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

export default function EditUserModal({
  opened,
  onClose,
  user,
  userProps,
  onSave,
}: Props) {
  const form = useForm({
    initialValues: {},
  });
  console.log(userProps);

  // Cuando el usuario cambia, actualiza los valores del formulario
  useEffect(() => {
    if (user) {
      const initialValues: Record<string, any> = {};
      userProps.forEach((prop) => {
        const name = prop.name;
        initialValues[name] = user.properties?.[name] ?? "";
        // Manejo de tipos para inicialización
        if (prop.type.toLowerCase() === "boolean") {
          initialValues[name] =
            String(user.properties?.[name]).toLowerCase() === "true";
        }
      });
      form.setValues(initialValues);
    }
  }, [user, userProps]);

  // Renderiza dinámicamente el campo del formulario según el tipo
  const renderField = (prop: UserProperty) => {
    const name = prop.name;
    const label = prop.label;

    // Se eliminó la etiqueta 'Text' que podía contener HTML
    // y se remplazó por una etiqueta 'label' simple.
    // El label del checkbox que tiene una URL se debe manejar con `dangerouslySetInnerHTML`
    // pero para este componente se recomienda solo mostrar el texto sin HTML.
    const cleanLabel = (
      label && typeof label === "string" ?
      label.replace(/<[^>]*>?/gm, "") :
      label
    );

    switch (prop.type.toLowerCase()) {
      case "text":
      case "codearea": // Añadido para el nuevo tipo `codearea`
      case "country": // Añadido para el nuevo tipo `country`
      case "city": // Añadido para el nuevo tipo `city`
        return (
          <TextInput
            key={name}
            label={cleanLabel}
            {...form.getInputProps(name)}
          />
        );
      case "email":
        return (
          <TextInput
            key={name}
            type="email"
            label={cleanLabel}
            {...form.getInputProps(name)}
          />
        );
      case "textarea":
        return (
          <Textarea
            key={name}
            label={cleanLabel}
            {...form.getInputProps(name)}
          />
        );
      case "boolean":
        return (
          <Checkbox
            key={name}
            label={cleanLabel}
            {...form.getInputProps(name, { type: "checkbox" })}
          />
        );
      case "list":
        // Aseguramos que `options` tenga el formato correcto para Select
        const selectData = (prop.options || []).map((option: any) =>
          typeof option === "string" ? option : option.value
        );
        return (
          <Select
            key={name}
            label={cleanLabel}
            data={selectData}
            {...form.getInputProps(name)}
          />
        );
      default:
        // Renderizar un TextInput genérico para tipos no mapeados
        return (
          <TextInput
            key={name}
            label={cleanLabel}
            {...form.getInputProps(name)}
          />
        );
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Editar miembro">
      <Text>{user?._id}</Text>
      <form
        onSubmit={form.onSubmit((values) => {
          onSave(values);
        })}
      >
        <Stack gap="md">
          {userProps.map(renderField)}
          <Button type="submit" mt="md">
            Guardar cambios
          </Button>
        </Stack>
      </form>
    </Modal>
  );
}