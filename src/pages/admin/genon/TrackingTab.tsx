// src/pages/admin/genon/TrackingTab.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import * as XLSX from "xlsx";
import { FaFileExcel, FaRotateRight } from "react-icons/fa6";
import {
  GenOnCourse,
  GenOnEnrollments,
  GenOnFeedback,
  GenOnSegment,
  SEGMENT_LABELS,
  TRIGGER_LABELS,
  apiError,
  fetchGenOnCourses,
  fetchGenOnEnrollments,
  fetchGenOnFeedback,
  updateGenOnFeedback,
} from "../../../services/genonService";
import type { GenOnTabProps } from "./GenOnAdminPage";
import PersonHistoryDrawer from "./PersonHistoryDrawer";

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
    : "—";

const EXIT_LABELS: Record<string, string> = {
  opt_out: "Pidió no recibir mensajes",
  not_expected: "No era lo que esperaba",
};

const ABANDON_LABELS: Record<string, string> = {
  no_time: "No ha tenido tiempo",
  soon: "Lo retoma pronto",
  access: "Problemas para ingresar",
  not_expected: "No era lo que esperaba",
  opt_out: "No recibir más mensajes",
};

export default function TrackingTab({ program }: GenOnTabProps) {
  const [courses, setCourses] = useState<GenOnCourse[]>([]);
  const [segment, setSegment] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [data, setData] = useState<GenOnEnrollments | null>(null);
  const [feedback, setFeedback] = useState<GenOnFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [enrollments, fb] = await Promise.all([
        fetchGenOnEnrollments(program._id, {
          segment: segment || undefined,
          eventId: eventId || undefined,
        }),
        fetchGenOnFeedback(program._id),
      ]);
      setData(enrollments);
      setFeedback(fb);
    } catch (e) {
      setError(apiError(e, "No se pudo cargar el seguimiento"));
    } finally {
      setLoading(false);
    }
  }, [program._id, segment, eventId]);

  useEffect(() => {
    fetchGenOnCourses(program._id).then(setCourses).catch(() => setCourses([]));
  }, [program._id]);

  useEffect(() => {
    load();
  }, [load]);

  const courseName = (id: string) => courses.find((c) => c._id === id)?.name || "";

  const exportRows = () => {
    if (!data) return;
    const sheet = XLSX.utils.json_to_sheet(
      data.rows.map((r) => ({
        Nombre: r.name,
        Correo: r.email,
        Curso: r.event_name,
        Segmento: SEGMENT_LABELS[r.segment],
        "Grupo de control": r.holdout ? "Sí" : "No",
        "Avance (%)": r.progress,
        "Actividades completadas": r.completed_activities,
        "Última actividad": formatDateTime(r.last_activity_at),
        "Último toque": r.last_step_key || "",
        "Próximo toque": r.next_step_key || "",
        "Próximo envío": formatDateTime(r.next_step_at),
        Estado: r.exited
          ? EXIT_LABELS[r.exit_reason || ""] || "Salió"
          : r.paused
          ? "En pausa"
          : "En secuencia",
        "Motivo de abandono": ABANDON_LABELS[r.abandon_reason || ""] || r.abandon_reason || "",
        "Racha (días)": r.streak?.current ?? 0,
        "Mejor racha": r.streak?.best ?? 0,
        "En cola": r.queue.map((q) => TRIGGER_LABELS[q.key]).join(", "),
        "Retos superados": r.challenges.filter((c) => c.passed).length,
        "Retos fallados": r.challenges.filter((c) => !c.passed).length,
        Nota: r.last_error || "",
      }))
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Gen.ON");
    XLSX.writeFile(book, `genon_${program.name.replace(/[^\w-]+/g, "_")}.xlsx`);
  };

  const toggleFeedback = async (f: GenOnFeedback) => {
    const status = f.status === "open" ? "closed" : "open";
    await updateGenOnFeedback(program._id, f._id, status);
    setFeedback((list) => list.map((x) => (x._id === f._id ? { ...x, status } : x)));
  };

  return (
    <Stack gap="lg">
      <Alert color="blue" variant="light">
        El estado se recalcula una vez al día (y con "Ejecutar ahora" en
        Pruebas). Haz clic en un nombre para ver su historial: mensajes, avance,
        retos y lo que escribió. Los resultados agregados de cada toque (y la
        comparación con el grupo de control) están en Recordatorios →
        Resultados, tipo "Gen.ON".
      </Alert>

      <PersonHistoryDrawer
        programId={program._id}
        enrollmentId={historyId}
        onClose={() => setHistoryId(null)}
        onCleared={() => {
          setHistoryId(null);
          load();
        }}
      />

      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      {data && (
        <Group gap="xl">
          {data.by_segment
            .sort((a, b) => a.segment.localeCompare(b.segment))
            .map((s) => (
              <div key={s.segment}>
                <Text size="xs" c="dimmed">
                  {SEGMENT_LABELS[s.segment as GenOnSegment] || s.segment}
                </Text>
                <Text fw={700} size="lg">
                  {s.total.toLocaleString("es-CO")}
                </Text>
                <Text size="xs" c="dimmed">
                  control {s.holdout} · pausa {s.paused} · salieron {s.exited}
                </Text>
              </div>
            ))}
          {!data.by_segment.length && (
            <Text size="sm" c="dimmed">
              Aún no hay inscritos segmentados. Usa "Ejecutar ahora" en Pruebas
              o espera la próxima ejecución del cron.
            </Text>
          )}
        </Group>
      )}

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group align="flex-end" justify="space-between">
            <Group align="flex-end">
              <Select
                label="Segmento"
                placeholder="Todos"
                clearable
                data={Object.entries(SEGMENT_LABELS).map(([value, label]) => ({ value, label }))}
                value={segment}
                onChange={setSegment}
                w={260}
              />
              <Select
                label="Curso"
                placeholder="Todos"
                clearable
                searchable
                data={courses.map((c) => ({ value: c._id, label: c.name }))}
                value={eventId}
                onChange={setEventId}
                w={300}
              />
              <Button variant="light" leftSection={<FaRotateRight />} onClick={load} loading={loading}>
                Actualizar
              </Button>
            </Group>
            <Button
              variant="light"
              color="green"
              leftSection={<FaFileExcel />}
              onClick={exportRows}
              disabled={!data?.rows.length}
            >
              Excel
            </Button>
          </Group>

          {loading && !data ? (
            <Loader />
          ) : data?.rows.length ? (
            <ScrollArea>
              <Table striped highlightOnHover withTableBorder miw={1100}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Inscrito</Table.Th>
                    <Table.Th>Curso</Table.Th>
                    <Table.Th>Segmento</Table.Th>
                    <Table.Th ta="right">Avance</Table.Th>
                    <Table.Th>Último / próximo toque</Table.Th>
                    <Table.Th>Estado</Table.Th>
                    <Table.Th>Retos</Table.Th>
                    <Table.Th>Racha / cola</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.rows.map((r) => (
                    <Table.Tr key={r._id}>
                      <Table.Td>
                        <Anchor component="button" size="sm" onClick={() => setHistoryId(r._id)}>
                          {r.name}
                        </Anchor>
                        <Text size="xs" c="dimmed">
                          {r.email}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={2} maw={200}>
                          {r.event_name || courseName(r.event_id)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{SEGMENT_LABELS[r.segment]}</Text>
                        {r.holdout && (
                          <Badge color="grape" variant="light" size="xs">
                            Control
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td ta="right">{r.progress} %</Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {r.last_step_key || "—"} → {r.next_step_key || "—"}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatDateTime(r.next_step_at)}
                          {r.slot ? ` · franja ${r.slot}` : ""}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {r.exited ? (
                          <Badge color="red" variant="light">
                            {EXIT_LABELS[r.exit_reason || ""] || "Salió"}
                          </Badge>
                        ) : r.paused ? (
                          <Badge color="gray" variant="light">
                            En pausa
                          </Badge>
                        ) : (
                          <Badge color="blue" variant="light">
                            En secuencia
                          </Badge>
                        )}
                        {r.abandon_reason && (
                          <Text size="xs">
                            {ABANDON_LABELS[r.abandon_reason] || r.abandon_reason}
                          </Text>
                        )}
                        {r.last_error && (
                          <Tooltip label={r.last_error}>
                            <Text size="xs" c="orange" lineClamp={1} maw={180}>
                              {r.last_error}
                            </Text>
                          </Tooltip>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {r.challenges.length ? (
                          <Text size="xs">
                            {r.challenges.filter((c) => c.passed).length} superados ·{" "}
                            {r.challenges.filter((c) => !c.passed).length} fallados
                          </Text>
                        ) : (
                          "—"
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {r.streak?.current ? `🔥 ${r.streak.current}` : "—"}
                        </Text>
                        {r.queue.length > 0 && (
                          <Tooltip
                            multiline
                            maw={320}
                            label={r.queue
                              .map(
                                (q) =>
                                  `${TRIGGER_LABELS[q.key]} · ${formatDateTime(q.due_at)}`
                              )
                              .join(" | ")}
                          >
                            <Badge size="xs" variant="light" color="teal">
                              {r.queue.length} en cola
                            </Badge>
                          </Tooltip>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          ) : (
            <Text size="sm" c="dimmed">
              No hay inscritos con estos filtros.
            </Text>
          )}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Casos de soporte y comentarios</Title>
          {feedback.length ? (
            <ScrollArea>
              <Table striped miw={800}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Fecha</Table.Th>
                    <Table.Th>Tipo</Table.Th>
                    <Table.Th>Curso</Table.Th>
                    <Table.Th>Teléfono</Table.Th>
                    <Table.Th>Texto</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {feedback.map((f) => (
                    <Table.Tr key={f._id}>
                      <Table.Td>{formatDateTime(f.created_at)}</Table.Td>
                      <Table.Td>
                        <Badge color={f.type === "support" ? "orange" : "blue"} variant="light">
                          {f.type === "support" ? "Soporte" : "Comentario"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{courseName(f.event_id)}</Text>
                      </Table.Td>
                      <Table.Td>{f.phone}</Table.Td>
                      <Table.Td maw={360}>
                        <Text size="sm">{f.text}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Button
                          size="compact-xs"
                          variant={f.status === "open" ? "light" : "subtle"}
                          color={f.status === "open" ? "green" : "gray"}
                          onClick={() => toggleFeedback(f)}
                        >
                          {f.status === "open" ? "Marcar atendido" : "Reabrir"}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          ) : (
            <Text size="sm" c="dimmed">
              Aún no hay casos ni comentarios.
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
}
