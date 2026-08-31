import { useCallback, useEffect, useState } from "react";
import {
  Tabs,
  Select,
  Group,
  Text,
  Loader,
  Badge,
  Stack,
  Button,
  Paper,
  Switch,
} from "@mantine/core";
import { FaArrowsRotate, FaTrash } from "react-icons/fa6";
import { getModulesByEventId } from "../../../services/moduleService";
import {
  getQuizzesByEventId,
  setQuizEnabled,
  deleteQuiz,
  Quiz,
} from "../../../services/QuizService";
import { Module } from "../../../services/types";
import { toastSaved, toastDeleted, toastError } from "../../../utils/toast";
import QuizEditComponent from "../../../components/QuizEditComponent";
import QuizList from "../../../components/QuizList";

interface Props {
  eventId: string;
}

/**
 * Gestor de exámenes del curso. Permite crear/editar el examen general y un
 * examen por módulo. Cada examen se edita (Preguntas) y se revisan sus
 * resultados de forma independiente. La configuración (tiempo, intentos, nota)
 * es compartida y se edita en la pestaña "Configuración".
 */
export default function AdminExamsManager({ eventId }: Props) {
  const [modules, setModules] = useState<Module[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  // "general" o el _id de un módulo
  const [selected, setSelected] = useState<string>("general");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mods, qz] = await Promise.all([
        getModulesByEventId(eventId),
        getQuizzesByEventId(eventId),
      ]);
      setModules(mods);
      setQuizzes(qz);
    } catch (e) {
      console.error("Error cargando exámenes:", e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const hasQuiz = (moduleId: string | null): boolean =>
    moduleId === null
      ? quizzes.some((q) => !q.moduleId)
      : quizzes.some((q) => q.moduleId && String(q.moduleId) === String(moduleId));

  const moduleIdForSelected = selected === "general" ? null : selected;
  const selectedQuiz: Quiz | undefined =
    moduleIdForSelected === null
      ? quizzes.find((q) => !q.moduleId)
      : quizzes.find(
          (q) => q.moduleId && String(q.moduleId) === String(moduleIdForSelected),
        );
  const selectedHasQuiz = !!selectedQuiz;
  const selectedQuizId = selectedQuiz?._id ?? selectedQuiz?.id ?? "";

  const handleToggleEnabled = async (enabled: boolean) => {
    if (!selectedQuizId) return;
    setBusy(true);
    try {
      await setQuizEnabled(selectedQuizId, enabled);
      toastSaved(enabled ? "Examen habilitado" : "Examen deshabilitado");
      await load();
    } catch (e: any) {
      toastError(
        "No se pudo actualizar el examen",
        e?.response?.data?.message || e?.message,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedQuizId) return;
    const label =
      moduleIdForSelected === null
        ? "el examen general del curso"
        : "el examen de este módulo";
    if (
      !window.confirm(
        `¿Eliminar ${label}? Esta acción no se puede deshacer y borra sus preguntas y resultados.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteQuiz(selectedQuizId);
      toastDeleted("Examen eliminado");
      await load();
    } catch (e: any) {
      toastError(
        "No se pudo eliminar el examen",
        e?.response?.data?.message || e?.message,
      );
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { value: "general", label: `General del curso${hasQuiz(null) ? " ✓" : ""}` },
    ...modules.map((m) => ({
      value: m._id,
      label: `Módulo: ${m.module_name}${hasQuiz(m._id) ? " ✓" : ""}`,
    })),
  ];

  if (loading) {
    return (
      <Group mt="sm">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Cargando exámenes…
        </Text>
      </Group>
    );
  }

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Select
            label="Examen"
            description="Elige el examen general del curso o el de un módulo. Un examen sin módulo es el examen general."
            data={options}
            value={selected}
            onChange={(v) => setSelected(v || "general")}
            w={360}
            allowDeselect={false}
          />
          <Group gap="xs">
            <Badge
              size="lg"
              variant="light"
              color={selectedHasQuiz ? "teal" : "gray"}
            >
              {selectedHasQuiz ? "Examen creado" : "Sin crear"}
            </Badge>
            <Button
              size="sm"
              variant="light"
              leftSection={<FaArrowsRotate size={14} />}
              onClick={load}
            >
              Actualizar
            </Button>
          </Group>
        </Group>

        {selectedHasQuiz && (
          <Group justify="space-between" align="center" mt="md" wrap="wrap">
            <Switch
              checked={selectedQuiz?.enabled !== false}
              onChange={(e) => handleToggleEnabled(e.currentTarget.checked)}
              disabled={busy}
              label={
                selectedQuiz?.enabled !== false
                  ? "Examen habilitado (visible para el alumno)"
                  : "Examen deshabilitado (oculto para el alumno)"
              }
            />
            <Button
              size="sm"
              color="red"
              variant="light"
              leftSection={<FaTrash size={14} />}
              loading={busy}
              onClick={handleDelete}
            >
              Eliminar examen
            </Button>
          </Group>
        )}
        <Text size="xs" c="dimmed" mt="xs">
          Al guardar preguntas se crea el examen para la selección actual. La
          configuración (tiempo, intentos, nota) es la misma para todos y se
          edita en la pestaña «Configuración».
        </Text>
      </Paper>

      <Tabs defaultValue="Preguntas" keepMounted={false}>
        <Tabs.List>
          <Tabs.Tab value="Preguntas">Preguntas</Tabs.Tab>
          <Tabs.Tab value="Resultados">Resultados</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="Preguntas" pt="md">
          <QuizEditComponent
            key={`edit-${selected}`}
            eventId={eventId}
            moduleId={moduleIdForSelected}
          />
        </Tabs.Panel>

        <Tabs.Panel value="Resultados" pt="md">
          <QuizList
            key={`list-${selected}`}
            eventId={eventId}
            moduleId={moduleIdForSelected}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
