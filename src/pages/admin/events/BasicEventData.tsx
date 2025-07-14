import React, { useState } from "react";
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
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { uploadImageToFirebase } from "../../../utils/uploadImageToFirebase";
import { createEvent, updateEvent } from "../../../services/eventService";
import type { Event } from "../../../services/types";

interface Props {
  formData: Partial<Event>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Event>>>;
  organizationId: string;
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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name: string, date: Date | null) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date ? date.toISOString() : null,
    }));
  };

  const handleFileUpload = async (file: File | null, path: string[]) => {
    if (!file) return;
    setUploading(path.join("."));
    try {
      const url = await uploadImageToFirebase(file);
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

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (isEditing) {
        await updateEvent(organizationId, eventId, formData);
        onSaved(eventId!);
      } else {
        const newEvent = await createEvent(organizationId, formData);
        onSaved(newEvent._id);
      }
    } catch (error) {
      console.error("Error saving event:", error);
    } finally {
      setSaving(false);
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

  return (
    <Paper p="sm" radius="lg" shadow="md" withBorder>
      <Title order={3} mb="md" ta="left">
        {isEditing ? "Editando Evento" : "Creando Evento"}
      </Title>
      <Divider mb="lg" />

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
          />
          <DateTimePicker
            label="Fecha y hora de fin"
            value={formData.datetime_to ? new Date(formData.datetime_to) : null}
            onChange={(date) => handleDateChange("datetime_to", date)}
            required
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
      </Grid>

      <Divider my="xl" />

      <Group justify="flex-end" mt="md">
        <Button
          onClick={handleSave}
          size="md"
          loading={saving}
          style={{ minWidth: 180 }}
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
