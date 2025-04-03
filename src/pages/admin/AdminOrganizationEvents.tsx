// pages/admin/AdminOrganizationEvents.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Container, Title, List, Button, Loader } from "@mantine/core";

// Aquí asumes que tienes un servicio que obtiene los eventos por organización
import { fetchEventsByOrganizer } from "../../services/eventService";
import { Event } from "../../services/types";

export default function AdminOrganizationEvents() {
  const { organizationId } = useParams();
  const navigate = useNavigate();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;

    fetchEventsByOrganizer(organizationId).then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, [organizationId]);

  if (loading) {
    return <Loader />;
  }

  return (
    <Container>
      <Title order={2}>Eventos de la Organización</Title>

      {/* Botón para crear nuevo evento */}
      <Button
        onClick={() =>
          navigate(`/admin/organizations/${organizationId}/events/new`)
        }
        mb="md"
      >
        Crear Nuevo Evento
      </Button>

      {/* Listado de eventos */}
      <List spacing="sm">
        {events.map((ev) => (
          <List.Item key={ev._id}>
            {ev.name}{" "}
            <Button
              variant="outline"
              size="xs"
              ml="md"
              onClick={() =>
                navigate(`/admin/organizations/${organizationId}/events/${ev._id}`)
              }
            >
              Editar
            </Button>
          </List.Item>
        ))}
      </List>
    </Container>
  );
}
