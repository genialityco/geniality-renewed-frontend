// src/pages/admin/StudentTrackingAdminPage.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  MultiSelect,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import * as XLSX from "xlsx";
import { FaFileExcel, FaRotateRight } from "react-icons/fa6";
import { useOrganization } from "../../context/OrganizationContext";
import { fetchEventsByOrganizer } from "../../services/eventService";
import type { Event } from "../../services/types";
import {
  CourseUserStatus,
  StudentLastMessage,
  StudentStateRow,
  StudentStatesResponse,
  fetchStudentStates,
  runDailySnapshots,
} from "../../services/courseSnapshotsService";
import {
  ENGAGEMENT_KIND_LABELS,
  EngagementKind,
} from "../../services/engagementService";

const STATUS_LABELS: Record<CourseUserStatus, string> = {
  completed: "Graduado",
  active: "Activo",
  inactive: "Inactivo",
  never_active: "Nunca activo",
};

const STATUS_COLORS: Record<CourseUserStatus, string> = {
  completed: "green",
  active: "blue",
  inactive: "orange",
  never_active: "gray",
};

// Por defecto, los que aún pueden necesitar seguimiento
const DEFAULT_STATUSES: CourseUserStatus[] = [
  "active",
  "inactive",
  "never_active",
];

// En pantalla se limita; el Excel trae hasta EXPORT_LIMIT
const MAX_ROWS_ON_SCREEN = 300;
const EXPORT_LIMIT = 5000;

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("es-CO") : "—";

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const formatDuration = (ms: number) => {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const kindLabel = (kind: string) =>
  ENGAGEMENT_KIND_LABELS[kind as EngagementKind] || kind;

/** Cómo reaccionó el estudiante al último mensaje, en una palabra. */
const reactionOf = (m: StudentLastMessage) =>
  m.replied_at
    ? "Respondió"
    : m.clicked_at
    ? "Hizo clic"
    : m.meta_status === "read"
    ? "Lo leyó"
    : m.meta_status === "delivered"
    ? "Entregado"
    : m.meta_status === "failed"
    ? "No entregado"
    : m.status === "fallback_email"
    ? "Por email"
    : "Enviado";

/**
 * Seguimiento académico: estado de cada estudiante según el último snapshot
 * diario (avance, días sin actividad, si se le puede escribir por WhatsApp y
 * el último mensaje que recibió), con los menos activos primero.
 */
export default function StudentTrackingAdminPage() {
  const { organization } = useOrganization();
  const organizationId = organization?._id;

  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES);
  const [minDays, setMinDays] = useState<number | string>(7);
  const [reachable, setReachable] = useState(false);

  const [data, setData] = useState<StudentStatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filter = useCallback(
    () => ({
      eventId: eventId || undefined,
      status: statuses as CourseUserStatus[],
      minDaysInactive:
        minDays === "" || minDays === null ? undefined : Number(minDays),
      reachable,
    }),
    [eventId, statuses, minDays, reachable]
  );

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    try {
      setData(
        await fetchStudentStates(organizationId, {
          ...filter(),
          limit: MAX_ROWS_ON_SCREEN,
        })
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "No se pudo cargar el seguimiento"
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, filter]);

  useEffect(() => {
    if (!organizationId) return;
    fetchEventsByOrganizer(organizationId)
      .then(setEvents)
      .catch(() => setEvents([]));
    load();
    // Solo al abrir; los filtros se aplican con "Aplicar"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const recalculate = async () => {
    if (!organizationId) return;
    setRecalculating(true);
    try {
      const res = await runDailySnapshots(organizationId);
      notifications.show({
        color: "green",
        title: "Estado actualizado",
        message: `Se recalcularon ${res.courses} curso(s).`,
      });
      await load();
    } catch (e: any) {
      notifications.show({
        color: "red",
        title: "No se pudo recalcular",
        message: e?.response?.data?.message || e?.message || "",
      });
    } finally {
      setRecalculating(false);
    }
  };

  const exportRows = async () => {
    if (!organizationId) return;
    setExporting(true);
    try {
      const res = await fetchStudentStates(organizationId, {
        ...filter(),
        limit: EXPORT_LIMIT,
      });
      const rows = res.rows.map((r) => ({
        Nombre: r.name,
        Correo: r.email,
        Curso: r.event_name,
        Estado: STATUS_LABELS[r.status],
        "Avance del curso (%)": r.course_progress,
        "Avance en actividades (%)": r.activity_progress,
        Inscripción: formatDate(r.enrolled_at),
        "Última actividad": formatDate(r.last_activity_at),
        "Días sin actividad": r.days_inactive ?? "",
        "Tiempo en el curso": formatDuration(r.time_spent_ms),
        "Tiene teléfono": r.has_phone ? "Sí" : "No",
        "Acepta WhatsApp": r.whatsapp_opt_in ? "Sí" : "No",
        "Último mensaje": r.last_message ? kindLabel(r.last_message.kind) : "",
        "Fecha último mensaje": r.last_message
          ? formatDateTime(r.last_message.at)
          : "",
        "Reacción al último mensaje": r.last_message
          ? reactionOf(r.last_message)
          : "",
        "Mensajes en 30 días": r.messages_30d,
        "ID usuario": r.user_id,
      }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Seguimiento");
      XLSX.writeFile(
        book,
        `seguimiento_${res.snapshot_date || "sin_fecha"}.xlsx`
      );
    } finally {
      setExporting(false);
    }
  };

  if (!organizationId) return <Loader />;

  const counts = data?.counts;
  const enrolled = counts
    ? counts.completed + counts.active + counts.inactive + counts.never_active
    : 0;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={2}>Seguimiento académico</Title>
          <Text c="dimmed" size="sm">
            Estado de cada estudiante en sus cursos: avance, días sin
            actividad, si se le puede escribir por WhatsApp y cómo reaccionó
            al último mensaje. Los menos activos aparecen primero.
          </Text>
        </div>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="sm">
                {data?.snapshot_date ? (
                  <>
                    Datos del <b>{data.snapshot_date}</b>
                    {data.calculated_at &&
                      ` (calculados ${formatDateTime(data.calculated_at)})`}
                    . Se actualizan con el snapshot diario.
                  </>
                ) : (
                  "Aún no hay datos calculados para esta organización."
                )}
              </Text>
              <Button
                variant="light"
                leftSection={<FaRotateRight />}
                onClick={recalculate}
                loading={recalculating}
              >
                Recalcular ahora
              </Button>
            </Group>

            {counts && enrolled > 0 && (
              <Group gap="xl">
                <Stat label="Inscripciones" value={enrolled} />
                {(Object.keys(STATUS_LABELS) as CourseUserStatus[]).map((s) => (
                  <Stat key={s} label={STATUS_LABELS[s]} value={counts[s]} />
                ))}
                <Stat
                  label="No graduados alcanzables por WhatsApp"
                  value={data!.reachable_not_completed}
                />
              </Group>
            )}

            <Group align="flex-end" gap="sm" wrap="wrap">
              <Select
                label="Curso"
                placeholder="Todos los cursos"
                clearable
                searchable
                data={events.map((e) => ({ value: e._id, label: e.name }))}
                value={eventId}
                onChange={setEventId}
                w={280}
              />
              <MultiSelect
                label="Estado"
                placeholder="Todos"
                data={(Object.keys(STATUS_LABELS) as CourseUserStatus[]).map(
                  (s) => ({ value: s, label: STATUS_LABELS[s] })
                )}
                value={statuses}
                onChange={setStatuses}
                clearable
                w={320}
              />
              <NumberInput
                label="Mínimo de días sin actividad"
                value={minDays}
                onChange={setMinDays}
                min={0}
                allowDecimal={false}
                w={200}
              />
              <Switch
                label="Solo alcanzables por WhatsApp"
                checked={reachable}
                onChange={(e) => setReachable(e.currentTarget.checked)}
                mb={8}
              />
              <Button onClick={load} loading={loading}>
                Aplicar
              </Button>
              <Button
                variant="light"
                color="green"
                leftSection={<FaFileExcel />}
                onClick={exportRows}
                loading={exporting}
                disabled={!data?.rows.length}
              >
                Excel
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              "Nunca activo" no tiene días sin actividad: si filtras por un
              mínimo de días, no aparece. "Inactivo" son más de 15 días sin
              actividad en el curso.
            </Text>
          </Stack>
        </Card>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <Loader />
        ) : data && !data.snapshot_date ? (
          <Alert color="blue" variant="light">
            Pulsa "Recalcular ahora" para generar el estado de los estudiantes.
            Después se actualiza solo cada noche si el servidor tiene activo
            COURSE_SNAPSHOTS_CRON_ENABLED.
          </Alert>
        ) : data ? (
          <Card withBorder radius="md" p="lg">
            <Stack gap="sm">
              <Text size="sm" c="dimmed">
                {data.total > data.rows.length
                  ? `Mostrando ${data.rows.length} de ${data.total}; el Excel incluye hasta ${EXPORT_LIMIT}.`
                  : `${data.total} estudiante(s) con estos filtros.`}
              </Text>
              {data.rows.length ? (
                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder miw={1200}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Estudiante</Table.Th>
                        <Table.Th>Curso</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th ta="right">Avance</Table.Th>
                        <Table.Th>Última actividad</Table.Th>
                        <Table.Th ta="right">Días sin actividad</Table.Th>
                        <Table.Th ta="right">Tiempo</Table.Th>
                        <Table.Th>WhatsApp</Table.Th>
                        <Table.Th>Último mensaje</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.rows.map((r) => (
                        <StudentRow key={`${r.event_id}:${r.user_id}`} row={r} />
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              ) : (
                <Text size="sm" c="dimmed">
                  Ningún estudiante cumple estos filtros.
                </Text>
              )}
            </Stack>
          </Card>
        ) : null}
      </Stack>
    </Container>
  );
}

function StudentRow({ row: r }: { row: StudentStateRow }) {
  const m = r.last_message;
  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm">{r.name || r.user_id}</Text>
        {r.email && (
          <Text size="xs" c="dimmed">
            {r.email}
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm" lineClamp={2} maw={220}>
          {r.event_name}
        </Text>
      </Table.Td>
      <Table.Td>
        <Badge color={STATUS_COLORS[r.status]} variant="light">
          {STATUS_LABELS[r.status]}
        </Badge>
      </Table.Td>
      <Table.Td ta="right">{r.course_progress} %</Table.Td>
      <Table.Td>{formatDate(r.last_activity_at)}</Table.Td>
      <Table.Td ta="right">{r.days_inactive ?? "—"}</Table.Td>
      <Table.Td ta="right">{formatDuration(r.time_spent_ms)}</Table.Td>
      <Table.Td>
        {!r.has_phone ? (
          <Badge color="gray" variant="outline">
            Sin teléfono
          </Badge>
        ) : r.whatsapp_opt_in ? (
          <Badge color="teal" variant="light">
            Alcanzable
          </Badge>
        ) : (
          <Badge color="orange" variant="light">
            Sin consentimiento
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        {m ? (
          <Tooltip
            label={`${r.messages_30d} mensaje(s) en los últimos 30 días`}
          >
            <div>
              <Text size="sm">{kindLabel(m.kind)}</Text>
              <Text size="xs" c="dimmed">
                {formatDateTime(m.at)} · {reactionOf(m)}
              </Text>
            </div>
          </Tooltip>
        ) : (
          <Text size="sm" c="dimmed">
            Ninguno
          </Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="lg">
        {typeof value === "number" ? value.toLocaleString("es-CO") : value}
      </Text>
    </div>
  );
}
