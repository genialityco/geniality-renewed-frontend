import { useEffect, useState } from "react";
import { Button, List, Loader, TextInput, Select, Modal } from "@mantine/core";
import {
  getActivitiesByEvent,
  createActivity,
  deleteActivity,
  updateActivityPut, // <<--- Asegúrate de importar esta función
} from "../../../services/activityService";
import { Activity, Module } from "../../../services/types";
import { getModulesByEventId } from "../../../services/moduleService";

interface Props {
  organizationId?: string;
  eventId?: string;
}

export default function AdminActivities({ eventId }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Campos para el formulario de creación de actividad
  const [activityName, setActivityName] = useState("");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");

  // --------- ESTADOS PARA EDICIÓN -----------
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editActivity, setEditActivity] = useState<Partial<Activity> | null>(
    null
  );

  // Cada campo a editar (puedes también usar un único objeto en editActivity)
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVideoUrl, setEditVideoUrl] = useState("");
  const [editHostIds, setEditHostIds] = useState<string>("");
  // Podrías usar MultiSelect con un array de hosts. Aquí simplifico a una sola cadena

  useEffect(() => {
    if (!eventId) return;

    // Cargar actividades y módulos asociados al evento
    Promise.all([getActivitiesByEvent(eventId), getModulesByEventId(eventId)])
      .then(([acts, mods]) => {
        setActivities(acts);
        setModules(mods);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error al cargar actividades o módulos:", error);
        setLoading(false);
      });
  }, [eventId]);

  if (loading) return <Loader />;

  // ========== CREAR Actividad ==========
  const handleCreateActivity = async () => {
    if (!eventId || !activityName) return;
    try {
      const newActivityData: Partial<Activity> = {
        name: activityName,
        event_id: eventId,
        module_id: selectedModule || undefined,
        video: videoUrl,
        // ...otros campos si los necesitas
      };

      const created = await createActivity(newActivityData);

      // Agregar la actividad creada al array local
      setActivities((prev) => [...prev, created]);
      // Resetear campos del formulario
      setActivityName("");
      setSelectedModule(null);
      setVideoUrl("");
    } catch (error) {
      console.error("Error al crear actividad:", error);
    }
  };

  // ========== ELIMINAR Actividad ==========
  const handleDeleteActivity = async (activityId: string) => {
    if (!eventId) return;
    try {
      await deleteActivity(activityId);
      // En tu `activityService` quizás no necesitas eventId para eliminar, revisa tu ruta
      setActivities((prev) => prev.filter((a) => a._id !== activityId));
    } catch (error) {
      console.error("Error al eliminar actividad:", error);
    }
  };

  // ========== ABRIR MODAL DE EDICIÓN ==========
  const handleOpenEdit = (act: Activity) => {
    setEditActivity(act);

    // Cargamos los campos
    setEditName(act.name || "");
    setEditDescription(act.description || "");
    setEditVideoUrl(act.video || "");

    // Si es un array, lo convertimos a una cadena separada por comas
    const hostIdsStr = act.host_ids ? act.host_ids.join(",") : "";
    setEditHostIds(hostIdsStr);

    setEditModalOpen(true);
  };

  // ========== GUARDAR EDICIÓN ==========
  const handleSaveEdit = async () => {
    if (!editActivity?._id) return;

    try {
      // Convertir la cadena de hostIds en array
      const hostIdsArray = editHostIds
        .split(",")
        .map((h) => h.trim())
        .filter((h) => h !== "");

      const updatedData: Partial<Activity> = {
        name: editName,
        description: editDescription,
        video: editVideoUrl,
        host_ids: hostIdsArray,
      };

      const updated = await updateActivityPut(editActivity._id, updatedData);

      // Actualizar la lista local
      setActivities((prev) =>
        prev.map((a) => (a._id === editActivity._id ? updated : a))
      );

      // Cerrar el modal y limpiar
      setEditModalOpen(false);
      setEditActivity(null);
    } catch (error) {
      console.error("Error al editar actividad:", error);
    }
  };

  return (
    <div>
      <h3>Actividades</h3>

      {/* Formulario para crear nueva actividad */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 400,
        }}
      >
        <TextInput
          label="Nombre de la Actividad"
          value={activityName}
          onChange={(e) => setActivityName(e.currentTarget.value)}
        />
        <Select
          label="Módulo"
          placeholder="Seleccione un módulo (opcional)"
          data={modules.map((m) => ({ value: m._id, label: m.module_name }))}
          value={selectedModule}
          onChange={setSelectedModule}
        />
        <TextInput
          label="Video URL (Vimeo / YouTube / etc.)"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.currentTarget.value)}
        />
        <Button onClick={handleCreateActivity}>Crear Actividad</Button>
      </div>

      {/* Lista de actividades existentes */}
      <List spacing="sm" mt="xl">
        {activities.map((act) => (
          <List.Item key={act._id}>
            {act.name} {act.module_id && <em>(Módulo: {act.module_id})</em>}
            {"  "}
            <Button
              variant="outline"
              size="xs"
              ml="md"
              onClick={() => handleOpenEdit(act)}
            >
              Editar
            </Button>
            <Button
              variant="outline"
              color="red"
              size="xs"
              ml="md"
              onClick={() => handleDeleteActivity(act._id)}
            >
              Eliminar
            </Button>
          </List.Item>
        ))}
      </List>

      {/* MODAL DE EDICIÓN */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Actividad"
      >
        <TextInput
          label="Nombre de la Actividad"
          value={editName}
          onChange={(e) => setEditName(e.currentTarget.value)}
          mb="sm"
        />
        <TextInput
          label="Descripción"
          value={editDescription}
          onChange={(e) => setEditDescription(e.currentTarget.value)}
          mb="sm"
        />
        <TextInput
          label="Video URL"
          value={editVideoUrl}
          onChange={(e) => setEditVideoUrl(e.currentTarget.value)}
          mb="sm"
        />
        <TextInput
          label="Host IDs (separados por comas)"
          value={editHostIds}
          onChange={(e) => setEditHostIds(e.currentTarget.value)}
          mb="sm"
        />

        <Button onClick={handleSaveEdit}>Guardar Cambios</Button>
      </Modal>
    </div>
  );
}
