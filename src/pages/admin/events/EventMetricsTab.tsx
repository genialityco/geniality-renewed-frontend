// src/pages/admin/events/EventMetricsTab.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
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
import {
  fetchEventMetrics,
  EventMetrics,
  ActivityMetrics,
} from "../../../services/eventMetricsService";
import { buildSampleMetrics } from "./eventMetricsSample";

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

const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function formatMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split("-");
  const idx = Number(month) - 1;
  const name = MONTHS_ES[idx] ?? month;
  return `${name} ${year}`;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0 min";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-CO");
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

export default function EventMetricsTab({ organizationId, eventId }: Props) {
  const [metrics, setMetrics] = useState<EventMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

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
  const { enrollment, time, activities, quiz, certificates } = shownMetrics;
  const completionRate =
    enrollment.total > 0
      ? Math.round((enrollment.completed / enrollment.total) * 100)
      : 0;

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

      {!demoMode && (
        <Group justify="flex-end">
          <Button size="xs" variant="light" onClick={() => setDemoMode(true)}>
            Ver con datos de ejemplo
          </Button>
        </Group>
      )}

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

      {/* Examen y certificados */}
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <Paper withBorder p="md" radius="md">
          <Title order={5} mb="sm">
            Examen
          </Title>
          {quiz.exists ? (
            <SimpleGrid cols={2}>
              <StatTile
                label="Intentos"
                value={formatNumber(quiz.totalAttempts)}
                detail={`${formatNumber(quiz.uniqueUsers)} usuarios`}
              />
              <StatTile
                label="Nota promedio (mejor intento)"
                value={
                  quiz.avgBestScore !== null ? `${quiz.avgBestScore}` : "—"
                }
                detail={
                  quiz.passingScore !== null
                    ? `Nota mínima para aprobar: ${quiz.passingScore}`
                    : "Sin nota mínima configurada"
                }
              />
              <StatTile
                label="Aprobación"
                value={
                  quiz.passedUsers !== null && quiz.gradedUsers > 0
                    ? `${Math.round(
                        (quiz.passedUsers / quiz.gradedUsers) * 100
                      )}%`
                    : "—"
                }
                detail={
                  quiz.passedUsers !== null
                    ? `${formatNumber(quiz.passedUsers)} de ${formatNumber(
                        quiz.gradedUsers
                      )} usuarios calificados`
                    : "Requiere nota mínima configurada"
                }
              />
              <StatTile
                label="Pendientes de revisión"
                value={formatNumber(quiz.review)}
                detail={`${formatNumber(quiz.pending)} sin calificar`}
              />
            </SimpleGrid>
          ) : (
            <Text size="sm" c="dimmed">
              Este curso no tiene examen configurado.
            </Text>
          )}
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Title order={5} mb="sm">
            Certificados
          </Title>
          <SimpleGrid cols={2}>
            <StatTile
              label="Certificados generados"
              value={formatNumber(certificates.completed)}
              detail={`${formatNumber(certificates.total)} solicitados`}
            />
            <StatTile
              label="Pendientes / fallidos"
              value={`${formatNumber(certificates.pending)} / ${formatNumber(
                certificates.failed
              )}`}
            />
          </SimpleGrid>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
