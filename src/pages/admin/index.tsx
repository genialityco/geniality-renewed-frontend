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
  Modal,
  Button,
} from "@mantine/core";
import { FaList, FaUsers, FaGear, FaFile, FaFilm, FaWhatsapp, FaWandMagicSparkles, FaChartLine, FaUserGraduate, FaBolt, FaRobot } from "react-icons/fa6";

import { useOrganization } from "../../context/OrganizationContext";
import {
  fetchEventsByOrganizer,
  deleteEvent,
} from "../../services/eventService";
import type { Event } from "../../services/types";

import EventsTab from "./events/EventsTab";
import AdminEventEdit from "./events/AdminEventEdit";
import MembersTab from "./members/MembersTab";
import AdminOrganizationPage from "./org/AdminOrganizationPage";
import { DocumentsAdminPage } from "./DocumentsAdminPage";
import AdminActivitiesPage from "./activities";
import RemindersAdminPage from "./RemindersAdminPage";
import PracticeAdminPage from "./PracticeAdminPage";
import EmbeddingsAdminPage from "./EmbeddingsAdminPage";
import BaselineAdminPage from "./BaselineAdminPage";
import StudentTrackingAdminPage from "./StudentTrackingAdminPage";
import GenOnAdminPage from "./genon/GenOnAdminPage";
import AssistantAdminPage from "./AssistantAdminPage";
import { openCoursePreview } from "../../utils/previewUrl";

type Section =
  | "events"
  | "members"
  | "org"
  | "documents"
  | "activities"
  | "reminders"
  | "practice"
  | "baseline"
  | "tracking"
  | "genon"
  | "assistant"
  | "embeddings";

export default function AdminOrganizationEvents() {
  const { organization } = useOrganization();
  const orgId = organization?._id!;
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Drawer
  const [drawerOpened, setDrawerOpened] = useState(false);
  // Sección activa
  const [activeSection, setActiveSection] = useState<Section>("events");
  // Si estamos editando/creando un evento, guardamos su ID
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return;
    try {
      setDeletingLoading(true);
      await deleteEvent(deletingEventId);
      setEvents((prev) => prev.filter((e) => e._id !== deletingEventId));
      setDeletingEventId(null); // Cerrar el diálogo
    } catch (err) {
      console.error("Error eliminando evento:", err);
    } finally {
      setDeletingLoading(false);
    }
  };

  // Carga inicial y reload
  const loadEvents = () => {
    if (!orgId) return;
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
        ? editingEventId === "new"
          ? "Crear Evento"
          : "Editar Evento"
        : "Eventos"
      : activeSection === "members"
      ? "Miembros"
      : activeSection === "activities"
      ? "Actividades"
      : activeSection === "reminders"
      ? "Recordatorios"
      : activeSection === "practice"
      ? "Simulacros WhatsApp"
      : activeSection === "tracking"
      ? "Seguimiento académico"
      : activeSection === "genon"
      ? "Gen.ON"
      : activeSection === "assistant"
      ? "Asistente IA"
      : activeSection === "baseline"
      ? "Línea base"
      : activeSection === "embeddings"
      ? "Embeddings"
      : "Mi Organización";

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

            {/* Ver Actividades */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("activities");
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
                  activeSection === "activities" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaFilm /> Ver Actividades
            </UnstyledButton>

            {/* Mi Organización */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("org");
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
                  activeSection === "org" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaGear /> Mi Organización
            </UnstyledButton>

            {/* Ver documentos */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("documents");
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
                  activeSection === "documents" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaFile /> Ver Documentos
            </UnstyledButton>

            {/* Recordatorios (WhatsApp) */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("reminders");
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
                  activeSection === "reminders" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaWhatsapp /> Recordatorios
            </UnstyledButton>

            {/* Simulacros de práctica (WhatsApp) */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("practice");
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
                  activeSection === "practice" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaWhatsapp /> Simulacros WhatsApp
            </UnstyledButton>

            {/* Seguimiento académico: estado de cada estudiante */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("tracking");
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
                  activeSection === "tracking" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaUserGraduate /> Seguimiento académico
            </UnstyledButton>

            {/* Gen.ON: flujos de mensajes por segmento */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("genon");
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
                  activeSection === "genon" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaBolt /> Gen.ON
            </UnstyledButton>

            {/* Asistente por WhatsApp con IA (Gemini) */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("assistant");
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
                  activeSection === "assistant" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaRobot /> Asistente IA
            </UnstyledButton>

            {/* Línea base de indicadores por curso */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("baseline");
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
                  activeSection === "baseline" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaChartLine /> Línea base
            </UnstyledButton>

            {/* Embeddings de transcripciones */}
            <UnstyledButton
              onClick={() => {
                setActiveSection("embeddings");
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
                  activeSection === "embeddings" ? "#F0F4FF" : "transparent",
              }}
            >
              <FaWandMagicSparkles /> Embeddings
            </UnstyledButton>

            <Divider my="sm" />
          </Stack>
        </ScrollArea>
      </Drawer>

      {/* CONTENIDO */}
      <Container fluid>
        {activeSection === "events" ? (
          editingEventId ? (
            <AdminEventEdit
              organizationId={orgId}
              eventId={editingEventId}
              onFinish={(newEventId?: string) => {
                // Refrescamos la lista en segundo plano.
                loadEvents();
                if (newEventId) {
                  // Guardado (crear o editar): permanecer en el editor con ese
                  // evento. Al crear, cambia de "new" al id real y habilita las
                  // demás pestañas; al editar, es el mismo id y no remonta.
                  setEditingEventId(newEventId);
                } else {
                  // Cancelar / cerrar: volver a la lista de eventos.
                  setEditingEventId(null);
                }
              }}
            />
          ) : loadingEvents ? (
            <Loader />
          ) : (
            <EventsTab
              events={events}
              onCreate={() => setEditingEventId("new")}
              onEdit={(id) => setEditingEventId(id)}
              onDelete={(id) => setDeletingEventId(id)}
              onPreview={(id) => openCoursePreview(orgId, id)}
            />
          )
        ) : activeSection === "members" ? (
          <MembersTab />
        ) : activeSection === "documents" ? (
          <DocumentsAdminPage />
        ) : activeSection === "activities" ? (
          <AdminActivitiesPage />
        ) : activeSection === "reminders" ? (
          <RemindersAdminPage />
        ) : activeSection === "practice" ? (
          <PracticeAdminPage />
        ) : activeSection === "tracking" ? (
          <StudentTrackingAdminPage />
        ) : activeSection === "genon" ? (
          <GenOnAdminPage />
        ) : activeSection === "assistant" ? (
          <AssistantAdminPage />
        ) : activeSection === "baseline" ? (
          <BaselineAdminPage />
        ) : activeSection === "embeddings" ? (
          <EmbeddingsAdminPage />
        ) : (
          <AdminOrganizationPage organizationId={orgId} />
        )}
      </Container>

      {/* MODAL CONFIRMACIÓN ELIMINAR */}
      <Modal
        opened={!!deletingEventId}
        onClose={() => !deletingLoading && setDeletingEventId(null)}
        title="Confirmar eliminación"
        centered
      >
        <Stack gap="md">
          <Text>
            ¿Seguro que deseas eliminar este evento? Esta acción no se puede
            deshacer.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setDeletingEventId(null)}
              disabled={deletingLoading}
            >
              Cancelar
            </Button>
            <Button
              color="red"
              onClick={handleDeleteEvent}
              loading={deletingLoading}
            >
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
