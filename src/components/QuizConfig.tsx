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
  getQuizByEventId,
  saveQuizConfig,
  QuizConfig as QuizConfigType,
  DEFAULT_QUIZ_CONFIG,
} from "../services/QuizService";

interface QuizConfigProps {
  eventId: string;
}

export default function QuizConfig({ eventId }: QuizConfigProps) {
  const [quizId, setQuizId] = useState<string | null>(null);
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

  const [hasNota, setHasNota] = useState(false);
  const [nota, setNota] = useState<number | string>(60);

  const [questionDisplay, setQuestionDisplay] = useState<"all" | "one-by-one">(
    DEFAULT_QUIZ_CONFIG.questionDisplay,
  );

  // ── Carga inicial ──
  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    (async () => {
      try {
        const quiz = await getQuizByEventId(eventId);
        if (!quiz) {
          setFetchError(
            "No existe un examen para este evento. Crea el examen primero.",
          );
          return;
        }
        const id = quiz._id ?? quiz.id ?? null;
        setQuizId(id);

        const cfg = quiz.config;
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
    if (!quizId) return;
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
      await saveQuizConfig(quizId, config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      setSaveError(
        e?.response?.data?.message ?? "Error al guardar la configuración.",
      );
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
              placeholder="ej. 60"
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

      <Button
        size="sm"
        loading={saving}
        onClick={handleSave}
        disabled={!quizId}
      >
        Guardar configuración
      </Button>
    </Paper>
  );
}

