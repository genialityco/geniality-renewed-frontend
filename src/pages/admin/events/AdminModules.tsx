import { useEffect, useState } from "react";
import {
  Button,
  TextInput,
  Loader,
  Paper,
  Stack,
  Group,
  Text,
  CloseButton,
  Divider,
  Modal,
  ActionIcon,
  NumberInput,
} from "@mantine/core";
import {
  getModulesByEventId,
  createModule,
  deleteModule,
  updateModule,
} from "../../../services/moduleService";
import { Module } from "../../../services/types";
import { FaCheck, FaPencil, FaPlus, FaX } from "react-icons/fa6";

interface Props {
  organizationId?: string;
  eventId?: string;
}

export default function AdminModules({ eventId }: Props) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModuleName, setNewModuleName] = useState("");
  const [creating, setCreating] = useState(false);

  // Eliminar
  const [moduleToDelete, setModuleToDelete] = useState<Module | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editOrder, setEditOrder] = useState<number | undefined>(undefined);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    getModulesByEventId(eventId)
      .then((mods) => setModules(mods))
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleCreateModule = async () => {
    if (!eventId || !newModuleName.trim()) return;
    setCreating(true);
    try {
      const nextOrder =
        modules.length > 0
          ? Math.max(...modules.map((m) => m.order ?? 0)) + 1
          : 1;
      const createdModule = await createModule(eventId, {
        module_name: newModuleName.trim(),
        event_id: eventId,
        order: nextOrder,
      });
      setModules((prev) => [...prev, createdModule]);
      setNewModuleName("");
    } catch (error) {
      console.error(error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!eventId) return;
    try {
      await deleteModule(moduleId);
      setModules((prev) => prev.filter((m) => m._id !== moduleId));
    } catch (error) {
      console.error(error);
    }
  };

  // --- Edición ---
  const startEdit = (mod: Module) => {
    setEditingId(mod._id);
    setEditName(mod.module_name);
    setEditOrder(mod.order ?? undefined);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditOrder(undefined);
  };

  const saveEdit = async (mod: Module) => {
    if (!editName.trim()) return;
    setUpdating(true);
    try {
      const updated = await updateModule(mod._id, {
        module_name: editName.trim(),
        order: editOrder,
      });
      setModules((prev) =>
        prev.map((m) => (m._id === mod._id ? updated : m))
      );
      cancelEdit();
    } catch (error) {
      console.error(error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Paper p="lg" radius="lg" shadow="md" my="lg" withBorder>
        <Stack align="center">
          <Loader color="blue" />
          <Text c="dimmed">Cargando módulos...</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="xl" radius="lg" shadow="md" my="lg" withBorder>
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={700} size="lg">
            Módulos del Curso
          </Text>
        </Group>

        <Divider mb="sm" />

        <Group>
          <TextInput
            placeholder="Nombre del nuevo módulo"
            value={newModuleName}
            onChange={(e) => setNewModuleName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateModule();
            }}
            w={250}
          />
          <Button
            leftSection={<FaPlus size={16} />}
            loading={creating}
            onClick={handleCreateModule}
            disabled={!newModuleName.trim()}
          >
            Crear módulo
          </Button>
        </Group>

        <Divider my="sm" />

        <Stack gap={6}>
          {modules.length === 0 ? (
            <Text c="dimmed" ta="center">
              No hay módulos creados para este evento.
            </Text>
          ) : (
            modules
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((mod) =>
                editingId === mod._id ? (
                  <Paper
                    key={mod._id}
                    p="sm"
                    radius="md"
                    withBorder
                    shadow="xs"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Group align="center" grow>
                      <TextInput
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        w={180}
                        size="sm"
                        autoFocus
                        disabled={updating}
                        label="Nombre del módulo"
                      />
                      <NumberInput
                        value={editOrder}
                        onChange={(val) =>
                          setEditOrder(typeof val === "number" ? val : undefined)
                        }
                        min={1}
                        w={90}
                        size="sm"
                        disabled={updating}
                        label="Orden"
                      />
                    </Group>
                    <Group gap={4} mt="lg">
                      <ActionIcon
                        color="green"
                        variant="light"
                        size="lg"
                        loading={updating}
                        onClick={() => saveEdit(mod)}
                        title="Guardar"
                      >
                        <FaCheck size={20} />
                      </ActionIcon>
                      <ActionIcon
                        color="gray"
                        variant="light"
                        size="lg"
                        onClick={cancelEdit}
                        title="Cancelar"
                        disabled={updating}
                      >
                        <FaX size={20} />
                      </ActionIcon>
                    </Group>
                  </Paper>
                ) : (
                  <Paper
                    key={mod._id}
                    p="sm"
                    radius="md"
                    withBorder
                    shadow="xs"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <div>
                      <Text fw={500}>{mod.module_name}</Text>
                      <Text size="xs" c="dimmed">
                        Orden: {mod.order ?? "-"}
                      </Text>
                    </div>
                    <Group gap={4}>
                      <ActionIcon
                        color="blue"
                        variant="light"
                        onClick={() => startEdit(mod)}
                        title="Editar módulo"
                      >
                        <FaPencil size={15} />
                      </ActionIcon>
                      <CloseButton
                        aria-label="Eliminar módulo"
                        onClick={() => setModuleToDelete(mod)}
                        title="Eliminar"
                      />
                    </Group>
                  </Paper>
                )
              )
          )}
        </Stack>
      </Stack>

      {/* Modal de confirmación de eliminación */}
      <Modal
        opened={!!moduleToDelete}
        onClose={() => setModuleToDelete(null)}
        title="¿Eliminar módulo?"
        centered
      >
        <Text mb="md">
          ¿Seguro que deseas eliminar el módulo{" "}
          <b>{moduleToDelete?.module_name}</b>? Esta acción no se puede deshacer.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setModuleToDelete(null)}>
            Cancelar
          </Button>
          <Button
            color="red"
            loading={deleting}
            onClick={async () => {
              if (!eventId || !moduleToDelete) return;
              setDeleting(true);
              try {
                await handleDeleteModule(moduleToDelete._id);
                setModuleToDelete(null);
              } finally {
                setDeleting(false);
              }
            }}
          >
            Eliminar
          </Button>
        </Group>
      </Modal>
    </Paper>
  );
}
