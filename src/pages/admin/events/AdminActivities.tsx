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
  updateHost,
} from "../../../services/hostsService";
import { uploadImageToFirebase } from "../../../utils/uploadImageToFirebase";

interface Props {
  organizationId?: string;
  eventId?: string;
}

export default function AdminActivities({ eventId }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // --------- CREAR ACTIVIDAD (sin crear host) ---------
  const [activityName, setActivityName] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [hosts, setHosts] = useState<Host[]>([]);
  const [selectedHostIdsCreate, setSelectedHostIdsCreate] = useState<string[]>([]); // MultiSelect en creación

  // --------- EDITAR ACTIVIDAD ---------
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const [editSelectedHostIds, setEditSelectedHostIds] = useState<string[]>([]);
  const [prevEditHostIds, setPrevEditHostIds] = useState<string[]>([]);

  // Crear host COMPLETO dentro del modal de edición
  const [newHostOpen, setNewHostOpen] = useState(false);
  const [newHostName, setNewHostName] = useState("");
  const [newHostDesc, setNewHostDesc] = useState("");
  const [newHostProfession, setNewHostProfession] = useState("");
  const [newHostPublished, setNewHostPublished] = useState(true);
  const [newHostFile, setNewHostFile] = useState<File | null>(null);
  const [newHostPreview, setNewHostPreview] = useState<string | null>(null);
  const [creatingHostInline, setCreatingHostInline] = useState(false);

  // --------- BORRADO ---------
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);

  // --------- TRANSCRIPCIÓN ---------
  const [generatingTranscriptId, setGeneratingTranscriptId] = useState<string | null>(null);
  const [transcriptionStatus, setTranscriptionStatus] = useState<Record<string, string>>({});
  const [checkingStatusId, setCheckingStatusId] = useState<string | null>(null);

  // Cargar data inicial
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    Promise.all([getActivitiesByEvent(eventId), getModulesByEventId(eventId), fetchHostsByEventId(eventId)])
      .then(([acts, mods, hs]) => {
        setActivities(acts);
        setModules(mods);
        setHosts(hs);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  // --------- Crear ACTIVIDAD (solo selecciona hosts existentes) ---------
  const handleCreateActivity = async () => {
    if (!eventId || !activityName.trim()) return;
    try {
      const newActivityData: Partial<Activity> = {
        name: activityName.trim(),
        event_id: eventId,
        module_id: selectedModule || undefined,
        video: videoUrl || undefined,
        host_ids: selectedHostIdsCreate,
      };

      const created = await createActivity(newActivityData);
      setActivities((prev) => [...prev, created]);

      // Sincronizar Host.activities_ids para cada host seleccionado
      if (created?._id && selectedHostIdsCreate.length) {
        await Promise.all(
          selectedHostIdsCreate.map((hId) =>
            updateHost(hId, { $addToSet: { activities_ids: created._id } } as any).catch((e) =>
              console.error("No se pudo vincular activity en host:", e)
            )
          )
        );
      }

      // limpiar formulario
      setActivityName("");
      setSelectedModule(null);
      setVideoUrl("");
      setSelectedHostIdsCreate([]);
    } catch (error) {
      console.error("Error al crear actividad:", error);
    }
  };

  // --------- Abrir modal de EDICIÓN ---------
  const handleOpenEdit = (act: Activity) => {
    setEditActivity(act);
    setEditName(act.name || "");
    setEditDescription(act.description || "");
    setEditVideoUrl(act.video || "");
    setEditModuleId(act.module_id ?? null);
    const initial = Array.isArray(act.host_ids) ? act.host_ids : [];
    setEditSelectedHostIds(initial);
    setPrevEditHostIds(initial);
    setEditModalOpen(true);
  };

  // --------- Guardar EDICIÓN (con diffs + sync Host.activities_ids) ---------
  const handleSaveEdit = async () => {
    if (!editActivity?._id) return;
    try {
      const updatedData: Partial<Activity> = {
        name: editName.trim(),
        description: editDescription.trim(),
        video: editVideoUrl.trim(),
        module_id: editModuleId || undefined,
        host_ids: editSelectedHostIds,
      };

      const updated = await updateActivityPut(editActivity._id, updatedData);

      // diffs
      const prev = new Set(prevEditHostIds);
      const next = new Set(editSelectedHostIds);
      const toAdd = [...next].filter((id) => !prev.has(id));
      const toRemove = [...prev].filter((id) => !next.has(id));

      const ops: Promise<any>[] = [];
      toAdd.forEach((hostId) =>
        ops.push(
          updateHost(hostId, { $addToSet: { activities_ids: editActivity._id } } as any).catch((e) =>
            console.error("addToSet falló:", e)
          )
        )
      );
      toRemove.forEach((hostId) =>
        ops.push(
          updateHost(hostId, { $pull: { activities_ids: editActivity._id } } as any).catch((e) =>
            console.error("pull falló:", e)
          )
        )
      );
      if (ops.length) await Promise.all(ops);

      setActivities((prevActs) => prevActs.map((a) => (a._id === editActivity._id ? updated : a)));
      setEditModalOpen(false);
      setEditActivity(null);
    } catch (error) {
      console.error("Error al editar actividad:", error);
    }
  };

  // --------- Eliminar ---------
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

  // --------- Transcript ---------
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
      <Title order={2} mb="xl" mt="xs">
        Actividades del Evento
      </Title>

      {/* --------- CREAR ACTIVIDAD (solo selecciona hosts existentes) --------- */}
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

          {/* Selección múltiple de hosts existentes */}
          <MultiSelect
            label="Hosts del evento"
            placeholder="Selecciona uno o varios hosts existentes"
            data={hosts.map((h) => ({ value: h._id, label: h.name }))}
            value={selectedHostIdsCreate}
            onChange={setSelectedHostIdsCreate}
            searchable
            clearable
          />

          {/* Sugerencia: gestionar hosts en una pantalla aparte */}
          {/* <Button variant="subtle" onClick={() => navigate('/admin/hosts')}>Gestionar Hosts</Button> */}

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

      {/* --------- LISTA DE ACTIVIDADES --------- */}
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

      {/* --------- MODAL DE EDICIÓN (con crear host completo) --------- */}
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
                <TextInput label="Profesión / Rol" value={newHostProfession} onChange={(e) => setNewHostProfession(e.currentTarget.value)} placeholder="Ej: Data Scientist" />
              </Group>
              <TextInput label="Descripción" value={newHostDesc} onChange={(e) => setNewHostDesc(e.currentTarget.value)} placeholder="Bio o resumen" />
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
                      const imageUrl = await uploadImageToFirebase(newHostFile, `hosts/${eventId}`);

                      const created = await createHost({
                        name: newHostName.trim(),
                        image: imageUrl,
                        description_activity: false,
                        description: newHostDesc.trim(),
                        profession: newHostProfession.trim(),
                        published: newHostPublished,
                        order: 0,
                        index: 0,
                        event_id: eventId,
                        activities_ids: [],
                      });

                      // añadirlo a la lista y asignarlo
                      setHosts((prev) => [...prev, created]);
                      setEditSelectedHostIds((prev) => Array.from(new Set([...prev, created._id])));

                      // limpiar
                      setNewHostName("");
                      setNewHostDesc("");
                      setNewHostProfession("");
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

      {/* --------- CONFIRMAR ELIMINACIÓN --------- */}
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
