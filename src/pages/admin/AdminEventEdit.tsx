// src/pages/admin/AdminEventEdit.tsx
import { useEffect, useState } from "react";
import {
  Container,
  Tabs,
  Loader,
  Text,
  Button,
  Group,
} from "@mantine/core";

import { Event } from "../../services/types";
import { fetchEventById } from "../../services/eventService";

import BasicEventData from "./components/BasicEventData";
import AdminModules from "./components/AdminModules";
import AdminActivities from "./components/AdminActivities";

interface Props {
  organizationId: string;
  eventId: string; // puede ser "new" o un id real
  onFinish: (newEventId?: string) => void;
}

export default function AdminEventEdit({
  organizationId,
  eventId,
  onFinish,
}: Props) {
  const [formData, setFormData] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(false);

  const isEditing = eventId !== "new";

  useEffect(() => {
    if (isEditing) {
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
      <Tabs defaultValue="basicos">
        <Tabs.List>
          <Tabs.Tab value="basicos">Datos Curso</Tabs.Tab>
          <Tabs.Tab value="modulos">Módulos</Tabs.Tab>
          <Tabs.Tab value="actividades">Actividades</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="basicos" pt="md">
          <BasicEventData
            formData={formData}
            setFormData={setFormData}
            organizationId={organizationId}
            eventId={eventId}
            isEditing={isEditing}
            onSaved={onFinish}
          />
        </Tabs.Panel>

        <Tabs.Panel value="modulos" pt="md">
          {isEditing ? (
            <AdminModules organizationId={organizationId} eventId={eventId} />
          ) : (
            <Text mb="md">
              Guarda primero el evento para gestionar módulos.
            </Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="actividades" pt="md">
          {isEditing ? (
            <AdminActivities
              organizationId={organizationId}
              eventId={eventId}
            />
          ) : (
            <Text mb="md">
              Guarda primero el evento para gestionar actividades.
            </Text>
          )}
        </Tabs.Panel>
      </Tabs>

      <Group mt="lg">
        <Button variant="default" onClick={() => onFinish()}>
          Cancelar
        </Button>
      </Group>
    </Container>
  );
}
