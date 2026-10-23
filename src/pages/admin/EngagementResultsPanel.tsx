// src/pages/admin/EngagementResultsPanel.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
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
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import * as XLSX from "xlsx";
import { FaFileExcel, FaRotateRight } from "react-icons/fa6";
import {
  EngagementKind,
  EngagementKindSummary,
  EngagementLift,
  EngagementMessageRow,
  EngagementStatus,
  EngagementSummary,
  MetaStatus,
  ENGAGEMENT_KIND_LABELS as KIND_LABELS,
  fetchEngagementMessages,
  fetchEngagementSummary,
} from "../../services/engagementService";

const SEGMENT_SHORT: Record<string, string> = {
  abandon: "Abandono",
  inactive: "Inactivos",
  active: "Activos",
};

/** "Gen.ON 1.1 · Abandono" para los toques de Gen.ON; si no, el tipo. */
const kindLabel = (kind: string, step?: string | null, segment?: string | null) =>
  step
    ? `Gen.ON ${step}${segment && SEGMENT_SHORT[segment] ? ` · ${SEGMENT_SHORT[segment]}` : ""}`
    : KIND_LABELS[kind as EngagementKind] || kind;

const STATUS_LABELS: Record<EngagementStatus, string> = {
  planned: "Simulado (no enviado)",
  pending: "Enviándose",
  sent: "Enviado",
  fallback_email: "Enviado por email",
  failed: "Falló",
  holdout: "Grupo de control",
  capped: "Tope semanal",
};

const STATUS_COLORS: Record<EngagementStatus, string> = {
  planned: "cyan",
  pending: "gray",
  sent: "green",
  fallback_email: "yellow",
  failed: "red",
  holdout: "grape",
  capped: "orange",
};

const META_LABELS: Record<MetaStatus, string> = {
  sent: "Sin confirmar",
  delivered: "Entregado",
  read: "Leído",
  failed: "No entregado",
};

const META_COLORS: Record<MetaStatus, string> = {
  sent: "gray",
  delivered: "blue",
  read: "teal",
  failed: "red",
};

const PRACTICE_LABELS: Record<string, string> = {
  invited: "Sin responder",
  choosing: "Eligiendo tema",
  in_progress: "En curso",
  completed: "Terminado",
  declined: "Rechazó",
  cancelled: "Cancelado",
  expired: "Venció",
};

const WINDOWS = [
  { value: "24", label: "24 horas" },
  { value: "72", label: "72 horas" },
  { value: "168", label: "7 días" },
  { value: "336", label: "14 días" },
];

// El detalle completo va en el Excel; en pantalla se limita para no
// renderizar miles de filas.
const MAX_ROWS_ON_SCREEN = 200;

const localDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(d);

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const pct = (n: number | null) =>
  n === null ? "—" : `${n.toLocaleString("es-CO")} %`;

const countPct = (count: number, rate: number | null) =>
  rate === null ? "—" : `${count} · ${pct(rate)}`;

const signedPts = (n: number | null) =>
  n === null ? "—" : `${n > 0 ? "+" : ""}${n.toLocaleString("es-CO")} pts`;

const windowLabel = (hours: number) =>
  WINDOWS.find((w) => Number(w.value) === hours)?.label || `${hours} h`;

const isPracticeKind = (kind: EngagementKindSummary["kind"]) =>
  kind === "practice_review" || kind === "practice_invite";

/**
 * Resultados de los mensajes de WhatsApp que envía la plataforma: entrega y
 * lectura (Meta), clics, respuestas, y si los estudiantes volvieron y
 * avanzaron después, comparado con el grupo de control.
 */
export default function EngagementResultsPanel({
  organizationId,
}: {
  organizationId: string;
}) {
  const [from, setFrom] = useState(
    localDate(new Date(Date.now() - 30 * 86400000))
  );
  const [to, setTo] = useState(localDate(new Date()));
  const [kind, setKind] = useState<EngagementKind | null>(null);
  const [windowHours, setWindowHours] = useState("72");
  const [status, setStatus] = useState<EngagementStatus | null>(null);

  const [summary, setSummary] = useState<EngagementSummary | null>(null);
  const [rows, setRows] = useState<EngagementMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filter = useCallback(
    () => ({
      from: from || undefined,
      to: to || undefined,
      kind: kind || undefined,
      windowHours: Number(windowHours),
    }),
    [from, to, kind, windowHours]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, list] = await Promise.all([
        fetchEngagementSummary(organizationId, filter()),
        fetchEngagementMessages(organizationId, {
          ...filter(),
          status: status || undefined,
          limit: MAX_ROWS_ON_SCREEN,
        }),
      ]);
      setSummary(s);
      setRows(list);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "No se pudieron cargar los resultados"
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, filter, status]);

  useEffect(() => {
    load();
    // Solo al abrir; los filtros se aplican con "Actualizar"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const exportMessages = async () => {
    setExporting(true);
    try {
      const list = await fetchEngagementMessages(organizationId, {
        ...filter(),
        status: status || undefined,
        limit: 1000,
      });
      const data = list.map((m) => ({
        Fecha: formatDateTime(m.at),
        Estudiante: m.name,
        Correo: m.email,
        Tipo: kindLabel(m.kind, m.step, m.segment),
        Estado: STATUS_LABELS[m.status] || m.status,
        "Avance al enviar (%)": m.progress ?? "",
        "Actividades al enviar": m.completed_activities ?? "",
        "Estado en WhatsApp": m.meta_status ? META_LABELS[m.meta_status] : "",
        Entregado: m.delivered_at ? formatDateTime(m.delivered_at) : "",
        Leído: m.read_at ? formatDateTime(m.read_at) : "",
        "Clic en el botón": m.clicked_at
          ? formatDateTime(m.clicked_at)
          : m.click_tracked
          ? "No"
          : "No medido",
        Respondió: m.replied_at ? formatDateTime(m.replied_at) : "",
        Respuesta: m.reply_text || "",
        "Se dio de baja": m.opted_out_at ? "Sí" : "No",
        "Volvió (ventana)": m.returned_at ? formatDateTime(m.returned_at) : "",
        "Avanzó (ventana)": m.progressed_at
          ? formatDateTime(m.progressed_at)
          : "",
        "Terminó curso (ventana)": m.completed_at
          ? formatDateTime(m.completed_at)
          : "",
        "Ventana cumplida": m.matured ? "Sí" : "No",
        Simulacro: m.practice
          ? PRACTICE_LABELS[m.practice.status] || m.practice.status
          : "",
        "Nota simulacro": m.practice?.score ?? "",
        Plantilla: m.template || "",
        Texto: m.text || "",
        Error: m.error || m.meta_error || "",
        "ID usuario": m.user_id,
      }));
      const sheet = XLSX.utils.json_to_sheet(data);
      const book = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book, sheet, "Envíos");
      XLSX.writeFile(book, `envios_whatsapp_${from}_${to}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const totals = summary?.totals;
  const pendingWindow = totals ? totals.delivered - totals.matured : 0;
  const practiceKinds = summary?.kinds.filter((k) => isPracticeKind(k.kind)) ?? [];

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group align="flex-end" gap="sm" wrap="wrap">
            <TextInput
              type="date"
              label="Desde"
              value={from}
              onChange={(e) => setFrom(e.currentTarget.value)}
            />
            <TextInput
              type="date"
              label="Hasta"
              value={to}
              onChange={(e) => setTo(e.currentTarget.value)}
            />
            <Select
              label="Tipo de mensaje"
              placeholder="Todos"
              clearable
              data={Object.entries(KIND_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              value={kind}
              onChange={(v) => setKind((v as EngagementKind) || null)}
              w={240}
            />
            <Select
              label="Ventana de resultado"
              data={WINDOWS}
              value={windowHours}
              onChange={(v) => setWindowHours(v || "72")}
              allowDeselect={false}
              w={150}
            />
            <Button
              leftSection={<FaRotateRight />}
              onClick={load}
              loading={loading}
            >
              Actualizar
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            "Volvió": usó la plataforma después del mensaje. "Avanzó":
            registró avance en algún curso. Ambos dentro de la ventana y solo
            sobre envíos cuya ventana ya terminó. Entrega y lectura las
            reporta WhatsApp; con la confirmación de lectura desactivada, un
            mensaje leído aparece solo como entregado.
          </Text>
        </Stack>
      </Card>

      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      {loading && !summary ? (
        <Loader />
      ) : summary && totals ? (
        <>
          {totals.total === 0 ? (
            <Alert color="blue" variant="light">
              No hay mensajes registrados en este periodo. Los envíos se
              registran desde que se activó la bitácora; los anteriores no
              aparecen.
            </Alert>
          ) : (
            <Card withBorder radius="md" p="lg">
              <Stack gap="md">
                <Group gap="xl">
                  <Stat label="Enviados" value={totals.delivered} />
                  <Stat
                    label="Entregados (WhatsApp)"
                    value={countPct(totals.meta_delivered, totals.delivery_rate)}
                  />
                  <Stat
                    label="Leídos"
                    value={countPct(totals.meta_read, totals.read_rate)}
                  />
                  <Stat
                    label="Clic en el botón"
                    value={countPct(totals.clicked, totals.click_rate)}
                  />
                  <Stat
                    label="Respondieron"
                    value={countPct(totals.replied, totals.reply_rate)}
                  />
                  <Stat
                    label={`Volvieron en ${windowLabel(summary.window_hours)}`}
                    value={countPct(totals.returned, totals.return_rate)}
                  />
                  <Stat
                    label={`Avanzaron en ${windowLabel(summary.window_hours)}`}
                    value={countPct(totals.progressed, totals.progress_rate)}
                  />
                </Group>

                <Group gap="xl" align="flex-start">
                  <Stat
                    label="Grupo de control: volvieron / avanzaron"
                    value={`${pct(totals.holdout_return_rate)} / ${pct(
                      totals.holdout_progress_rate
                    )}`}
                  />
                  <LiftStat label="Efecto en volver" lift={totals.return_lift} />
                  <LiftStat label="Efecto en avanzar" lift={totals.lift} />
                  <Stat label="Bajas" value={totals.opted_out} />
                  <Stat
                    label="Fallidos"
                    value={totals.failed + totals.meta_failed}
                  />
                  <Stat label="Frenados por tope" value={totals.capped} />
                </Group>

                {pendingWindow > 0 && (
                  <Text size="xs" c="dimmed">
                    {pendingWindow} envío(s) aún no cumplen la ventana y no
                    entran en las tasas de regreso y avance.
                  </Text>
                )}
                {totals.holdout === 0 && totals.delivered > 0 ? (
                  <Alert color="yellow" variant="light">
                    No hay grupo de control en este periodo, así que no se
                    puede saber si el regreso o el avance se deben a los
                    mensajes o habrían ocurrido igual. Se activa en el servidor
                    con ENGAGEMENT_HOLDOUT_PERCENT (p. ej. 10).
                  </Alert>
                ) : (
                  totals.small_sample && (
                    <Alert color="yellow" variant="light">
                      Muestra insuficiente: se necesitan al menos{" "}
                      {summary.min_sample} envíos con la ventana cumplida en
                      cada grupo (enviados y control) para sacar conclusiones.
                      Con menos, la diferencia puede ser azar aunque se vea
                      grande.
                    </Alert>
                  )
                )}
                {totals.click_tracked === 0 && totals.sent > 0 && (
                  <Text size="xs" c="dimmed">
                    Los clics no se están midiendo: se activa en el servidor
                    con ENGAGEMENT_CLICK_REF=true, después de comprobar el
                    enlace en "Probar plantillas".
                  </Text>
                )}
                {totals.with_status === 0 && totals.sent > 0 && (
                  <Text size="xs" c="dimmed">
                    Aún no llegan estados de entrega de WhatsApp: el gateway
                    debe tener configurado INBOUND_STATUS_FORWARD_URL.
                  </Text>
                )}
                {summary.truncated && (
                  <Alert color="yellow" variant="light">
                    El periodo tiene demasiados envíos; los totales cubren solo
                    los más recientes. Acorta el rango de fechas.
                  </Alert>
                )}

                <ScrollArea>
                  <Table striped withTableBorder miw={1300}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Tipo</Table.Th>
                        <Table.Th ta="right">Enviados</Table.Th>
                        <Table.Th ta="right">Entregados</Table.Th>
                        <Table.Th ta="right">Leídos</Table.Th>
                        <Table.Th ta="right">Clic</Table.Th>
                        <Table.Th ta="right">Respondieron</Table.Th>
                        <Table.Th ta="right">Volvieron</Table.Th>
                        <Table.Th ta="right">Avanzaron</Table.Th>
                        <Table.Th ta="right">Control: volvieron / avanzaron</Table.Th>
                        <Table.Th ta="right">Efecto en avanzar</Table.Th>
                        <Table.Th ta="right">Bajas</Table.Th>
                        <Table.Th ta="right">Fallidos</Table.Th>
                        <Table.Th ta="right">Tope</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {summary.kinds.map((k) => (
                        <KindRow key={k.kind} summary={k} />
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {practiceKinds.map((k) => (
                  <Text key={k.kind} size="sm">
                    <Text span fw={600}>
                      {KIND_LABELS[k.kind as EngagementKind]}:
                    </Text>{" "}
                    {k.practice_started ?? 0} empezaron el simulacro (
                    {pct(k.practice_start_rate)}), {k.practice_completed ?? 0}{" "}
                    lo terminaron
                    {k.practice_avg_score !== null &&
                      `, nota promedio ${k.practice_avg_score.toLocaleString(
                        "es-CO"
                      )}/100`}
                    .
                  </Text>
                ))}
              </Stack>
            </Card>
          )}

          <Card withBorder radius="md" p="lg">
            <Stack gap="md">
              <Group justify="space-between" align="flex-end">
                <div>
                  <Title order={4}>Envíos</Title>
                  <Text size="xs" c="dimmed">
                    Los {MAX_ROWS_ON_SCREEN} más recientes; el Excel incluye
                    hasta 1000.
                  </Text>
                </div>
                <Group align="flex-end">
                  <Select
                    label="Estado"
                    placeholder="Todos"
                    clearable
                    data={Object.entries(STATUS_LABELS).map(
                      ([value, label]) => ({ value, label })
                    )}
                    value={status}
                    onChange={(v) => setStatus((v as EngagementStatus) || null)}
                    w={200}
                  />
                  <Button variant="light" onClick={load} loading={loading}>
                    Filtrar
                  </Button>
                  <Button
                    variant="light"
                    color="green"
                    leftSection={<FaFileExcel />}
                    onClick={exportMessages}
                    loading={exporting}
                    disabled={!rows.length}
                  >
                    Excel
                  </Button>
                </Group>
              </Group>

              {rows.length ? (
                <ScrollArea>
                  <Table striped highlightOnHover withTableBorder miw={1200}>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fecha</Table.Th>
                        <Table.Th>Estudiante</Table.Th>
                        <Table.Th>Tipo</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th>Clic</Table.Th>
                        <Table.Th>Respondió</Table.Th>
                        <Table.Th>Volvió</Table.Th>
                        <Table.Th>Avanzó</Table.Th>
                        <Table.Th>Simulacro</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {rows.map((m) => (
                        <MessageRow key={m._id} row={m} />
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              ) : (
                <Text size="sm" c="dimmed">
                  No hay envíos con estos filtros.
                </Text>
              )}
            </Stack>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}

function KindRow({ summary: k }: { summary: EngagementKindSummary }) {
  return (
    <Table.Tr>
      <Table.Td>
        {k.kind === "all" ? "Total" : kindLabel(k.kind, k.step, k.segment)}
      </Table.Td>
      <Table.Td ta="right">{k.delivered}</Table.Td>
      <Table.Td ta="right">{countPct(k.meta_delivered, k.delivery_rate)}</Table.Td>
      <Table.Td ta="right">{countPct(k.meta_read, k.read_rate)}</Table.Td>
      <Table.Td ta="right">{countPct(k.clicked, k.click_rate)}</Table.Td>
      <Table.Td ta="right">{countPct(k.replied, k.reply_rate)}</Table.Td>
      <Table.Td ta="right">{countPct(k.returned, k.return_rate)}</Table.Td>
      <Table.Td ta="right">{countPct(k.progressed, k.progress_rate)}</Table.Td>
      <Table.Td ta="right">
        {k.holdout_matured
          ? `${pct(k.holdout_return_rate)} / ${pct(
              k.holdout_progress_rate
            )} (n=${k.holdout_matured})`
          : "—"}
      </Table.Td>
      <Table.Td ta="right">
        <LiftText lift={k.lift} smallSample={k.small_sample} />
      </Table.Td>
      <Table.Td ta="right">{k.opted_out}</Table.Td>
      <Table.Td ta="right">{k.failed + k.meta_failed}</Table.Td>
      <Table.Td ta="right">{k.capped}</Table.Td>
    </Table.Tr>
  );
}

/** Diferencia con su intervalo; en gris si no es concluyente. */
function LiftText({
  lift,
  smallSample,
}: {
  lift: EngagementLift;
  smallSample: boolean;
}) {
  if (lift.value === null) return <>—</>;
  const conclusive = lift.significant && !smallSample;
  return (
    <Tooltip
      label={`Intervalo 95 %: ${signedPts(lift.ci_low)} a ${signedPts(
        lift.ci_high
      )}${
        conclusive
          ? ""
          : smallSample
          ? " · muestra insuficiente"
          : " · incluye 0: no concluyente"
      }`}
    >
      <Text
        span
        size="sm"
        fw={conclusive ? 700 : undefined}
        c={!conclusive ? "dimmed" : lift.value > 0 ? "teal" : "red"}
      >
        {signedPts(lift.value)}
      </Text>
    </Tooltip>
  );
}

function LiftStat({ label, lift }: { label: string; lift: EngagementLift }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text fw={700} size="lg">
        {signedPts(lift.value)}
      </Text>
      {lift.value !== null && (
        <Text size="xs" c={lift.significant ? "teal" : "dimmed"}>
          {signedPts(lift.ci_low)} a {signedPts(lift.ci_high)}
          {lift.significant ? "" : " · no concluyente"}
        </Text>
      )}
    </div>
  );
}

function MessageRow({ row: m }: { row: EngagementMessageRow }) {
  const delivered = m.status === "sent" || m.status === "fallback_email";
  const tracked = delivered || m.status === "holdout";
  const outcome = (value: string | null) =>
    !tracked
      ? "—"
      : value
      ? formatDateTime(value)
      : m.matured
      ? "No"
      : "Pendiente";

  return (
    <Table.Tr>
      <Table.Td>{formatDateTime(m.at)}</Table.Td>
      <Table.Td>
        <Text size="sm">{m.name || m.user_id}</Text>
        {m.email && (
          <Text size="xs" c="dimmed">
            {m.email}
          </Text>
        )}
      </Table.Td>
      <Table.Td>{kindLabel(m.kind, m.step, m.segment)}</Table.Td>
      <Table.Td>
        <Group gap={4}>
          <Tooltip label={m.error} disabled={!m.error} multiline maw={320}>
            <Badge color={STATUS_COLORS[m.status]} variant="light">
              {STATUS_LABELS[m.status] || m.status}
            </Badge>
          </Tooltip>
          {m.meta_status && (
            <Tooltip
              label={m.meta_error}
              disabled={!m.meta_error}
              multiline
              maw={320}
            >
              <Badge color={META_COLORS[m.meta_status]} variant="outline">
                {META_LABELS[m.meta_status]}
              </Badge>
            </Tooltip>
          )}
          {m.opted_out_at && (
            <Badge color="red" variant="outline">
              Baja
            </Badge>
          )}
        </Group>
      </Table.Td>
      <Table.Td>
        {m.clicked_at
          ? formatDateTime(m.clicked_at)
          : m.click_tracked
          ? "No"
          : "—"}
      </Table.Td>
      <Table.Td>
        {m.replied_at ? (
          <Tooltip label={m.reply_text} disabled={!m.reply_text} multiline maw={320}>
            <Text size="sm">{formatDateTime(m.replied_at)}</Text>
          </Tooltip>
        ) : (
          "—"
        )}
      </Table.Td>
      <Table.Td>{outcome(m.returned_at)}</Table.Td>
      <Table.Td>{outcome(m.progressed_at)}</Table.Td>
      <Table.Td>
        {m.practice ? (
          <Text size="sm">
            {PRACTICE_LABELS[m.practice.status] || m.practice.status}
            {m.practice.score !== null && ` · ${m.practice.score}/100`}
          </Text>
        ) : (
          "—"
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
