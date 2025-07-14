// src/pages/admin/AdminOrganizationEvents.tsx
import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Loader,
  Text,
  Group,
  Burger,
  Drawer,
  ScrollArea,
  UnstyledButton,
  Stack,
  Divider,
  Paper,
} from "@mantine/core";
import { FaList, FaUsers } from "react-icons/fa6";

import { useOrganization } from "../../context/OrganizationContext";
import {
  fetchEventsByOrganizer,
} from "../../services/eventService";
import type { Event } from "../../services/types";

import EventsTab from "./events/EventsTab";
import AdminEventEdit from "./events/AdminEventEdit";
import MembersTab from "./members/MembersTab";

export default function AdminOrganizationEvents() {
  const { organization } = useOrganization();
  const orgId = organization?._id!;
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Drawer
  const [drawerOpened, setDrawerOpened] = useState(false);
  // Sección activa: 'events' o 'members'
  const [activeSection, setActiveSection] = useState<"events" | "members">(
    "events"
  );
  // Si estamos editando/creando un evento, guardamos su ID
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Carga inicial y reload
  const loadEvents = () => {
    setLoadingEvents(true);
    fetchEventsByOrganizer(orgId)
      .then(setEvents)
      .finally(() => setLoadingEvents(false));
  };
  useEffect(loadEvents, [orgId]);

  if (!orgId) {
    return <Text>Cargando organización…</Text>;
  }

  // Título dinámico según sección
  const headerTitle =
    activeSection === "events"
      ? editingEventId
        ? (editingEventId === "new" ? "Crear Evento" : "Editar Evento")
        : "Eventos"
      : "Miembros";

  return (
    <>
      {/* HEADER */}
      <Paper shadow="xs" withBorder py="xs" mb="sm">
        <Group align="center" p="md" px="md">
          <Burger
            opened={drawerOpened}
            onClick={() => setDrawerOpened((o) => !o)}
          />
          <Title order={2} style={{ flexGrow: 1 }}>
            {headerTitle}
          </Title>
        </Group>
      </Paper>

      {/* DRAWER */}
      <Drawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        title="Navegación"
        padding="md"
        size="xs"
      >
        <ScrollArea style={{ height: "calc(100vh - 120px)" }}>
          <Stack p="xs">
            {/* Ver Eventos */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("events");
                setEditingEventId(null);
                setDrawerOpened(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 8,
                borderRadius: 4,
                backgroundColor:
                  activeSection === "events" && !editingEventId
                    ? "#F0F4FF"
                    : "transparent",
              }}
            >
              <FaList /> Ver Eventos
            </UnstyledButton>

            {/* Ver Miembros */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("members");
                setEditingEventId(null);
                setDrawerOpened(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: 8,
                borderRadius: 4,
                backgroundColor:
                  activeSection === "members" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaUsers /> Ver Miembros
            </UnstyledButton>

            <Divider my="sm" />
          </Stack>
        </ScrollArea>
      </Drawer>

      {/* CONTENIDO */}
      <Container fluid>
        {activeSection === "events" ? (
          // Si editingEventId está definido, mostramos el formulario
          editingEventId ? (
            <AdminEventEdit
              organizationId={orgId}
              eventId={editingEventId}
              onFinish={() => {
                loadEvents();
                setEditingEventId(null);
              }}
            />
          ) : loadingEvents ? (
            <Loader />
          ) : (
            <EventsTab
              events={events}
              onCreate={() => setEditingEventId("new")}
              onEdit={(id) => setEditingEventId(id)}
            />
          )
        ) : (
          <MembersTab />
        )}
      </Container>
    </>
  );
}
