// src/pages/admin/genon/SlotResultsCard.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import * as XLSX from "xlsx";
import {
  FaCalendarDays,
  FaChevronLeft,
  FaChevronRight,
  FaFileExcel,
  FaRotateRight,
} from "react-icons/fa6";
import {
  GenOnProgram,
  GenOnSegment,
  GenOnSlotGroupStats,
  GenOnSlotPerson,
  GenOnSlotResults,
  SEGMENT_LABELS,
  apiError,
  fetchGenOnSlotResults,
} from "../../../services/genonService";

type PeopleFilter = "advanced" | "became_active" | "entered";

const FILTER_LABELS: Record<PeopleFilter, string> = {
  advanced: "Avanzaron",
  became_active: "Pasaron a activo",
  entered: "Entraron al curso",
};

/** Fecha YYYY-MM-DD de hoy en la zona del programa. */
const todayIn = (timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: timeZone || "America/Bogota" }).format(new Date());

const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fromYmd = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const shiftDay = (ymd: string, days: number) => {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + days);
  return toYmd(d);
};

const pct = (n: number, total: number) =>
  total ? `${((n / total) * 100).toLocaleString("es-CO", { maximumFractionDigits: 1 })} %` : "—";

const segmentLabel = (s: string | null) =>
  s ? SEGMENT_LABELS[s as GenOnSegment]?.replace(/^\d\.\s*/, "") || s : "—";

interface Props {
  program: GenOnProgram;
  /** Filtro de curso de la pestaña */
  eventId: string | null;
  onOpenHistory: (enrollmentId: string) => void;
}

/**
 * Resultados por franja de envío de un día: de quienes recibieron el mensaje
 * en cada franja, cuántos entraron al curso, avanzaron o pasaron a activo
 * (frente al grupo de control de la misma franja), y quiénes fueron.
 */
export default function SlotResultsCard({ program, eventId, onOpenHistory }: Props) {
  const today = todayIn(program.timezone);
  const [date, setDate] = useState(today);
  const [data, setData] = useState<GenOnSlotResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PeopleFilter>("advanced");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchGenOnSlotResults(program._id, { date, eventId: eventId || undefined }));
    } catch (e) {
      setError(apiError(e, "No se pudieron cargar los resultados por franja"));
    } finally {
      setLoading(false);
    }
  }, [program._id, date, eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const slotLabel = (slot: string) =>
    data && slot === data.outside_slot ? "Fuera de franja" : slot;

  const people = useMemo(
    () => (data?.people || []).filter((p) => p[filter]),
    [data, filter]
  );

  const exportPeople = () => {
    if (!data) return;
    const sheet = XLSX.utils.json_to_sheet(
      data.people.map((p) => ({
        Nombre: p.name,
        Correo: p.email,
        Franja: slotLabel(p.slot),
        Grupo: p.group === "control" ? "Control (sin mensaje)" : "Recibió el mensaje",
        Toque: p.steps.join(", "),
        "Enviado": new Date(p.sent_at).toLocaleString("es-CO"),
        "Segmento al enviar": segmentLabel(p.segment_at_send),
        "Segmento hoy": segmentLabel(p.segment_now),
        "Entró al curso": p.entered ? "Sí" : "No",
        Avanzó: p.advanced ? "Sí" : "No",
        "Pasó a activo": p.became_active ? "Sí" : "No",
        "Primer avance": p.first_progress_at
          ? new Date(p.first_progress_at).toLocaleString("es-CO")
          : "",
        "Registros de avance": p.progress_events,
        "Actividades terminadas": p.activities_completed,
        Leyó: p.read ? "Sí" : "No",
        "Hizo clic": p.clicked ? "Sí" : "No",
      }))
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Franjas");
    XLSX.writeFile(book, `genon_franjas_${data.date}.xlsx`);
  };

  const statCell = (n: number, s: GenOnSlotGroupStats, strong = false) => (
    <Table.Td ta="right">
      <Text size="sm" fw={strong ? 700 : 400} span>
        {n.toLocaleString("es-CO")}
      </Text>{" "}
      <Text size="xs" c="dimmed" span>
        {pct(n, s.people)}
      </Text>
    </Table.Td>
  );

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={4}>Resultados por franja de envío</Title>
            <Text size="xs" c="dimmed">
              Qué hicieron, desde el mensaje hasta ahora, quienes lo recibieron en cada
              franja frente al grupo de control de esa misma franja.
            </Text>
          </div>
          <Group gap="xs" align="flex-end">
            <ActionIcon
              variant="light"
              size="lg"
              aria-label="Día anterior"
              onClick={() => setDate((d) => shiftDay(d, -1))}
            >
              <FaChevronLeft size={12} />
            </ActionIcon>
            <DatePickerInput
              aria-label="Día de envío"
              value={fromYmd(date)}
              onChange={(d) => d && setDate(toYmd(d))}
              maxDate={fromYmd(today)}
              valueFormat="DD MMM YYYY"
              leftSection={<FaCalendarDays size={12} />}
              w={170}
            />
            <ActionIcon
              variant="light"
              size="lg"
              aria-label="Día siguiente"
              disabled={date >= today}
              onClick={() => setDate((d) => shiftDay(d, 1))}
            >
              <FaChevronRight size={12} />
            </ActionIcon>
            <Button variant="light" leftSection={<FaRotateRight />} onClick={load} loading={loading}>
              Actualizar
            </Button>
          </Group>
        </Group>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <Loader />
        ) : data && data.summary.length ? (
          <>
            <ScrollArea>
              <Table withTableBorder striped miw={900}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Franja</Table.Th>
                    <Table.Th ta="right">Recibieron</Table.Th>
                    <Table.Th ta="right">Entraron</Table.Th>
                    <Table.Th ta="right">Avanzaron</Table.Th>
                    <Table.Th ta="right">Pasaron a activo</Table.Th>
                    <Table.Th ta="right">
                      <Tooltip label="Grupo de control de la franja: no recibió el mensaje">
                        <span>Control: avanzaron / activos</span>
                      </Tooltip>
                    </Table.Th>
                    <Table.Th ta="right">Fallidos</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.summary.map((s) => (
                    <Table.Tr key={s.slot}>
                      <Table.Td>
                        <Text fw={600} size="sm">
                          {slotLabel(s.slot)}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">{s.received.people.toLocaleString("es-CO")}</Table.Td>
                      {statCell(s.received.entered, s.received)}
                      {statCell(s.received.advanced, s.received, true)}
                      {statCell(s.received.became_active, s.received, true)}
                      <Table.Td ta="right">
                        <Text size="sm" span>
                          {s.control.advanced} / {s.control.became_active}
                        </Text>{" "}
                        <Text size="xs" c="dimmed" span>
                          de {s.control.people} ({pct(s.control.advanced, s.control.people)} /{" "}
                          {pct(s.control.became_active, s.control.people)})
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">{s.failed || "—"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            <Text size="xs" c="dimmed">
              Un envío cuenta en la franja que empezó antes de él (hasta{" "}
              {data.slot_window_minutes / 60} h después, porque los envíos se reparten
              en varias corridas). "Entraron" sale de la última segmentación; "Avanzaron"
              es avance registrado en el curso; "Pasaron a activo" venía de otro segmento
              y hoy está en activos. Medido el{" "}
              {new Date(data.measured_at).toLocaleString("es-CO", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
              .
            </Text>

            <Group justify="space-between" align="center">
              <SegmentedControl
                size="xs"
                value={filter}
                onChange={(v) => setFilter(v as PeopleFilter)}
                data={(Object.keys(FILTER_LABELS) as PeopleFilter[]).map((value) => ({
                  value,
                  label: `${FILTER_LABELS[value]} (${data.people.filter((p) => p[value]).length})`,
                }))}
              />
              <Button
                size="xs"
                variant="light"
                color="green"
                leftSection={<FaFileExcel />}
                onClick={exportPeople}
                disabled={!data.people.length}
              >
                Excel
              </Button>
            </Group>

            {people.length ? (
              <ScrollArea>
                <Table striped highlightOnHover withTableBorder miw={1000}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Persona</Table.Th>
                      <Table.Th>Franja</Table.Th>
                      <Table.Th>Toque</Table.Th>
                      <Table.Th>Enviado</Table.Th>
                      <Table.Th>Primer avance</Table.Th>
                      <Table.Th ta="right">Avance</Table.Th>
                      <Table.Th>Segmento</Table.Th>
                      <Table.Th>Mensaje</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {people.map((p) => (
                      <PersonRow
                        key={`${p.slot}:${p.group}:${p.user_id}`}
                        p={p}
                        slotLabel={slotLabel(p.slot)}
                        onOpenHistory={onOpenHistory}
                      />
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            ) : (
              <Text size="sm" c="dimmed">
                Nadie en "{FILTER_LABELS[filter]}" este día.
              </Text>
            )}
            {data.people_total > data.people.length && (
              <Text size="xs" c="dimmed">
                Se muestran {data.people.length} de {data.people_total} personas.
              </Text>
            )}
          </>
        ) : (
          <Text size="sm" c="dimmed">
            No hubo envíos de Gen.ON este día.
          </Text>
        )}
      </Stack>
    </Card>
  );
}

const time = (value: string) =>
  new Date(value).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

function PersonRow({
  p,
  slotLabel,
  onOpenHistory,
}: {
  p: GenOnSlotPerson;
  slotLabel: string;
  onOpenHistory: (enrollmentId: string) => void;
}) {
  return (
    <Table.Tr>
      <Table.Td>
        {p.enrollment_id ? (
          <Anchor component="button" size="sm" onClick={() => onOpenHistory(p.enrollment_id!)}>
            {p.name || p.email || p.user_id}
          </Anchor>
        ) : (
          <Text size="sm">{p.name || p.user_id}</Text>
        )}
        <Text size="xs" c="dimmed">
          {p.email}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{slotLabel}</Text>
        {p.group === "control" && (
          <Badge color="grape" variant="light" size="xs">
            Control
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">{p.steps.join(", ") || "—"}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{time(p.sent_at)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{p.first_progress_at ? time(p.first_progress_at) : "—"}</Text>
      </Table.Td>
      <Table.Td ta="right">
        {p.advanced ? (
          <Tooltip label="Registros de avance después del mensaje · actividades que terminó">
            <Text size="sm">
              {p.progress_events} reg. · {p.activities_completed} act. terminadas
            </Text>
          </Tooltip>
        ) : (
          <Text size="xs" c="dimmed">
            Entró sin avanzar
          </Text>
        )}
      </Table.Td>
      <Table.Td>
        <Text size="sm">
          {segmentLabel(p.segment_at_send)} → {segmentLabel(p.segment_now)}
        </Text>
        {p.became_active && (
          <Badge color="green" variant="light" size="xs">
            Pasó a activo
          </Badge>
        )}
      </Table.Td>
      <Table.Td>
        <Group gap={4}>
          {p.read && (
            <Badge size="xs" variant="light" color="blue">
              Leído
            </Badge>
          )}
          {p.clicked && (
            <Badge size="xs" variant="light" color="teal">
              Clic
            </Badge>
          )}
          {!p.read && !p.clicked && (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
