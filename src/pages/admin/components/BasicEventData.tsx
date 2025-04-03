// pages/admin/components/BasicEventData.tsx
import React, { useState } from "react";
import {
  TextInput,
  Button,
  Image,
  Loader,
  Select,
  FileInput,
  // etc.
} from "@mantine/core";
import { useNavigate } from "react-router-dom";

import { createEvent, updateEvent } from "../../../services/eventService";
import { Event } from "../../../services/types";

interface Props {
  formData: Partial<Event>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Event>>>;
  organizationId?: string;
  eventId?: string;
  isEditing: boolean;
}

export default function BasicEventData({
  formData,
  setFormData,
  organizationId,
  eventId,
  isEditing,
}: Props) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Ejemplo si usas FileInput o Subida de archivos:
  // const handleFileChange = (file: File | null) => {
  //   // Manejar subida o guardar el link en formData.picture
  // };

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      if (isEditing && eventId) {
        // EDITAR
        await updateEvent(organizationId, eventId, formData);
      } else {
        // CREAR
        const newEvent = await createEvent(organizationId, formData);
        // Podrías redirigir a la pantalla de edición con el nuevo ID
        navigate(`/admin/organizations/${organizationId}/events/${newEvent._id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (saving) return <Loader />;

  return (
    <>
      <TextInput
        label="Nombre del Curso"
        name="name"
        value={formData.name || ""}
        onChange={handleChange}
        mb="sm"
      />

      <TextInput
        label="Imagen del Curso (URL)"
        name="picture"
        value={formData.picture || ""}
        onChange={handleChange}
        mb="sm"
      />

      {formData.picture && (
        <Image
          src={formData.picture}
          alt="preview"
          width={200}
          height={120}
          mb="sm"
        />
      )}

      {/* <Select
        label="Visibilidad"
        name="visibility"
        placeholder="Selecciona..."
        data={[
          { value: "PUBLIC", label: "Público" },
          { value: "PRIVATE", label: "Privado" },
        ]}
        value={formData.visibility || "PUBLIC"}
        onChange={(val) =>
          setFormData((prev) => ({ ...prev, visibility: val }))
        }
        mb="sm"
      /> */}

      {/* Aquí podrías añadir más campos: type_event, datetime_from, etc. */}

      <Button onClick={handleSave} mt="md">
        {isEditing ? "Guardar Cambios" : "Crear Evento"}
      </Button>
    </>
  );
}
