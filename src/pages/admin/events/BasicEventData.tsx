/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import {
  TextInput,
  Button,
  Image,
  Loader,
  Group,
  Box,
  FileInput,
  Stack,
  Title,
  Paper,
  Grid,
  Divider,
  Text,
  Select,
  Alert,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { uploadImageToFirebase } from "../../../utils/uploadImageToFirebase";
import { createEvent, updateEvent } from "../../../services/eventService";
import type { Event } from "../../../services/types";
import { useUser } from "../../../context/UserContext";
import { useOrganization } from "../../../context/OrganizationContext";

interface Props {
  formData: Partial<Event>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Event>>>;
  organizationId: string; // puedes dejarlo por compatibilidad, no lo usamos aquí
  eventId: string;
  isEditing: boolean;
  onSaved: (newEventId?: string) => void;
}

export default function BasicEventData({
  formData,
  setFormData,
  organizationId,
  eventId,
  isEditing,
  onSaved,
}: Props) {
  const { userId } = useUser();
  const { organization } = useOrganization();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ===== Helpers de formulario =====
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (
    name: keyof Pick<Event, "datetime_from" | "datetime_to">,
    date: Date | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date ? date.toISOString() : null,
    }));
  };

  const handleSelectChange = (
    name: keyof Pick<Event, "visibility" | "type_event">,
    value: string | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleFileUpload = async (file: File | null, path: string[]) => {
    if (!file) return;
    setUploading(path.join("."));
    try {
      const url = await uploadImageToFirebase(file, "event_images");
      setFormData((prev) => {
        if (path.length === 1) {
          return { ...prev, [path[0]]: url };
        } else {
          return {
            ...prev,
            [path[0]]: { ...((prev as any)[path[0]] || {}), [path[1]]: url },
          };
        }
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error subiendo la imagen");
    } finally {
      setUploading(null);
    }
  };

  const getImage = (path: string[]) => {
    let v: any = formData;
    for (const key of path) {
      if (!v) return "";
      v = v[key];
    }
    return v || "";
  };

  // ===== Validación mínima antes de enviar =====
  const canSave = useMemo(() => {
    return Boolean(
      (formData.name || "").trim() &&
        formData.datetime_from &&
        formData.datetime_to &&
        (formData.visibility || "PUBLIC") &&
        userId &&
        organization?._id
    );
  }, [formData, userId, organization]);

  const handleSave = async () => {
    if (saving) return;

    setErrorMsg(null);

    // Validación explícita para que el usuario entienda qué falta
    const missing: string[] = [];
    if (!userId) missing.push("author_id (inicia sesión)");
    if (!organization?._id)
      missing.push("organizer_id (organización no detectada)");
    if (!formData.datetime_from) missing.push("datetime_from");
    if (!formData.datetime_to) missing.push("datetime_to");
    if (!formData.visibility) {
      // ponemos default, pero avisamos
      // no lo agregamos a missing para no bloquear
    }
    if (!formData.name?.trim()) missing.push("name");

    if (missing.length) {
      setErrorMsg(`Faltan campos requeridos: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    try {
      // Construimos el payload que espera tu backend
      const payload: Partial<Event> = {
        ...formData,
        author_id: userId!, // del UserContext
        organizer_id: organization!._id, // del OrganizationContext
        // defaults seguros si el user no selecciona
        visibility: (formData.visibility as any) || "PUBLIC",
        type_event: (formData.type_event as any) || "general",
      };

      if (isEditing) {
        // OJO: tu firma de updateEvent es (id, _eventId, data)
        // y en tu código original llamabas updateEvent(organizationId, eventId, formData)
        // Mantengo ese contrato:
        const updated = await updateEvent(eventId, payload);
        onSaved(updated._id);
      } else {
        const created = await createEvent(organizationId, payload);
        onSaved(created._id);
      }
    } catch (error: any) {
      console.error("Error saving event:", error);
      setErrorMsg(
        error?.response?.data?.message ||
          error?.message ||
          "No se pudo guardar el evento"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper p="sm" radius="lg" shadow="md" withBorder>
      <Title order={3} mb="md" ta="left">
        {isEditing ? "Editando Evento" : "Creando Evento"}
      </Title>
      <Divider mb="lg" />

      {errorMsg && (
        <Alert color="red" mb="md" title="No se pudo guardar">
          {errorMsg}
        </Alert>
      )}

      <Stack gap="xs">
        <TextInput
          label="Nombre del Evento"
          name="name"
          value={formData.name || ""}
          onChange={handleChange}
          required
        />

        <Group grow>
          <DateTimePicker
            label="Fecha y hora de inicio"
            value={
              formData.datetime_from ? new Date(formData.datetime_from) : null
            }
            onChange={(date) => handleDateChange("datetime_from", date)}
            required
            withSeconds
          />
          <DateTimePicker
            label="Fecha y hora de fin"
            value={formData.datetime_to ? new Date(formData.datetime_to) : null}
            onChange={(date) => handleDateChange("datetime_to", date)}
            required
            withSeconds
          />
        </Group>

        <Group grow>
          <Select
            label="Visibilidad"
            data={[
              { value: "PUBLIC", label: "Público" },
              { value: "PRIVATE", label: "Privado" },
            ]}
            value={(formData.visibility as any) || "PUBLIC"}
            onChange={(v) => handleSelectChange("visibility", v)}
            required
          />

          <Select
            label="Tipo de evento"
            data={[
              { value: "onlineEvent", label: "En línea" },
              { value: "inPerson", label: "Presencial" },
            ]}
            value={(formData.type_event as any) || "onlineEvent"}
            onChange={(v) => handleSelectChange("type_event", v)}
          />
        </Group>
      </Stack>

      <Divider my="xl" label="Imágenes y branding" labelPosition="center" />

      <Grid gutter="xl">
        {/* Miniatura */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FileInput
            label="Imagen miniatura"
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) => handleFileUpload(file, ["picture"])}
            disabled={!!uploading}
          />
          {formData.picture && (
            <Image
              key={formData.picture}
              src={formData.picture}
              alt="Miniatura"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "picture" ? "2px dashed #228be6" : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Banner superior */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FileInput
            label="Banner superior"
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "banner_image"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "banner_image"]) && (
            <Image
              key={getImage(["styles", "banner_image"])}
              src={getImage(["styles", "banner_image"])}
              alt="Banner superior"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.banner_image"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Banner de correo electrónico */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FileInput
            label="Banner Email"
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "banner_image_email"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "banner_image_email"]) && (
            <Image
              key={getImage(["styles", "banner_image_email"])}
              src={getImage(["styles", "banner_image_email"])}
              alt="Banner Email"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.banner_image_email"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Fondo */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FileInput
            label="Fondo del evento"
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "BackgroundImage"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "BackgroundImage"]) && (
            <Image
              key={getImage(["styles", "BackgroundImage"])}
              src={getImage(["styles", "BackgroundImage"])}
              alt="Fondo"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.BackgroundImage"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Logo */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FileInput
            label="Logo"
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "menu_image"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "menu_image"]) && (
            <Image
              key={getImage(["styles", "menu_image"])}
              src={getImage(["styles", "menu_image"])}
              alt="Logo"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.menu_image"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Footer */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FileInput
            label="Imagen Footer"
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "banner_footer"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "banner_footer"]) && (
            <Image
              key={getImage(["styles", "banner_footer"])}
              src={getImage(["styles", "banner_footer"])}
              alt="Footer"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.banner_footer"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Footer Email */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FileInput
            label="Footer para Email"
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "banner_footer_email"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "banner_footer_email"]) && (
            <Image
              key={getImage(["styles", "banner_footer_email"])}
              src={getImage(["styles", "banner_footer_email"])}
              alt="Footer Email"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.banner_footer_email"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>

          {/*Imagen evento*/}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <FileInput
            label="Imagen Evento"
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "event_image"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "event_image"]) && (
            <Image
              key={getImage(["styles", "event_image"])}
              src={getImage(["styles", "event_image"])}
              alt="Imagen Evento"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.event_image"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>
      </Grid>

      <Divider my="xl" />

      <Group justify="space-between" mt="md">
        <Text size="sm" c="dimmed">
          {userId ? `Autor listo: ${userId}` : "Inicia sesión para continuar"}
          {" · "}
          {organization?._id
            ? `Organizador: ${organization._id}`
            : "No se detectó organización en la URL"}
        </Text>
        <Button
          onClick={handleSave}
          size="md"
          loading={saving}
          style={{ minWidth: 180 }}
          disabled={!canSave}
        >
          {isEditing ? "Guardar Cambios" : "Crear Evento"}
        </Button>
      </Group>

      {/* Loader global para subida de imagen */}
      {uploading && (
        <Box style={{ textAlign: "center", margin: 10 }}>
          <Loader size="sm" color="blue" />
          <Text c="dimmed" mt={4}>
            Subiendo imagen...
          </Text>
        </Box>
      )}
    </Paper>
  );
}
