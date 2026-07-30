import { useEffect, useState } from "react";
import {
  Stack,
  NumberInput,
  Switch,
  Button,
  Text,
  Loader,
  Alert,
  Divider,
  Group,
  Paper,
  SegmentedControl,
} from "@mantine/core";
import { FaCircleCheck, FaTriangleExclamation } from "react-icons/fa6";
import {
  getQuizzesByEventId,
  saveQuizConfig,
  QuizConfig as QuizConfigType,
  DEFAULT_QUIZ_CONFIG,
} from "../services/QuizService";
import { toastSaved, toastError } from "../utils/toast";

interface QuizConfigProps {
  eventId: string;
}

export default function QuizConfig({ eventId }: QuizConfigProps) {
  // La configuración es compartida: se aplica a TODOS los exámenes del curso.
  const [quizIds, setQuizIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Campos del formulario ──
  const [hasTime, setHasTime] = useState(false);
  const [time, setTime] = useState<number | string>(30);

  const [hasAttempts, setHasAttempts] = useState(false);
  const [attempts, setAttempts] = useState<number | string>(1);

  const [hasNota, setHasNota] = useState(true);
  const [nota, setNota] = useState<number | string>(
    DEFAULT_QUIZ_CONFIG.nota ?? 70,
  );

  const [questionDisplay, setQuestionDisplay] = useState<"all" | "one-by-one">(
    DEFAULT_QUIZ_CONFIG.questionDisplay,
  );

  // ── Carga inicial ──
  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    (async () => {
      try {
        const quizzes = await getQuizzesByEventId(eventId);
        if (!quizzes || quizzes.length === 0) {
          setFetchError(
            "No existe ningún examen para este evento. Crea un examen primero.",
          );
          return;
        }
        setQuizIds(
          quizzes.map((q) => (q._id ?? q.id) as string).filter(Boolean),
        );

        // La config es la misma para todos: tomamos la del examen general o,
        // en su defecto, la del primero.
        const source = quizzes.find((q) => !q.moduleId) ?? quizzes[0];
        const cfg = source.config;
        if (cfg) {
          setHasTime(cfg.time != null);
          if (cfg.time != null) setTime(cfg.time);

          setHasAttempts(cfg.attempts != null);
          if (cfg.attempts != null) setAttempts(cfg.attempts);

          setHasNota(cfg.nota != null);
          if (cfg.nota != null) setNota(cfg.nota);

          setQuestionDisplay(cfg.questionDisplay ?? DEFAULT_QUIZ_CONFIG.questionDisplay);
        }
      } catch (e: any) {
        setFetchError(
          e?.response?.data?.message ?? "Error al cargar la configuración.",
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const handleSave = async () => {
    if (quizIds.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const config: QuizConfigType = {
        time: hasTime ? Number(time) : null,
        attempts: hasAttempts ? Number(attempts) : null,
        nota: hasNota ? Number(nota) : null,
        questionDisplay,
      };
      // Config compartida: se aplica a todos los exámenes del curso.
      await Promise.all(quizIds.map((id) => saveQuizConfig(id, config)));
      setSaveSuccess(true);
      toastSaved("Configuración del examen guardada");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ?? "Error al guardar la configuración.";
      setSaveError(msg);
      toastError("No se pudo guardar la configuración del examen", msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Group mt="sm">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Cargando configuración…
        </Text>
      </Group>
    );

  if (fetchError)
    return (
      <Alert
        icon={<FaTriangleExclamation size={14} />}
        color="red"
        mt="sm"
      >
        {fetchError}
      </Alert>
    );

  return (
    <Paper withBorder radius="md" p="md" mt="sm">
      <Text fw={600} size="sm" mb="xs">
        Configuración del examen
      </Text>
      <Text size="xs" c="dimmed" mb="md">
        Puedes dejar cualquier restricción desactivada para que sea ilimitada.
      </Text>

      <Divider mb="md" />

      <Stack gap="md">
        {/* ── Modo de visualización ── */}
        <div>
          <Text size="sm" fw={500} mb={4}>
            Modo de navegación de preguntas
          </Text>
          <Text size="xs" c="dimmed" mb="xs">
            Define si el usuario verá todas las preguntas a la vez o avanzará una por una sin poder retroceder.
          </Text>
          <SegmentedControl
            value={questionDisplay}
            onChange={(v) => setQuestionDisplay(v as "all" | "one-by-one")}
            data={[
              { label: "Todas en una página", value: "all" },
              { label: "Una por una (sin retroceder)", value: "one-by-one" },
            ]}
          />
        </div>

        {/* ── Tiempo ── */}
        <div>
          <Switch
            label="Limitar duración"
            description="Tiempo máximo para completar el examen"
            checked={hasTime}
            onChange={(e) => setHasTime(e.currentTarget.checked)}
            mb="xs"
          />
          {hasTime && (
            <NumberInput
              label="Duración (minutos)"
              min={1}
              max={600}
              value={time}
              onChange={setTime}
              placeholder="ej. 30"
              w={200}
            />
          )}
        </div>

        {/* ── Intentos ── */}
        <div>
          <Switch
            label="Limitar intentos"
            description="Número máximo de veces que el usuario puede intentar el examen"
            checked={hasAttempts}
            onChange={(e) => setHasAttempts(e.currentTarget.checked)}
            mb="xs"
          />
          {hasAttempts && (
            <NumberInput
              label="Intentos máximos"
              min={1}
              max={100}
              value={attempts}
              onChange={setAttempts}
              placeholder="ej. 1"
              w={200}
            />
          )}
        </div>

        {/* ── Nota mínima ── */}
        <div>
          <Switch
            label="Nota mínima para aprobar"
            description="Porcentaje mínimo requerido para considerar el examen aprobado"
            checked={hasNota}
            onChange={(e) => setHasNota(e.currentTarget.checked)}
            mb="xs"
          />
          {hasNota && (
            <NumberInput
              label="Nota mínima (%)"
              min={1}
              max={100}
              value={nota}
              onChange={setNota}
              placeholder="ej. 70"
              suffix="%"
              w={200}
            />
          )}
        </div>
      </Stack>

      <Divider mt="md" mb="md" />

      {saveSuccess && (
        <Alert
          icon={<FaCircleCheck size={14} />}
          color="teal"
          mb="sm"
        >
          Configuración guardada correctamente.
        </Alert>
      )}
      {saveError && (
        <Alert
          icon={<FaTriangleExclamation size={14} />}
          color="red"
          mb="sm"
        >
          {saveError}
        </Alert>
      )}

      <Text size="xs" c="dimmed" mb="xs">
        Esta configuración se aplica a todos los exámenes del curso.
      </Text>
      <Button
        size="sm"
        loading={saving}
        onClick={handleSave}
        disabled={quizIds.length === 0}
      >
        Guardar configuración
      </Button>
    </Paper>
  );
}

