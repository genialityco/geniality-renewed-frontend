// pages/admin/AdminEventEdit.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Title,
  Tabs,
  Loader,
  // otros componentes de Mantine
} from "@mantine/core";

import { Event } from "../../services/types";
import { fetchEventById } from "../../services/eventService";

import BasicEventData from "./components/BasicEventData";
import AdminModules from "./components/AdminModules";
import AdminActivities from "./components/AdminActivities";

export default function AdminEventEdit() {
  const { organizationId, eventId } = useParams();
  const [formData, setFormData] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(false);

  const isEditing = eventId !== "new";

  useEffect(() => {
    // Si estamos editando, obtenemos la data del evento
    if (isEditing && eventId) {
      setLoading(true);
      fetchEventById(eventId).then((data) => {
        setFormData(data);
        setLoading(false);
      });
    }
  }, [eventId, isEditing]);

  if (loading && isEditing) {
    return <Loader />;
  }

  return (
    <Container fluid>
      <Title order={2}>
        {isEditing ? "Editar Evento" : "Crear Nuevo Evento"}
      </Title>

      <Tabs defaultValue="basicos" mt="md">
        <Tabs.List>
          <Tabs.Tab value="basicos">Datos del Curso</Tabs.Tab>
          <Tabs.Tab value="modulos">Módulos</Tabs.Tab>
          <Tabs.Tab value="actividades">Actividades</Tabs.Tab>
        </Tabs.List>

        {/* PANEL 1: Datos Básicos */}
        <Tabs.Panel value="basicos" pt="md">
          <BasicEventData
            formData={formData}
            setFormData={setFormData}
            organizationId={organizationId}
            eventId={eventId}
            isEditing={isEditing}
          />
        </Tabs.Panel>

        {/* PANEL 2: Módulos */}
        <Tabs.Panel value="modulos" pt="md">
          {isEditing ? (
            <AdminModules
              organizationId={organizationId}
              eventId={eventId}
            />
          ) : (
            <p>Guarda primero el evento para gestionar módulos.</p>
          )}
        </Tabs.Panel>

        {/* PANEL 3: Actividades */}
        <Tabs.Panel value="actividades" pt="md">
          {isEditing ? (
            <AdminActivities
              organizationId={organizationId}
              eventId={eventId}
            />
          ) : (
            <p>Guarda primero el evento para gestionar actividades.</p>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
