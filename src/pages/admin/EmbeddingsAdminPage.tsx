import { useState } from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  TextInput,
  NumberInput,
  Switch,
  Button,
  Alert,
  Badge,
  Group,
  Divider,
  Progress,
} from "@mantine/core";
import { FaWandMagicSparkles } from "react-icons/fa6";
import {
  generateEmbeddingForSegment,
  generateEmbeddingsForActivity,
  backfillMissingEmbeddings,
  regenerateAllEmbeddings,
} from "../../services/transcriptSegmentsService";

function getErrorMessage(err: any): string {
  return (
    err?.response?.data?.message || err?.message || "Ocurrió un error inesperado"
  );
}

export default function EmbeddingsAdminPage() {
  // --------- Vectorizar una actividad ---------
  const [activityId, setActivityId] = useState("");
  const [forceActivity, setForceActivity] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [activityResult, setActivityResult] = useState<{
    total: number;
    updated: number;
  } | null>(null);

  const handleGenerateForActivity = async () => {
    if (!activityId.trim()) return;
    setLoadingActivity(true);
    setActivityError(null);
    setActivityResult(null);
    try {
      const result = await generateEmbeddingsForActivity(
        activityId.trim(),
        forceActivity
      );
      setActivityResult(result);
    } catch (err) {
      setActivityError(getErrorMessage(err));
    } finally {
      setLoadingActivity(false);
    }
  };

  // --------- Vectorizar un segmento puntual ---------
  const [segmentId, setSegmentId] = useState("");
  const [loadingSegment, setLoadingSegment] = useState(false);
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [segmentEmbeddingLength, setSegmentEmbeddingLength] = useState<
    number | null
  >(null);

  const handleGenerateForSegment = async () => {
    if (!segmentId.trim()) return;
    setLoadingSegment(true);
    setSegmentError(null);
    setSegmentEmbeddingLength(null);
    try {
      const segment = await generateEmbeddingForSegment(segmentId.trim());
      setSegmentEmbeddingLength(segment.embedding?.length || 0);
    } catch (err) {
      setSegmentError(getErrorMessage(err));
    } finally {
      setLoadingSegment(false);
    }
  };

  // --------- Backfill global ---------
  const [limit, setLimit] = useState<number>(200);
  const [loadingBackfill, setLoadingBackfill] = useState(false);
  const [runningUntilDone, setRunningUntilDone] = useState(false);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [totalUpdated, setTotalUpdated] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  const runBackfillOnce = async () => {
    const result = await backfillMissingEmbeddings(limit);
    setTotalUpdated((prev) => prev + result.updated);
    setRemaining(result.remaining);
    return result;
  };

  const handleBackfillOnce = async () => {
    setLoadingBackfill(true);
    setBackfillError(null);
    try {
      await runBackfillOnce();
    } catch (err) {
      setBackfillError(getErrorMessage(err));
    } finally {
      setLoadingBackfill(false);
    }
  };

  const handleBackfillUntilDone = async () => {
    setRunningUntilDone(true);
    setBackfillError(null);
    try {
      let currentRemaining = remaining ?? Infinity;
      // Primera pasada (o si ya se sabía que quedaba backlog).
      do {
        const result = await runBackfillOnce();
        currentRemaining = result.remaining;
        if (result.updated === 0) break; // nada más que procesar, evita loop infinito
      } while (currentRemaining > 0);
    } catch (err) {
      setBackfillError(getErrorMessage(err));
    } finally {
      setRunningUntilDone(false);
    }
  };

  // --------- Regenerar TODOS los embeddings (de cualquier actividad) ---------
  const [runningRegenerateAll, setRunningRegenerateAll] = useState(false);
  const [regenerateAllError, setRegenerateAllError] = useState<string | null>(
    null
  );
  const [regenerateAllUpdated, setRegenerateAllUpdated] = useState(0);
  const [regenerateAllDone, setRegenerateAllDone] = useState(false);

  const handleRegenerateAll = async () => {
    if (
      !window.confirm(
        "Esto va a regenerar el embedding de TODOS los segmentos de transcript de TODAS las actividades, aunque ya tengan uno. Puede tardar y consume cuota de la API de embeddings. ¿Continuar?"
      )
    ) {
      return;
    }

    setRunningRegenerateAll(true);
    setRegenerateAllError(null);
    setRegenerateAllUpdated(0);
    setRegenerateAllDone(false);
    try {
      let cursor: string | null | undefined = undefined;
      do {
        const result = await regenerateAllEmbeddings(limit, cursor);
        setRegenerateAllUpdated((prev) => prev + result.updated);
        cursor = result.nextCursor;
        if (result.updated === 0) break; // nada más que procesar
      } while (cursor);
      setRegenerateAllDone(true);
    } catch (err) {
      setRegenerateAllError(getErrorMessage(err));
    } finally {
      setRunningRegenerateAll(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Embeddings de transcripciones</Title>
          <Text c="dimmed" size="sm">
            Generar manualmente los vectores semánticos de los segmentos de
            transcript (campo <code>embedding</code>, usado por la búsqueda
            vectorial). Normalmente se generan solos al terminar la
            transcripción de una actividad; esta pantalla es para re-generar o
            rellenar el backlog.
          </Text>
        </div>

        {/* --------- Vectorizar una actividad --------- */}
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <Title order={4}>Vectorizar una actividad</Title>
            <TextInput
              label="ID de la actividad"
              placeholder="Ej: 66757ef45b3ad8b13601ab34"
              value={activityId}
              onChange={(e) => setActivityId(e.currentTarget.value)}
            />
            <Switch
              label="Forzar (regenerar incluso los que ya tienen embedding)"
              checked={forceActivity}
              onChange={(e) => setForceActivity(e.currentTarget.checked)}
            />
            <Button
              leftSection={<FaWandMagicSparkles size={14} />}
              onClick={handleGenerateForActivity}
              loading={loadingActivity}
              disabled={!activityId.trim()}
              style={{ alignSelf: "flex-start" }}
            >
              Generar embeddings de esta actividad
            </Button>

            {activityError && (
              <Alert color="red" title="Error">
                {activityError}
              </Alert>
            )}
            {activityResult && (
              <Alert color="green" title="Listo">
                {activityResult.total === 0
                  ? "No había segmentos pendientes (usa 'Forzar' para regenerar de todas formas)."
                  : `Se generaron ${activityResult.updated} de ${activityResult.total} segmentos.`}
              </Alert>
            )}
          </Stack>
        </Card>

        {/* --------- Vectorizar un segmento puntual --------- */}
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <Title order={4}>Vectorizar un segmento puntual</Title>
            <TextInput
              label="ID del segmento"
              placeholder="Ej: 68472199b74373a9cd698ef7"
              value={segmentId}
              onChange={(e) => setSegmentId(e.currentTarget.value)}
            />
            <Button
              leftSection={<FaWandMagicSparkles size={14} />}
              onClick={handleGenerateForSegment}
              loading={loadingSegment}
              disabled={!segmentId.trim()}
              style={{ alignSelf: "flex-start" }}
            >
              Generar embedding de este segmento
            </Button>

            {segmentError && (
              <Alert color="red" title="Error">
                {segmentError}
              </Alert>
            )}
            {segmentEmbeddingLength !== null && (
              <Alert color="green" title="Listo">
                Embedding generado ({segmentEmbeddingLength} dimensiones).
              </Alert>
            )}
          </Stack>
        </Card>

        {/* --------- Backfill global --------- */}
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <Title order={4}>Backfill global</Title>
            <Text size="sm" c="dimmed">
              Procesa en lotes los segmentos sin embedding de cualquier
              actividad (útil para rellenar el histórico la primera vez).
            </Text>

            <NumberInput
              label="Tamaño del lote por llamada"
              value={limit}
              onChange={(v) => setLimit(Number(v) || 200)}
              min={1}
              max={2000}
            />

            <Group>
              <Button
                variant="light"
                onClick={handleBackfillOnce}
                loading={loadingBackfill}
                disabled={runningUntilDone}
              >
                Procesar un lote
              </Button>
              <Button
                onClick={handleBackfillUntilDone}
                loading={runningUntilDone}
                disabled={loadingBackfill}
              >
                Procesar todo (repetir hasta vaciar)
              </Button>
            </Group>

            {backfillError && (
              <Alert color="red" title="Error">
                {backfillError}
              </Alert>
            )}

            {(totalUpdated > 0 || remaining !== null) && (
              <Stack gap={6}>
                <Group gap="xs">
                  <Badge color="teal">Vectorizados: {totalUpdated}</Badge>
                  <Badge color={remaining ? "yellow" : "gray"}>
                    Pendientes: {remaining ?? "?"}
                  </Badge>
                </Group>
                {remaining !== null && (
                  <Progress
                    value={
                      remaining === 0
                        ? 100
                        : (totalUpdated / (totalUpdated + remaining)) * 100
                    }
                    size="sm"
                    color={remaining === 0 ? "teal" : "blue"}
                  />
                )}
              </Stack>
            )}
          </Stack>
        </Card>

        {/* --------- Regenerar TODOS los embeddings --------- */}
        <Card withBorder p="lg" radius="md">
          <Stack gap="md">
            <Title order={4}>Regenerar TODOS los embeddings</Title>
            <Text size="sm" c="dimmed">
              Re-procesa el embedding de <strong>todos</strong> los segmentos de
              transcript de todas las actividades, incluso los que ya tienen
              uno (a diferencia del backfill, que solo rellena los vacíos).
              Úsalo tras cambiar de modelo o dimensión, para que no quede
              ningún segmento con un vector de otro tamaño. Reutiliza el
              "Tamaño del lote" configurado arriba.
            </Text>

            <Button
              color="orange"
              leftSection={<FaWandMagicSparkles size={14} />}
              onClick={handleRegenerateAll}
              loading={runningRegenerateAll}
              style={{ alignSelf: "flex-start" }}
            >
              Regenerar todos los embeddings
            </Button>

            {regenerateAllError && (
              <Alert color="red" title="Error">
                {regenerateAllError}
              </Alert>
            )}

            {(regenerateAllUpdated > 0 || runningRegenerateAll) && (
              <Badge color={regenerateAllDone ? "teal" : "blue"}>
                {regenerateAllDone
                  ? `Listo: ${regenerateAllUpdated} segmentos regenerados.`
                  : `Procesando... ${regenerateAllUpdated} regenerados hasta ahora`}
              </Badge>
            )}
          </Stack>
        </Card>

        <Divider />
        <Text size="xs" c="dimmed">
          Estas acciones requieren sesión de administrador (se usan tus
          credenciales actuales automáticamente). Cada llamada consume cuota de
          la API de embeddings configurada en el backend.
        </Text>
      </Stack>
    </Container>
  );
}
