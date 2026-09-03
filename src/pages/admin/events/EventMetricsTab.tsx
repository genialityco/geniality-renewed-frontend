// src/pages/admin/events/EventMetricsTab.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
  Tooltip as MantineTooltip,
} from "@mantine/core";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { pdf } from "@react-pdf/renderer";
import {
  fetchEventMetrics,
  EventMetrics,
  ActivityMetrics,
  QuizMetrics,
} from "../../../services/eventMetricsService";
import { buildSampleMetrics } from "./eventMetricsSample";
import EventMembersPanel from "./EventMembersPanel";
import { EventMetricsPDF } from "./EventMetricsPDF";
import {
  formatDuration,
  formatMonth,
  formatNumber,
  hiddenQuizzesNote,
  splitEnabledQuizzes,
} from "./eventMetricsFormat";
import { useOrganization } from "../../../context/OrganizationContext";

interface Props {
  organizationId: string;
  eventId: string;
}

// Tokens de visualización (modo claro; la app no usa tema oscuro)
const viz = {
  series1: "#2a78d6", // azul — serie categórica 1
  series1Track: "#b7d3f6", // paso claro del mismo ramp (pista del medidor)
  inkPrimary: "#0b0b0b",
  inkSecondary: "#52514e",
  inkMuted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  surface: "#fcfcfb",
};

/** Nombre de archivo seguro a partir del nombre del curso */
function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "curso"
  );
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Text fw={600} fz={28} lh={1.2} mt={4}>
        {value}
      </Text>
      {detail && (
        <Text size="xs" c="dimmed" mt={4}>
          {detail}
        </Text>
      )}
    </Paper>
  );
}

function EnrollmentChart({
  byMonth,
}: {
  byMonth: { month: string; count: number }[];
}) {
  if (byMonth.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Aún no hay inscripciones registradas.
      </Text>
    );
  }

  const data = byMonth.map((m) => ({
    label: formatMonth(m.month),
    Inscripciones: m.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
      >
        <CartesianGrid
          vertical={false}
          stroke={viz.gridline}
          strokeWidth={1}
        />
        <XAxis
          dataKey="label"
          tick={{ fill: viz.inkMuted, fontSize: 12 }}
          axisLine={{ stroke: viz.baseline }}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: viz.inkMuted, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(11,11,11,0.04)" }}
          contentStyle={{
            background: viz.surface,
            border: `1px solid ${viz.gridline}`,
            borderRadius: 8,
            fontSize: 12,
            color: viz.inkPrimary,
          }}
        />
        <Bar
          dataKey="Inscripciones"
          fill={viz.series1}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActivityFunnel({ activities }: { activities: ActivityMetrics[] }) {
  if (activities.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Este curso aún no tiene actividades.
      </Text>
    );
  }

  let lastModule: string | null = null;

  return (
    <Stack gap="xs">
      {activities.map((activity) => {
        const moduleHeader =
          activity.moduleName && activity.moduleName !== lastModule ? (
            <Text
              size="xs"
              c="dimmed"
              tt="uppercase"
              fw={600}
              mt={lastModule ? "sm" : 0}
            >
              {activity.moduleName}
            </Text>
          ) : null;
        lastModule = activity.moduleName ?? lastModule;

        const ratio =
          activity.attendees > 0
            ? activity.completed / activity.attendees
            : 0;

        return (
          <Box key={activity.activityId}>
            {moduleHeader}
            <MantineTooltip
              label={`Progreso promedio ${activity.avgProgress}% · tiempo total ${formatDuration(
                activity.totalTimeMs
              )} (${activity.usersWithTime} usuarios con tiempo registrado)`}
              position="top-start"
              withArrow
            >
              <Box py={4}>
                <Group justify="space-between" gap="xs" mb={4} wrap="nowrap">
                  <Text size="sm" style={{ color: viz.inkPrimary }} truncate>
                    {activity.name}
                  </Text>
                  <Text
                    size="xs"
                    style={{ color: viz.inkSecondary, whiteSpace: "nowrap" }}
                  >
                    {formatNumber(activity.completed)}/
                    {formatNumber(activity.attendees)} completaron
                  </Text>
                </Group>
                <Box
                  style={{
                    height: 10,
                    borderRadius: 4,
                    background: viz.series1Track,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    style={{
                      width: `${Math.min(ratio * 100, 100)}%`,
                      height: "100%",
                      borderRadius:
                        ratio >= 1 ? 4 : ("4px 0 0 4px" as const),
                      background: viz.series1,
                    }}
                  />
                </Box>
              </Box>
            </MantineTooltip>
          </Box>
        );
      })}
    </Stack>
  );
}

/**
 * Nombre legible de un examen, con la misma terminología del gestor de
 * exámenes. Se decide por `moduleId`: un examen de un módulo ya borrado llega
 * sin `moduleName` y no debe confundirse con el examen general.
 */
function quizLabel(quiz: QuizMetrics): string {
  if (quiz.legacy) return "Examen sin identificar";
  if (quiz.moduleId === null) return "General del curso";
  return quiz.moduleName
    ? `Módulo: ${quiz.moduleName}`
    : "Módulo eliminado";
}

function QuizzesTable({ quizzes }: { quizzes: QuizMetrics[] }) {
  if (quizzes.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Este curso no tiene exámenes configurados.
      </Text>
    );
  }

  const { enabled, hiddenCount } = splitEnabledQuizzes(quizzes);
  const legacy = enabled.some((q) => q.legacy);

  if (enabled.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Todos los exámenes de este curso están deshabilitados.
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      {legacy && (
        <Alert color="yellow" title="Solo se está viendo un examen">
          <Text size="sm">
            El servidor de este entorno todavía no distingue los varios
            exámenes de un curso, así que devuelve uno solo y sin identificar.
            Actualiza el backend para ver el examen general y el de cada
            módulo por separado.
          </Text>
        </Alert>
      )}
      <Table.ScrollContainer minWidth={720}>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Examen</Table.Th>
              <Table.Th ta="right">Intentos</Table.Th>
              <Table.Th ta="right">Usuarios</Table.Th>
              <Table.Th ta="right">Nota promedio</Table.Th>
              <Table.Th ta="right">Nota mínima</Table.Th>
              <Table.Th ta="right">Aprobación</Table.Th>
              <Table.Th ta="right">Sin calificar</Table.Th>
              <Table.Th ta="right">En revisión</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {enabled.map((quiz) => {
              const approval =
                quiz.passedUsers !== null && quiz.gradedUsers > 0
                  ? `${Math.round(
                      (quiz.passedUsers / quiz.gradedUsers) * 100
                    )}%`
                  : "—";
              return (
                <Table.Tr key={quiz.quizId}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm">{quizLabel(quiz)}</Text>
                      {quiz.moduleId === null && (
                        <Badge size="xs" variant="light">
                          General
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td ta="right">
                    {formatNumber(quiz.totalAttempts)}
                  </Table.Td>
                  <Table.Td ta="right">
                    {formatNumber(quiz.uniqueUsers)}
                  </Table.Td>
                  <Table.Td ta="right">
                    {quiz.avgBestScore !== null ? quiz.avgBestScore : "—"}
                  </Table.Td>
                  <Table.Td ta="right">
                    {quiz.passingScore !== null ? quiz.passingScore : "—"}
                  </Table.Td>
                  <Table.Td ta="right">
                    {approval}
                    {quiz.passedUsers !== null && (
                      <Text size="xs" c="dimmed">
                        {formatNumber(quiz.passedUsers)}/
                        {formatNumber(quiz.gradedUsers)}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">{formatNumber(quiz.pending)}</Table.Td>
                  <Table.Td ta="right">{formatNumber(quiz.review)}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {hiddenCount > 0 && (
        <Text size="xs" c="dimmed">
          {hiddenQuizzesNote(hiddenCount)}
        </Text>
      )}
    </Stack>
  );
}

export default function EventMetricsTab({ organizationId, eventId }: Props) {
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const { organization } = useOrganization();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDemoMode(false);
    fetchEventMetrics(organizationId, eventId)
      .then((data) => {
        if (!cancelled) setMetrics(data);
      })
      .catch((err) => {
        console.error("Error cargando métricas del evento:", err);
        if (!cancelled)
          setError("No se pudieron cargar las métricas del curso.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, eventId]);

  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader />
      </Group>
    );
  }

  if (error || !metrics) {
    return (
      <Alert color="red" title="Error">
        {error ?? "No se pudieron cargar las métricas del curso."}
      </Alert>
    );
  }

  const shownMetrics = demoMode ? buildSampleMetrics(metrics) : metrics;
  const { enrollment, time, activities, quizzes, certificates } = shownMetrics;
  const completionRate =
    enrollment.total > 0
      ? Math.round((enrollment.completed / enrollment.total) * 100)
      : 0;

  /** Genera el PDF del informe y lo descarga */
  const handleDownloadPDF = async () => {
    setDownloading(true);
    setPdfError(null);
    try {
      const blob = await pdf(
        <EventMetricsPDF
          metrics={shownMetrics}
          organizationName={organization?.name}
          demo={demoMode}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `metricas-${slugify(shownMetrics.event.name)}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Algunos navegadores cancelan la descarga si el blob se libera al instante
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("Error generando el PDF de métricas:", err);
      setPdfError("No se pudo generar el PDF del informe. Intenta de nuevo.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Stack gap="lg">
      {!demoMode && metrics.enrollment.total === 0 && (
        <Alert color="blue" title="Este curso aún no tiene inscritos">
          <Text size="sm">
            Cuando los usuarios se inscriban, aquí verás inscripciones por
            mes, avance por actividad, resultados del examen y certificados.
          </Text>
        </Alert>
      )}

      {pdfError && (
        <Alert color="red" title="Error" onClose={() => setPdfError(null)} withCloseButton>
          {pdfError}
        </Alert>
      )}

      <Group justify="flex-end">
        {!demoMode && (
          <Button size="xs" variant="light" onClick={() => setDemoMode(true)}>
            Ver con datos de ejemplo
          </Button>
        )}
        <Button
          size="xs"
          variant="filled"
          onClick={handleDownloadPDF}
          loading={downloading}
        >
          Descargar informe PDF
        </Button>
      </Group>

      {/* KPIs principales */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <StatTile
          label="Inscritos"
          value={formatNumber(enrollment.total)}
          detail={`${formatNumber(enrollment.notStarted)} sin empezar · ${formatNumber(
            enrollment.inProgress
          )} en progreso`}
        />
        <StatTile
          label="Completaron el curso"
          value={`${completionRate}%`}
          detail={`${formatNumber(enrollment.completed)} de ${formatNumber(
            enrollment.total
          )} inscritos`}
        />
        <StatTile
          label="Progreso promedio"
          value={`${enrollment.avgProgress}%`}
        />
        <StatTile
          label="Tiempo promedio por usuario"
          value={formatDuration(time.avgPerUserMs)}
          detail={`${formatDuration(time.totalMs)} en total · ${formatNumber(
            time.usersWithTime
          )} usuarios`}
        />
      </SimpleGrid>

      {/* Inscripciones en el tiempo */}
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb={2}>
          Inscripciones por mes
        </Title>
        <Text size="xs" c="dimmed" mb="sm">
          Nuevos inscritos según su fecha de inscripción
        </Text>
        <EnrollmentChart byMonth={enrollment.byMonth} />
      </Paper>

      {/* Embudo por actividad */}
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb={2}>
          Avance por actividad
        </Title>
        <Text size="xs" c="dimmed" mb="sm">
          Usuarios que completaron cada actividad, sobre los que la iniciaron.
          Pasa el cursor para ver progreso y tiempo.
        </Text>
        <ActivityFunnel activities={activities} />
      </Paper>

      {/* Avance por miembro */}
      <Paper withBorder p="md" radius="md">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Box>
            <Title order={5} mb={2}>
              Avance por miembro
            </Title>
            <Text size="xs" c="dimmed">
              Progreso individual de cada inscrito, actividad por actividad.
            </Text>
          </Box>
          {!showMembers && (
            <Button
              size="xs"
              variant="light"
              onClick={() => setShowMembers(true)}
            >
              Ver avance por miembro
            </Button>
          )}
        </Group>
        {showMembers && (
          <Box mt="sm">
            <EventMembersPanel organizationId={organizationId} eventId={eventId} />
          </Box>
        )}
      </Paper>

      {/* Exámenes */}
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb={2}>
          Exámenes
        </Title>
        <Text size="xs" c="dimmed" mb="sm">
          Un curso puede tener un examen general y uno por módulo; aquí se
          muestran todos por separado. La nota es el mejor intento de cada
          usuario.
        </Text>
        <QuizzesTable quizzes={quizzes} />
      </Paper>

      {/* Certificados */}
      <Paper withBorder p="md" radius="md">
        <Title order={5} mb="sm">
          Certificados
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }}>
          <StatTile
            label="Certificados generados"
            value={formatNumber(certificates.completed)}
            detail={`${formatNumber(certificates.total)} solicitados`}
          />
          <StatTile
            label="Pendientes"
            value={formatNumber(certificates.pending)}
          />
          <StatTile
            label="Fallidos"
            value={formatNumber(certificates.failed)}
          />
        </SimpleGrid>
      </Paper>
    </Stack>
  );
}
