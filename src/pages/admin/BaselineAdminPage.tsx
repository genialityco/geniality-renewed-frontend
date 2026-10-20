// src/pages/admin/BaselineAdminPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Drawer,
  Group,
  Loader,
  Modal,
  MultiSelect,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import * as XLSX from "xlsx";
import {
  FaCamera,
  FaFileExcel,
  FaRotateRight,
  FaTrash,
} from "react-icons/fa6";
import { useOrganization } from "../../context/OrganizationContext";
import { fetchEventsByOrganizer } from "../../services/eventService";
import type { Event } from "../../services/types";
import {
  BaselineSummary,
  BaselineUserRow,
  CourseSnapshot,
  CourseUserStatus,
  createBaseline,
  deleteBaseline,
  fetchBaseline,
  fetchBaselineUsers,
  fetchBaselines,
  fetchDailySnapshots,
  runDailySnapshots,
} from "../../services/courseSnapshotsService";

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

// El detalle completo va en el Excel; en pantalla se limita para no
// renderizar miles de filas.
const MAX_ROWS_ON_SCREEN = 200;

const todayLocal = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(
    new Date()
  );

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("es-CO") : "—";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const formatDuration = (ms: number) => {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
};

const pct = (n: number) => `${n.toLocaleString("es-CO")} %`;

export default function BaselineAdminPage() {
  const { organization } = useOrganization();
  const organizationId = organization?._id;

  const [events, setEvents] = useState<Event[]>([]);
  const [baselines, setBaselines] = useState<BaselineSummary[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<CourseSnapshot[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Congelar
  const [label, setLabel] = useState(`Línea base ${todayLocal()}`);
  const [eventIds, setEventIds] = useState<string[]>([]);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [runningDaily, setRunningDaily] = useState(false);

  // Borrar
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Detalle por curso
  const [detail, setDetail] = useState<CourseSnapshot | null>(null);
  const [users, setUsers] = useState<BaselineUserRow[]>([]);
  const [daily, setDaily] = useState<CourseSnapshot[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const loadBaselines = useCallback(async () => {
    if (!organizationId) return;
    setLoadingList(true);
    setError(null);
    try {
      const list = await fetchBaselines(organizationId);
      setBaselines(list);
      setSelectedBatch((current) =>
        current && list.some((b) => b.batch_id === current)
          ? current
          : list[0]?.batch_id ?? null
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message || "No se pudieron cargar las líneas base"
      );
    } finally {
      setLoadingList(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    loadBaselines();
    fetchEventsByOrganizer(organizationId)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [organizationId, loadBaselines]);

  useEffect(() => {
    if (!organizationId || !selectedBatch) {
      setSnapshots([]);
      return;
    }
    setLoadingSnapshots(true);
    fetchBaseline(organizationId, selectedBatch)
      .then(setSnapshots)
      .catch((e) =>
        setError(e?.response?.data?.message || "No se pudo cargar la línea base")
      )
      .finally(() => setLoadingSnapshots(false));
  }, [organizationId, selectedBatch]);

  const handleCreate = async () => {
    if (!organizationId) return;
    setCreating(true);
    try {
      const res = await createBaseline(organizationId, {
        label: label.trim() || undefined,
        eventIds: eventIds.length ? eventIds : undefined,
      });
      notifications.show({
        color: "green",
        title: "Línea base congelada",
        message: `${res.courses} cursos · ${res.enrolled} inscritos · ${res.completed} graduados`,
      });
      setConfirmCreate(false);
      setSelectedBatch(res.batch_id);
      await loadBaselines();
    } catch (e: any) {
      notifications.show({
        color: "red",
        title: "No se pudo congelar la línea base",
        message: e?.response?.data?.message || e?.message || "Error",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!organizationId || !selectedBatch) return;
    setDeleting(true);
    try {
      await deleteBaseline(organizationId, selectedBatch);
      setConfirmDelete(false);
      setSelectedBatch(null);
      await loadBaselines();
    } catch (e: any) {
      notifications.show({
        color: "red",
        title: "No se pudo eliminar",
        message: e?.response?.data?.message || "Error",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleRunDaily = async () => {
    if (!organizationId) return;
    setRunningDaily(true);
    try {
      const res = await runDailySnapshots(organizationId);
      notifications.show({
        color: "green",
        title: "Snapshot diario generado",
        message: `${res.courses} cursos`,
      });
    } catch (e: any) {
      notifications.show({
        color: "red",
        title: "No se pudo generar el snapshot diario",
        message: e?.response?.data?.message || "Error",
      });
    } finally {
      setRunningDaily(false);
    }
  };

  const openDetail = async (snapshot: CourseSnapshot) => {
    if (!organizationId || !snapshot.batch_id) return;
    setDetail(snapshot);
    setUsers([]);
    setDaily([]);
    setStatusFilter(null);
    setLoadingDetail(true);
    try {
      const [rows, dailyRows] = await Promise.all([
        fetchBaselineUsers(organizationId, snapshot.batch_id, snapshot.event_id),
        fetchDailySnapshots(organizationId, snapshot.event_id, {
          from: snapshot.snapshot_date,
        }),
      ]);
      setUsers(rows);
      setDaily(dailyRows);
    } catch (e: any) {
      notifications.show({
        color: "red",
        title: "No se pudo cargar el detalle",
        message: e?.response?.data?.message || "Error",
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const exportUsers = () => {
    if (!detail) return;
    const data = users.map((u) => ({
      Nombre: u.name,
      Correo: u.email,
      Estado: STATUS_LABELS[u.status],
      "Avance del curso (%)": u.course_progress,
      "Avance en actividades (%)": u.activity_progress,
      Inscripción: formatDate(u.enrolled_at),
      "Última actividad": formatDate(u.last_activity_at),
      "Días sin actividad": u.days_inactive ?? "",
      "Tiempo en el curso": formatDuration(u.time_spent_ms),
      "Fecha de finalización": formatDate(u.completed_at),
      "Origen de la fecha":
        u.completed_at_source === "tracked"
          ? "Medida"
          : u.completed_at_source === "estimated"
          ? "Estimada"
          : "",
      "Tiene teléfono": u.has_phone ? "Sí" : "No",
      "Acepta WhatsApp": u.whatsapp_opt_in ? "Sí" : "No",
      "ID usuario": u.user_id,
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Estudiantes");
    const safeName = detail.event_name.replace(/[^\w\- ]+/g, "").slice(0, 40);
    XLSX.writeFile(
      book,
      `linea_base_${detail.snapshot_date}_${safeName || detail.event_id}.xlsx`
    );
  };

  const totals = useMemo(() => {
    const t = {
      enrolled: 0,
      completed: 0,
      active: 0,
      inactive: 0,
      never: 0,
      reachable: 0,
      consent: 0,
      // null si alguna línea base es anterior a este dato
      withPhone: 0 as number | null,
    };
    for (const s of snapshots) {
      t.enrolled += s.metrics.enrolled;
      t.completed += s.metrics.completed;
      t.active += s.metrics.active_15d;
      t.inactive += s.metrics.inactive_15d;
      t.never += s.metrics.never_active;
      t.reachable += s.metrics.reachable_not_completed;
      t.consent += s.metrics.with_whatsapp_opt_in;
      const phone = s.metrics.not_completed_with_phone;
      t.withPhone =
        t.withPhone === null || phone === undefined ? null : t.withPhone + phone;
    }
    return t;
  }, [snapshots]);

  const filteredUsers = useMemo(
    () => (statusFilter ? users.filter((u) => u.status === statusFilter) : users),
    [users, statusFilter]
  );

  const selectedSummary = baselines.find((b) => b.batch_id === selectedBatch);

  if (!organizationId) return <Loader />;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={2}>Línea base de cursos</Title>
          <Text c="dimmed" size="sm">
            Guarda una foto de los indicadores de cada curso en una fecha. Es
            el punto de comparación para medir el efecto de las notificaciones:
            el avance solo se guarda como valor actual, así que lo que no se
            congele hoy no se puede reconstruir después con exactitud.
          </Text>
        </div>

        {error && (
          <Alert color="red" title="Error" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card withBorder radius="md" p="lg">
          <Stack gap="sm">
            <Title order={4}>Congelar línea base</Title>
            <Group grow align="flex-end">
              <TextInput
                label="Nombre"
                value={label}
                onChange={(e) => setLabel(e.currentTarget.value)}
                maxLength={120}
              />
              <MultiSelect
                label="Cursos"
                placeholder={eventIds.length ? undefined : "Todos los cursos con inscritos"}
                data={events.map((e) => ({ value: e._id, label: e.name }))}
                value={eventIds}
                onChange={setEventIds}
                searchable
                clearable
              />
            </Group>
            <Group>
              <Button leftSection={<FaCamera />} onClick={() => setConfirmCreate(true)}>
                Congelar ahora
              </Button>
              <Button
                variant="light"
                leftSection={<FaRotateRight />}
                loading={runningDaily}
                onClick={handleRunDaily}
              >
                Generar snapshot diario ahora
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              El snapshot diario también se genera solo cada noche (23:50, hora
              de Colombia) cuando el servidor tiene activado
              COURSE_SNAPSHOTS_CRON_ENABLED.
            </Text>
          </Stack>
        </Card>

        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-end">
              <Select
                label="Línea base"
                placeholder={loadingList ? "Cargando..." : "Aún no hay líneas base"}
                data={baselines.map((b) => ({
                  value: b.batch_id,
                  label: `${b.label || b.snapshot_date} · ${formatDateTime(b.taken_at)}`,
                }))}
                value={selectedBatch}
                onChange={setSelectedBatch}
                disabled={!baselines.length}
                style={{ flexGrow: 1, maxWidth: 520 }}
              />
              {selectedBatch && (
                <Button
                  color="red"
                  variant="subtle"
                  leftSection={<FaTrash />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Eliminar
                </Button>
              )}
            </Group>

            {selectedSummary && (
              <Group gap="xl">
                <Stat label="Cursos" value={selectedSummary.courses} />
                <Stat label="Inscritos" value={totals.enrolled} />
                <Stat label="Graduados" value={totals.completed} />
                <Stat label="Activos (≤ 15 días)" value={totals.active} />
                <Stat label="Inactivos (> 15 días)" value={totals.inactive} />
                <Stat label="Nunca activos" value={totals.never} />
                <Stat
                  label="No graduados con teléfono"
                  value={totals.withPhone ?? "—"}
                />
                <Stat label="Con consentimiento WhatsApp" value={totals.consent} />
                <Stat label="Alcanzables por WhatsApp" value={totals.reachable} />
              </Group>
            )}

            {selectedSummary && totals.enrolled > 0 && totals.consent === 0 && (
              <Alert color="yellow" variant="light">
                Nadie tiene consentimiento de WhatsApp registrado en esta línea
                base, por eso no hay alcanzables. Puedes definir qué casilla del
                registro cuenta como consentimiento en Mi Organización → Ajustes
                → Consentimiento de WhatsApp, y luego congelar una nueva línea
                base.
              </Alert>
            )}

            {loadingSnapshots ? (
              <Loader />
            ) : snapshots.length ? (
              <ScrollArea>
                <Table striped highlightOnHover withTableBorder miw={1100}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Curso</Table.Th>
                      <Table.Th>Inscritos</Table.Th>
                      <Table.Th>Graduados</Table.Th>
                      <Table.Th>Tasa de finalización</Table.Th>
                      <Table.Th>Activos ≤ 15 d</Table.Th>
                      <Table.Th>Inactivos &gt; 15 d</Table.Th>
                      <Table.Th>Nunca activos</Table.Th>
                      <Table.Th>Avance promedio</Table.Th>
                      <Table.Th>Días para terminar (mediana)</Table.Th>
                      <Table.Th>Alcanzables WhatsApp</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {snapshots.map((s) => (
                      <Table.Tr key={s._id}>
                        <Table.Td>{s.event_name}</Table.Td>
                        <Table.Td>{s.metrics.enrolled}</Table.Td>
                        <Table.Td>{s.metrics.completed}</Table.Td>
                        <Table.Td>{pct(s.metrics.completion_rate)}</Table.Td>
                        <Table.Td>{s.metrics.active_15d}</Table.Td>
                        <Table.Td>{s.metrics.inactive_15d}</Table.Td>
                        <Table.Td>{s.metrics.never_active}</Table.Td>
                        <Table.Td>{pct(s.metrics.avg_activity_progress)}</Table.Td>
                        <Table.Td>
                          {s.metrics.days_to_complete_median ?? "—"}
                          {s.metrics.days_to_complete_sample > 0 &&
                            s.metrics.completed_estimated > 0 && (
                              <Text span size="xs" c="dimmed">
                                {" "}
                                (estimado)
                              </Text>
                            )}
                        </Table.Td>
                        <Table.Td>{s.metrics.reachable_not_completed}</Table.Td>
                        <Table.Td>
                          <Button size="xs" variant="light" onClick={() => openDetail(s)}>
                            Detalle
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            ) : (
              !loadingList && (
                <Text c="dimmed" size="sm">
                  Todavía no hay líneas base. Usa “Congelar ahora” para crear la
                  primera.
                </Text>
              )
            )}

            <Text size="xs" c="dimmed">
              Activo / inactivo / nunca activo se cuenta solo entre quienes no
              han terminado, según su última actividad en el curso (no cuenta
              iniciar sesión). Avance promedio: avance real en las actividades,
              incluidas las vistas parcialmente. Alcanzables: no graduados con
              teléfono y consentimiento de WhatsApp (opt-in del perfil o la casilla
              de registro definida por la organización, sin baja). Las fechas de finalización
              anteriores a esta versión son estimadas (certificado o última
              actividad completada) y pueden ser algo posteriores a la real.
            </Text>
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={confirmCreate}
        onClose={() => setConfirmCreate(false)}
        title="Congelar línea base"
        centered
      >
        <Stack>
          <Text size="sm">
            Se guardará el estado actual de{" "}
            {eventIds.length ? `${eventIds.length} curso(s)` : "todos los cursos con inscritos"}
            , incluido el detalle de cada estudiante. Puede tardar algunos
            segundos.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmCreate(false)}>
              Cancelar
            </Button>
            <Button loading={creating} onClick={handleCreate}>
              Congelar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Eliminar línea base"
        centered
      >
        <Stack>
          <Text size="sm">
            Se eliminará “{selectedSummary?.label}” con el detalle de sus
            estudiantes. Esta acción no se puede deshacer y esos datos no se
            pueden volver a generar con la misma fecha.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button color="red" loading={deleting} onClick={handleDelete}>
              Eliminar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Drawer
        opened={!!detail}
        onClose={() => setDetail(null)}
        position="right"
        size="xl"
        title={detail ? `${detail.event_name} · ${detail.snapshot_date}` : ""}
      >
        {detail && (
          <Stack gap="md">
            <Group gap="xl">
              <Stat label="Graduados" value={detail.metrics.completed} />
              <Stat
                label="Fecha de finalización"
                value={`${detail.metrics.completed_tracked} medidas · ${detail.metrics.completed_estimated} estimadas`}
              />
              <Stat
                label="Finalizaciones últimos 30 días"
                value={detail.metrics.completions_last_30d}
              />
              <Stat
                label="Tiempo total en el curso"
                value={formatDuration(detail.metrics.total_time_ms)}
              />
            </Group>

            {detail.metrics.completions_by_month.length > 0 && (
              <div>
                <Text fw={600} size="sm" mb={4}>
                  Finalizaciones por mes
                </Text>
                <Group gap="xs">
                  {detail.metrics.completions_by_month.map((m) => (
                    <Badge key={m.month} variant="light">
                      {m.month}: {m.count}
                    </Badge>
                  ))}
                </Group>
              </div>
            )}

            {daily.length > 0 && (
              <div>
                <Text fw={600} size="sm" mb={4}>
                  Evolución diaria desde la línea base
                </Text>
                <ScrollArea h={daily.length > 8 ? 260 : undefined}>
                  <Table withTableBorder striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fecha</Table.Th>
                        <Table.Th>Inscritos</Table.Th>
                        <Table.Th>Graduados</Table.Th>
                        <Table.Th>Tasa</Table.Th>
                        <Table.Th>Activos ≤ 15 d</Table.Th>
                        <Table.Th>Inactivos &gt; 15 d</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {daily.map((d) => (
                        <Table.Tr key={d._id}>
                          <Table.Td>{d.snapshot_date}</Table.Td>
                          <Table.Td>{d.metrics.enrolled}</Table.Td>
                          <Table.Td>{d.metrics.completed}</Table.Td>
                          <Table.Td>{pct(d.metrics.completion_rate)}</Table.Td>
                          <Table.Td>{d.metrics.active_15d}</Table.Td>
                          <Table.Td>{d.metrics.inactive_15d}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </div>
            )}

            <Group justify="space-between" align="flex-end">
              <Select
                label="Estado"
                placeholder="Todos"
                clearable
                data={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                value={statusFilter}
                onChange={setStatusFilter}
                w={200}
              />
              <Button
                leftSection={<FaFileExcel />}
                variant="light"
                color="green"
                disabled={!users.length}
                onClick={exportUsers}
              >
                Descargar Excel ({users.length})
              </Button>
            </Group>

            {loadingDetail ? (
              <Loader />
            ) : (
              <>
                <ScrollArea>
                  <Table striped withTableBorder miw={760}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Estudiante</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th>Avance</Table.Th>
                        <Table.Th>Última actividad</Table.Th>
                        <Table.Th>Finalizó</Table.Th>
                        <Table.Th>WhatsApp</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredUsers.slice(0, MAX_ROWS_ON_SCREEN).map((u) => (
                        <Table.Tr key={u.user_id}>
                          <Table.Td>
                            <Text size="sm">{u.name}</Text>
                            <Text size="xs" c="dimmed">
                              {u.email}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color={STATUS_COLORS[u.status]} variant="light">
                              {STATUS_LABELS[u.status]}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{pct(u.activity_progress)}</Table.Td>
                          <Table.Td>
                            {formatDate(u.last_activity_at)}
                            {u.days_inactive !== null && (
                              <Text size="xs" c="dimmed">
                                hace {u.days_inactive} días
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {formatDate(u.completed_at)}
                            {u.completed_at_source === "estimated" && (
                              <Text size="xs" c="dimmed">
                                estimada
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {u.has_phone && u.whatsapp_opt_in
                              ? "Sí"
                              : u.has_phone
                              ? "Sin consentimiento"
                              : "Sin teléfono"}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
                {filteredUsers.length > MAX_ROWS_ON_SCREEN && (
                  <Text size="xs" c="dimmed">
                    Se muestran {MAX_ROWS_ON_SCREEN} de {filteredUsers.length}.
                    El Excel tiene el detalle completo.
                  </Text>
                )}
              </>
            )}
          </Stack>
        )}
      </Drawer>
    </Container>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
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
