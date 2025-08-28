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
  Container,
  Paper,
  Stack,
  SimpleGrid,
  ActionIcon,
  Divider,
  Switch,
  MultiSelect,
  FileInput,
  Image,
} from "@mantine/core";
import {
  getActivitiesByEvent,
  createActivity,
  deleteActivity,
  updateActivityPut,
  generateTranscript,
  getTranscriptionStatus,
} from "../../../services/activityService";
import { Activity, Host, Module } from "../../../services/types";
import { getModulesByEventId } from "../../../services/moduleService";
import { FaCheck, FaPencil, FaTrash, FaYoutube } from "react-icons/fa6";
import {
  createHost,
  fetchHostsByEventId,
  updateHost, // <-- NUEVO
} from "../../../services/hostsService";
import { uploadImageToFirebase } from "../../../utils/uploadImageToFirebase"; // <-- para imagen

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
  const [editHostIds, setEditHostIds] = useState<string>(""); // opcional (texto)
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editSelectedHostIds, setEditSelectedHostIds] = useState<string[]>([]); // MultiSelect
  const [prevEditHostIds, setPrevEditHostIds] = useState<string[]>([]); // <-- NUEVO (para diffs)

  // Confirmación de borrado
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  // Transcript
  const [generatingTranscriptId, setGeneratingTranscriptId] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<Record<string, string>>({});
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);

  // Hosts
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<string | null>(null);

  // Crear host inline (en modal de edición)
  const [newHostOpen, setNewHostOpen] = useState(false);
  const [newHostName, setNewHostName] = useState("");
  const [newHostDesc, setNewHostDesc] = useState("");
  const [newHostPublished, setNewHostPublished] = useState(true);
  const [newHostFile, setNewHostFile] = useState<File | null>(null);
  const [newHostPreview, setNewHostPreview] = useState<string | null>(null);
  const [creatingHostInline, setCreatingHostInline] = useState(false);

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

  // Cargar hosts por evento
  useEffect(() => {
    if (!eventId) return;
    fetchHostsByEventId(eventId)
      .then(setHosts)
      .catch((err) => console.error("Error cargando hosts:", err));
  }, [eventId]);

  // Crear actividad
  const handleCreateActivity = async () => {
    if (!eventId || !activityName.trim()) return;
    try {
      let hostIdToUse = selectedHost;

      // Si el usuario escribió un nombre de host nuevo (solo nombre; sin imagen aquí)
      if (!hostIdToUse && newHostName.trim()) {
        const newHost = await createHost({
          name: newHostName.trim(),
          event_id: eventId,
          image: "",
          description: "Speaker del evento",
          published: true,
        });
        hostIdToUse = newHost._id;
        setHosts((prev) => [...prev, newHost]);
        setNewHostName("");
      }

      const newActivityData: Partial<Activity> = {
        name: activityName.trim(),
        event_id: eventId,
        module_id: selectedModule || undefined,
        video: videoUrl || undefined,
        host_ids: hostIdToUse ? [hostIdToUse] : [],
      };

      const created = await createActivity(newActivityData);
      setActivities((prev) => [...prev, created]);

      // --- SINCRONIZAR Host.activities_ids (addToSet) ---
      if (hostIdToUse && created?._id) {
        try {
          await updateHost(
            hostIdToUse,
            { $addToSet: { activities_ids: created._id } } as any // operador atómico
          );
        } catch (e) {
          console.error("No se pudo vincular activity en el host:", e);
        }
      }

      // limpiar formularios
      setActivityName("");
      setSelectedModule(null);
      setVideoUrl("");
      setSelectedHost(null);
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
    setEditHostIds(act.host_ids ? act.host_ids.join(",") : ""); // opcional
    const initial = Array.isArray(act.host_ids) ? act.host_ids : [];
    setEditSelectedHostIds(initial);
    setPrevEditHostIds(initial); // <-- guardar baseline para diffs
    setEditModalOpen(true);
  };

  // Guardar cambios de edición
  const handleSaveEdit = async () => {
    if (!editActivity?._id) return;
    try {
      const updatedData: Partial<Activity> = {
        name: editName.trim(),
        description: editDescription.trim(),
        video: editVideoUrl.trim(),
        module_id: editModuleId || undefined,
        host_ids: editSelectedHostIds, // MultiSelect manda aquí
      };

      // 1) Actualizar la actividad
      const updated = await updateActivityPut(editActivity._id, updatedData);

      // 2) Calcular diffs y sincronizar Host.activities_ids
      const prev = new Set(prevEditHostIds);
      const next = new Set(editSelectedHostIds);

      const toAdd = [...next].filter((id) => !prev.has(id));
      const toRemove = [...prev].filter((id) => !next.has(id));

      const ops: Promise<any>[] = [];

      toAdd.forEach((hostId) => {
        ops.push(
          updateHost(
            hostId,
            { $addToSet: { activities_ids: editActivity._id } } as any
          ).catch((e) => console.error("addToSet falló:", e))
        );
      });

      toRemove.forEach((hostId) => {
        ops.push(
          updateHost(
            hostId,
            { $pull: { activities_ids: editActivity._id } } as any
          ).catch((e) => console.error("pull falló:", e))
        );
      });

      if (ops.length) await Promise.all(ops);

      // 3) Refrescar UI
      setActivities((prevActs) => prevActs.map((a) => (a._id === editActivity._id ? updated : a)));
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
        "Error": "Error",
      }));
      console.error("Error al consultar estado de transcripción:", error);
    } finally {
      setCheckingStatusId(null);
    }
  };

  if (loading) return <Loader mt="xl" mx="auto" />;

  return (
    <Container fluid>
      <Title order={2} mb="xl" mt="xs">
        Actividades del Evento
      </Title>

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

          <Group gap="sm">
            <Select
              label="Host"
              placeholder="Seleccione un host existente"
              data={hosts.map((h) => ({ value: h._id, label: h.name }))}
              value={selectedHost}
              onChange={setSelectedHost}
              w={220}
            />
            <TextInput
              label="Crear nuevo host (nombre)"
              value={newHostName}
              onChange={(e) => setNewHostName(e.currentTarget.value)}
              w={220}
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
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg" verticalSpacing="lg">
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
                <Text fw={600} size="md" lineClamp={2}>
                  {act.name}
                </Text>
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
                    onClick={() => handleCheckTranscriptionStatus(act._id, act.transcription_job_id as string)}
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

              <Text size="xs" c="dimmed">
                Hosts:{" "}
                {act.host_ids?.length
                  ? act.host_ids.map((hid) => hosts.find((h) => h._id === hid)?.name || hid).join(", ")
                  : "Ninguno"}
              </Text>
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
              <ActionIcon color="blue" variant="subtle" onClick={() => handleOpenEdit(act)} title="Editar">
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
      <Modal opened={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Actividad" centered>
        <Stack gap="xs">
          <TextInput label="Nombre de la Actividad" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} required />
          <TextInput label="Descripción" value={editDescription} onChange={(e) => setEditDescription(e.currentTarget.value)} />
          <Select
            label="Módulo"
            data={modules.map((m) => ({ value: m._id, label: m.module_name }))}
            value={editModuleId}
            onChange={setEditModuleId}
            placeholder="Sin módulo"
          />
          <TextInput label="Video URL" value={editVideoUrl} onChange={(e) => setEditVideoUrl(e.currentTarget.value)} leftSection={<FaYoutube size={18} />} />

          {/* Campo de texto opcional (IDs separados por comas) */}
          <TextInput label="Host IDs (separados por comas)" value={editHostIds} onChange={(e) => setEditHostIds(e.currentTarget.value)} />

          {/* Selector múltiple de hosts */}
          <MultiSelect
            label="Hosts / Speakers"
            placeholder="Selecciona uno o varios hosts"
            data={hosts.map((h) => ({ value: h._id, label: h.name }))}
            value={editSelectedHostIds}
            onChange={setEditSelectedHostIds}
            searchable
            clearable
          />

          <Group justify="space-between" mt="xs">
            <Text size="sm" c="dimmed">
              ¿No aparece el host? Créalo y lo asigno de una vez.
            </Text>
            <Button variant="subtle" size="xs" onClick={() => setNewHostOpen((v) => !v)}>
              {newHostOpen ? "Ocultar creación de host" : "Crear host nuevo"}
            </Button>
          </Group>

          {newHostOpen && (
            <>
              <Divider my="sm" />
              <Group grow>
                <TextInput label="Nombre del Host" value={newHostName} onChange={(e) => setNewHostName(e.currentTarget.value)} required />
                <TextInput label="Descripción" value={newHostDesc} onChange={(e) => setNewHostDesc(e.currentTarget.value)} placeholder="Rol, bio, etc." />
              </Group>

              <Switch mt="xs" label="Publicado" checked={newHostPublished} onChange={(e) => setNewHostPublished(e.currentTarget.checked)} />

              <FileInput
                mt="sm"
                label="Imagen del Host (JPG/PNG, máx. 5MB)"
                placeholder="Selecciona una imagen"
                accept="image/*"
                value={newHostFile}
                onChange={(file) => {
                  setNewHostFile(file);
                  setNewHostPreview(file ? URL.createObjectURL(file) : null);
                }}
                clearable
              />

              {newHostPreview && <Image mt="xs" src={newHostPreview} alt="Previsualización" radius="md" w={160} h={160} fit="cover" />}

              <Group justify="flex-end" mt="md">
                <Button
                  loading={creatingHostInline}
                  onClick={async () => {
                    if (!eventId || !newHostName.trim()) return;

                    // Validaciones básicas
                    if (!newHostFile) {
                      alert("Selecciona una imagen para el host.");
                      return;
                    }
                    if (newHostFile.size > 5 * 1024 * 1024) {
                      alert("La imagen supera 5MB.");
                      return;
                    }
                    if (!newHostFile.type.startsWith("image/")) {
                      alert("El archivo debe ser una imagen.");
                      return;
                    }

                    try {
                      setCreatingHostInline(true);

                      // 1) Subir a Firebase y obtener URL
                      const imageUrl = await uploadImageToFirebase(newHostFile, `hosts/${eventId}`);

                      // 2) Crear host con la URL resultante (NO tocamos activities_ids aquí;
                      //    se sincroniza al guardar cambios de la actividad con los diffs)
                      const created = await createHost({
                        name: newHostName.trim(),
                        image: imageUrl,
                        description_activity: false,
                        description: newHostDesc.trim(),
                        profession: "",
                        published: newHostPublished,
                        order: 0,
                        index: 0,
                        event_id: eventId,
                        activities_ids: [],
                      });

                      // 3) Refrescar listas y asignar al MultiSelect
                      setHosts((prev) => [...prev, created]);
                      setEditSelectedHostIds((prev) => Array.from(new Set([...prev, created._id])));

                      // 4) Limpiar estado
                      setNewHostName("");
                      setNewHostDesc("");
                      setNewHostPublished(true);
                      setNewHostFile(null);
                      setNewHostPreview(null);
                      setNewHostOpen(false);
                    } catch (err) {
                      console.error("Error creando host:", err);
                      alert("No se pudo crear el host. Revisa la consola.");
                    } finally {
                      setCreatingHostInline(false);
                    }
                  }}
                >
                  Subir imagen, crear y asignar
                </Button>
              </Group>
            </>
          )}

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
      <Modal opened={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="¿Eliminar actividad?" centered>
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
