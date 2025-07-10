// src/pages/admin/components/BasicEventData.tsx
import React, { useState } from "react";
import {
  TextInput,
  Button,
  Image,
  Loader,
  Group,
  Box,
} from "@mantine/core";
import { createEvent, updateEvent } from "../../../services/eventService";
import type { Event } from "../../../services/types";

interface Props {
  formData: Partial<Event>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Event>>>;
  organizationId: string;
  eventId: string;
  isEditing: boolean;
  /** 
   * Callback que se invoca una vez el evento se ha creado o actualizado.
   * Si es creación, newEventId contiene el _id generado.
   * Si es edición, se pasa el mismo eventId.
   */
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  if (saving) {
    return (
      <Box style={{ textAlign: "center", margin: 20 }}>
        <Loader size="lg" />
      </Box>
    );
  }

  return (
    <Box>
      <TextInput
        label="Nombre del Evento"
        name="name"
        value={formData.name || ""}
        onChange={handleChange}
        mb="sm"
        required
      />

      <TextInput
        label="URL de la imagen"
        name="picture"
        value={formData.picture || ""}
        onChange={handleChange}
        mb="sm"
        placeholder="https://..."
      />

      {formData.picture && (
        <Image
          src={formData.picture}
          alt="Preview"
          width={200}
          height={120}
          mb="sm"
        />
      )}

      {/* Aquí puedes agregar más campos según tu modelo Event,
          p.ej. fechas, descripción, visibilidad, etc. */}

      <Group justify="right" mt="md">
        <Button onClick={handleSave}>
          {isEditing ? "Guardar Cambios" : "Crear Evento"}
        </Button>
      </Group>
    </Box>
  );
}
