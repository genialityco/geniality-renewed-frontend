import { useEffect, useState } from "react";
import {
  Button,
  Loader,
  TextInput,
  Select,
  Modal,
  Badge,
  Group,
  Card,
  Text,
  Title,
  Flex,
  Container,
  Paper,
  Divider,
  Stack,
  SimpleGrid,
  ActionIcon,
} from "@mantine/core";
import {
  getActivitiesByEvent,
  createActivity,
  deleteActivity,
  updateActivityPut,
  generateTranscript,
  getTranscriptionStatus,
} from "../../../services/activityService";
import { Activity, Module } from "../../../services/types";
import { getModulesByEventId } from "../../../services/moduleService";
import { FaCheck, FaPencil, FaTrash, FaYoutube } from "react-icons/fa6";

interface Props {
  organizationId?: string;
  eventId?: string;
}

export default function AdminActivities({ eventId }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulario de creación
  const [activityName, setActivityName] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  // Edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editHostIds, setEditHostIds] = useState<string>("");
  const [editModuleId, setEditModuleId] = useState<string | null>(null);

  // Confirmación de borrado
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  // Transcript
  const [generatingTranscriptId, setGeneratingTranscriptId] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<Record<string, string>>({});
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);

  // Cargar actividades y módulos
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    Promise.all([getActivitiesByEvent(eventId), getModulesByEventId(eventId)])
      .then(([acts, mods]) => {
        setActivities(acts);
        setModules(mods);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  // Crear actividad
  const handleCreateActivity = async () => {
    if (!eventId || !activityName.trim()) return;
    try {
      const newActivityData: Partial<Activity> = {
        name: activityName.trim(),
        event_id: eventId,
        module_id: selectedModule || undefined,
        video: videoUrl || undefined,
      };
      const created = await createActivity(newActivityData);
      setActivities((prev) => [...prev, created]);
      setActivityName("");
      setSelectedModule(null);
      setVideoUrl("");
    } catch (error) {
      console.error("Error al crear actividad:", error);
    }
  };

  // Abrir modal de edición
  const handleOpenEdit = (act: Activity) => {
    setEditActivity(act);
    setEditName(act.name || "");
    setEditDescription(act.description || "");
    setEditVideoUrl(act.video || "");
    setEditModuleId(act.module_id ?? null);
    setEditHostIds(act.host_ids ? act.host_ids.join(",") : "");
    setEditModalOpen(true);
  };

  // Guardar cambios de edición
  const handleSaveEdit = async () => {
    if (!editActivity?._id) return;
    try {
      const hostIdsArray = editHostIds.split(",").map((h) => h.trim()).filter(Boolean);
      const updatedData: Partial<Activity> = {
        name: editName.trim(),
        description: editDescription.trim(),
        video: editVideoUrl.trim(),
        module_id: editModuleId || undefined,
        host_ids: hostIdsArray,
      };
      const updated = await updateActivityPut(editActivity._id, updatedData);
      setActivities((prev) => prev.map((a) => (a._id === editActivity._id ? updated : a)));
      setEditModalOpen(false);
      setEditActivity(null);
    } catch (error) {
      console.error("Error al editar actividad:", error);
    }
  };

  // Confirmar borrado
  const handleDeleteActivity = async () => {
    if (!activityToDelete?._id) return;
    try {
      await deleteActivity(activityToDelete._id);
      setActivities((prev) => prev.filter((a) => a._id !== activityToDelete._id));
      setDeleteModalOpen(false);
      setActivityToDelete(null);
    } catch (error) {
      console.error("Error al eliminar actividad:", error);
    }
  };

  // Transcript
  const handleGenerateTranscript = async (activityId: string) => {
    setGeneratingTranscriptId(activityId);
    try {
      await generateTranscript(activityId);
      if (eventId) {
        const acts = await getActivitiesByEvent(eventId);
        setActivities(acts);
      }
    } catch (error) {
      console.error("Error al generar transcript:", error);
    } finally {
      setGeneratingTranscriptId(null);
    }
  };

  const handleCheckTranscriptionStatus = async (activityId: string, jobId: string) => {
    setCheckingStatusId(activityId);
    try {
      const result = await getTranscriptionStatus(jobId);
      setTranscriptionStatus((prev) => ({
        ...prev,
        [activityId]: result.status,
      }));
    } catch (error) {
      setTranscriptionStatus((prev) => ({
        ...prev,
        [activityId]: "Error",
      }));
      console.error("Error al consultar estado de transcripción:", error);
    } finally {
      setCheckingStatusId(null);
    }
  };

  if (loading) return <Loader mt="xl" mx="auto" />;

  return (
    <Container fluid>
      <Title order={2} mb="xl" mt="xs">Actividades del Evento</Title>

      {/* Formulario creación */}
      <Paper withBorder shadow="sm" p="lg" mb="xl" radius="lg">
        <Stack gap="xs">
          <Group gap="sm">
            <TextInput
              label="Nombre de la Actividad"
              value={activityName}
              onChange={(e) => setActivityName(e.currentTarget.value)}
              w={220}
              required
            />
            <Select
              label="Módulo"
              placeholder="Seleccione un módulo (opcional)"
              data={modules.map((m) => ({ value: m._id, label: m.module_name }))}
              value={selectedModule}
              onChange={setSelectedModule}
              w={220}
            />
            <TextInput
              label="Video URL"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.currentTarget.value)}
              w={220}
              leftSection={<FaYoutube size={18} />}
            />
          </Group>
          <Button
            onClick={handleCreateActivity}
            variant="filled"
            mt="sm"
            style={{ alignSelf: "flex-end" }}
            disabled={!activityName.trim()}
          >
            Crear Actividad
          </Button>
        </Stack>
      </Paper>

      {/* Lista de actividades */}
      <SimpleGrid
        cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
        spacing="lg"
        verticalSpacing="lg"
      >
        {activities.map((act) => (
          <Card
            key={act._id}
            shadow="sm"
            radius="md"
            withBorder
            style={{ minHeight: 260, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
          >
            <Stack gap="xs" style={{ flexGrow: 1 }}>
              <Group justify="space-between" align="center">
                <Text fw={600} size="md" lineClamp={2}>{act.name}</Text>
                <Badge color={act.transcript_available ? "teal" : "gray"}>
                  {act.transcript_available ? "Transcript listo" : "Sin transcript"}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" lineClamp={2}>
                {modules.find((m) => m._id === act.module_id)?.module_name || "Sin módulo"}
              </Text>
              <Text size="xs" c="gray" lineClamp={1}>
                {act.video ? `Video: ${act.video}` : "Sin video"}
              </Text>
              <Text size="xs" c="dimmed" mt={4} lineClamp={2}>
                ID: {act._id}
              </Text>

              {act.transcription_job_id && (
                <Group mt={8} gap="xs">
                  <Button
                    size="xs"
                    variant="subtle"
                    loading={checkingStatusId === act._id}
                    onClick={() =>
                      handleCheckTranscriptionStatus(
                        act._id,
                        act.transcription_job_id as string
                      )
                    }
                  >
                    Estado transcripción
                  </Button>
                  {transcriptionStatus[act._id] && (
                    <Badge
                      color={
                        transcriptionStatus[act._id] === "completed"
                          ? "teal"
                          : transcriptionStatus[act._id] === "error"
                          ? "red"
                          : "yellow"
                      }
                    >
                      {transcriptionStatus[act._id]}
                    </Badge>
                  )}
                </Group>
              )}
            </Stack>

            <Group mt="md" gap="xs" justify="flex-end">
              <Button
                size="xs"
                loading={generatingTranscriptId === act._id}
                onClick={() => handleGenerateTranscript(act._id)}
                variant="light"
              >
                Generar Transcript
              </Button>
              <ActionIcon
                color="blue"
                variant="subtle"
                onClick={() => handleOpenEdit(act)}
                title="Editar"
              >
                <FaPencil size={18} />
              </ActionIcon>
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => {
                  setActivityToDelete(act);
                  setDeleteModalOpen(true);
                }}
                title="Eliminar"
              >
                <FaTrash size={18} />
              </ActionIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Modal edición */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Actividad"
        centered
      >
        <Stack gap="xs">
          <TextInput
            label="Nombre de la Actividad"
            value={editName}
            onChange={(e) => setEditName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Descripción"
            value={editDescription}
            onChange={(e) => setEditDescription(e.currentTarget.value)}
          />
          <Select
            label="Módulo"
            data={modules.map((m) => ({ value: m._id, label: m.module_name }))}
            value={editModuleId}
            onChange={setEditModuleId}
            placeholder="Sin módulo"
          />
          <TextInput
            label="Video URL"
            value={editVideoUrl}
            onChange={(e) => setEditVideoUrl(e.currentTarget.value)}
            leftSection={<FaYoutube size={18} />}
          />
          <TextInput
            label="Host IDs (separados por comas)"
            value={editHostIds}
            onChange={(e) => setEditHostIds(e.currentTarget.value)}
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} leftSection={<FaCheck size={16} />}>
              Guardar Cambios
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="¿Eliminar actividad?"
        centered
      >
        <Text mb="md">
          ¿Seguro que deseas eliminar la actividad <b>{activityToDelete?.name}</b>?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteModalOpen(false)}>
            Cancelar
          </Button>
          <Button color="red" leftSection={<FaTrash size={16} />} onClick={handleDeleteActivity}>
            Eliminar
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
