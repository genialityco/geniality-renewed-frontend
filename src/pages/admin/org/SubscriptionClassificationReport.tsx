import { useEffect, useState } from "react";
import {
  Stack,
  Title,
  Group,
  Paper,
  Text,
  Alert,
  Button,
  Loader,
  ThemeIcon,
  SimpleGrid,
  Divider,
  Badge,
  Table,
  ScrollArea,
  TextInput,
  Select,
  Box,
  RingProgress,
  Tabs,
} from "@mantine/core";
import * as XLSX from "xlsx";
import {
  FaArrowsRotate,
  FaCircleCheck,
  FaRotate,
  FaBoxArchive,
  FaCircleXmark,
  FaGlobe,
  FaMagnifyingGlass,
  FaHandHoldingHeart,
  FaHourglassEnd,
  FaUsers,
  FaMoneyBillWave,
  FaArrowRight,
  FaFilePdf,
  FaFileExcel,
} from "react-icons/fa6";
import { PDFDownloadLink } from "@react-pdf/renderer";
import {
  fetchFullClassification,
  FullClassificationResult,
  ClassificationItem,
  SubscriptionClassification,
  UnmatchedWompiTransaction,
} from "../../../services/paymentPlansService";
import { ClassificationReportPDF } from "./ClassificationReportPDF";

type Props = { organizationId: string };

// ── Configuración visual por clasificación ────────────────────────────────

const CLASS_CONFIG: Record<
  SubscriptionClassification,
  { label: string; color: string; icon: React.ReactNode; description: string }
> = {
  pagado_sin_renovar: {
    label: "Pagó — sin renovar",
    color: "blue",
    icon: <FaCircleCheck size={14} />,
    description: "Pagó el original, aún en primer período",
  },
  pagado_renovado_pagando: {
    label: "Pagó + renovó pagando",
    color: "green",
    icon: <FaRotate size={14} />,
    description: "Pagó el original y renovó con pago Wompi",
  },
  pagado_renovado_cortesia: {
    label: "Pagó + renovó cortesía",
    color: "teal",
    icon: <FaHandHoldingHeart size={14} />,
    description: "Pagó el original, renovación sin cobro",
  },
  cortesia_sin_renovar: {
    label: "Cortesía — sin renovar",
    color: "yellow",
    icon: <FaBoxArchive size={14} />,
    description: "Membresía cortesía activa, no ha renovado",
  },
  cortesia_renovada_pagando: {
    label: "Cortesía + renovó pagando",
    color: "violet",
    icon: <FaGlobe size={14} />,
    description: "Tenía cortesía y renovó con pago Wompi",
  },
  cortesia_renovada_cortesia: {
    label: "Cortesía + renovó cortesía",
    color: "orange",
    icon: <FaHandHoldingHeart size={14} />,
    description: "Siempre ha tenido membresía sin cobro",
  },
  sin_plan: {
    label: "Sin suscripción",
    color: "red",
    icon: <FaCircleXmark size={14} />,
    description: "Registrado pero nunca tuvo plan",
  },
};

const CLASS_ORDER: SubscriptionClassification[] = [
  "pagado_renovado_pagando",
  "pagado_sin_renovar",
  "pagado_renovado_cortesia",
  "cortesia_renovada_pagando",
  "cortesia_sin_renovar",
  "cortesia_renovada_cortesia",
  "sin_plan",
];

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

function pct(part: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function ClassBadge({ c }: { c: SubscriptionClassification }) {
  const cfg = CLASS_CONFIG[c];
  return (
    <Badge color={cfg.color} size="xs">
      {cfg.label}
    </Badge>
  );
}

function PlanStatusBadge({ status }: { status: "active" | "expired" }) {
  return status === "active" ? (
    <Badge color="green" size="xs">Activo</Badge>
  ) : (
    <Badge color="red" size="xs">Vencido</Badge>
  );
}

// ── Tarjeta numérica grande ───────────────────────────────────────────────

function BigStat({
  icon,
  color,
  label,
  value,
  total,
  description,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number;
  total?: number;
  description?: string;
}) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group wrap="nowrap" align="flex-start" gap="sm">
        <ThemeIcon size="lg" radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {label}
          </Text>
          <Group gap="xs" align="baseline">
            <Text size="xl" fw={700} lh={1}>
              {value.toLocaleString("es-CO")}
            </Text>
            {total !== undefined && (
              <Text size="xs" c="dimmed">
                {pct(value, total)}
              </Text>
            )}
          </Group>
          {description && (
            <Text size="xs" c="dimmed">{description}</Text>
          )}
        </Stack>
      </Group>
    </Paper>
  );
}

// ── Tarjeta de sub-categoría (más compacta) ───────────────────────────────

function SubStat({
  classification,
  value,
  total,
}: {
  classification: SubscriptionClassification;
  value: number;
  total?: number;
}) {
  const cfg = CLASS_CONFIG[classification];
  return (
    <Paper withBorder p="sm" radius="md" bg="gray.0">
      <Group wrap="nowrap" align="center" gap="xs">
        <ThemeIcon size="sm" radius="sm" color={cfg.color} variant="light">
          {cfg.icon}
        </ThemeIcon>
        <Stack gap={0} style={{ flex: 1 }}>
          <Group gap="xs" align="baseline">
            <Text size="sm" fw={700}>{value.toLocaleString("es-CO")}</Text>
            {total !== undefined && (
              <Text size="xs" c="dimmed">{pct(value, total)}</Text>
            )}
          </Group>
          <Text size="xs" c="dimmed" lh={1.3}>{cfg.label}</Text>
        </Stack>
      </Group>
    </Paper>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
      {children}
    </Text>
  );
}

function IndentBlock({ children }: { children: React.ReactNode }) {
  return (
    <Box pl="md" style={{ borderLeft: "2px solid var(--mantine-color-gray-3)" }}>
      {children}
    </Box>
  );
}

// ── Tabla detallada ───────────────────────────────────────────────────────

const CLASS_OPTIONS = [
  { value: "all", label: "Todas las clasificaciones" },
  ...CLASS_ORDER.map((c) => ({ value: c, label: CLASS_CONFIG[c].label })),
];

function ClassificationTable({ items }: { items: ClassificationItem[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = items.filter((r) => {
    if (filter !== "all" && r.classification !== filter) return false;
    if (statusFilter !== "all") {
      const s = r.paymentPlan?.status ?? "none";
      if (statusFilter === "active" && s !== "active") return false;
      if (statusFilter === "expired" && s !== "expired") return false;
      if (statusFilter === "no_plan" && r.paymentPlan !== null) return false;
    }
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return (
      r.email?.toLowerCase().includes(needle) ||
      r.identification?.toLowerCase().includes(needle) ||
      r.firstName?.toLowerCase().includes(needle) ||
      r.lastName?.toLowerCase().includes(needle)
    );
  });

  return (
    <Stack gap="sm">
      <Group gap="sm" wrap="wrap">
        <TextInput
          placeholder="Buscar por email, identificación o nombre…"
          leftSection={<FaMagnifyingGlass size={13} />}
          size="xs"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
          w={280}
        />
        <Select
          data={CLASS_OPTIONS}
          value={filter}
          onChange={(v) => setFilter(v ?? "all")}
          size="xs"
          w={220}
        />
        <Select
          data={[
            { value: "all", label: "Todos los estados" },
            { value: "active", label: "Activos" },
            { value: "expired", label: "Vencidos" },
            { value: "no_plan", label: "Sin plan" },
          ]}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v ?? "all")}
          size="xs"
          w={160}
        />
      </Group>
      <Text size="xs" c="dimmed">
        {filtered.length} de {items.length} usuarios
      </Text>
      <ScrollArea>
        <Table
          striped
          highlightOnHover
          withTableBorder
          withColumnBorders
          fz="xs"
          miw={1000}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Clasificación</Table.Th>
              <Table.Th>Estado plan</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Identificación</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Renovado</Table.Th>
              <Table.Th>Vence</Table.Th>
              <Table.Th>Pagos Wompi</Table.Th>
              <Table.Th>Último pago</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((r) => {
              const lastPayment = r.wompiPayments
                .filter((p) => p.paymentDate)
                .sort(
                  (a, b) =>
                    new Date(b.paymentDate!).getTime() -
                    new Date(a.paymentDate!).getTime()
                )[0];
              return (
                <Table.Tr key={r.organizationUserId}>
                  <Table.Td>
                    <ClassBadge c={r.classification} />
                  </Table.Td>
                  <Table.Td>
                    {r.paymentPlan ? (
                      <PlanStatusBadge status={r.paymentPlan.status} />
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {r.email ?? <Text size="xs" c="dimmed">—</Text>}
                  </Table.Td>
                  <Table.Td>
                    {r.identification ?? <Text size="xs" c="dimmed">—</Text>}
                  </Table.Td>
                  <Table.Td>
                    {[r.firstName, r.lastName].filter(Boolean).join(" ") || (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {r.paymentPlan ? (
                      r.paymentPlan.isRenewed ? (
                        <Badge color="cyan" size="xs">Sí</Badge>
                      ) : (
                        <Badge color="gray" size="xs" variant="outline">No</Badge>
                      )
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {r.paymentPlan ? fmtDate(r.paymentPlan.date_until) : "—"}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={r.wompiPayments.length > 0 ? "blue" : "gray"}
                      variant={r.wompiPayments.length > 0 ? "filled" : "outline"}
                      size="xs"
                    >
                      {r.wompiPayments.length}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {lastPayment ? (
                      <Stack gap={0}>
                        <Text size="xs">{fmtDate(lastPayment.paymentDate)}</Text>
                        <Text size="xs" c="dimmed">{fmt(lastPayment.amount)}</Text>
                      </Stack>
                    ) : (
                      <Text size="xs" c="dimmed">—</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={9}>
                  <Text size="xs" c="dimmed" ta="center" py="sm">
                    Sin resultados
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}

// ── Tabla de transacciones no cruzadas ───────────────────────────────────

function UnmatchedTable({ rows }: { rows: UnmatchedWompiTransaction[] }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? rows.filter((r) => {
        const n = q.toLowerCase();
        return (
          r.customerEmail?.toLowerCase().includes(n) ||
          r.transactionId?.toLowerCase().includes(n) ||
          r.reference?.toLowerCase().includes(n)
        );
      })
    : rows;

  return (
    <Stack gap="sm">
      <Alert color="red" variant="light" icon={<FaCircleXmark size={14} />}>
        Estas transacciones de Wompi <strong>no pudieron vincularse</strong> a ningún usuario
        ni plan en la BD. Pueden ser pagos de otra organización, emails distintos al registrado,
        o referencias sin PaymentRequest asociado.
      </Alert>
      <TextInput
        placeholder="Buscar por email, txId o referencia…"
        leftSection={<FaMagnifyingGlass size={13} />}
        size="xs"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        w={300}
      />
      <Text size="xs" c="dimmed">{filtered.length} de {rows.length} transacciones</Text>
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders fz="xs" miw={700}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email Wompi</Table.Th>
              <Table.Th>Monto</Table.Th>
              <Table.Th>Fecha pago</Table.Th>
              <Table.Th>Transaction ID</Table.Th>
              <Table.Th>Referencia</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((r, i) => (
              <Table.Tr key={r.transactionId ?? i}>
                <Table.Td>{r.customerEmail ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                <Table.Td>{fmt(r.amount)}</Table.Td>
                <Table.Td>{fmtDate(r.createdAt)}</Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                    {r.transactionId ?? "—"}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed">{r.reference ?? "—"}</Text>
                </Table.Td>
              </Table.Tr>
            ))}
            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="xs" c="dimmed" ta="center" py="sm">Sin resultados</Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  );
}

// ── Componente principal ──────────────────────────────────────────────────

const dtfCO = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  dateStyle: "short",
});

const SOURCE_LABEL: Record<string, string> = {
  gateway: "Pasarela de pago",
  admin: "Creado por admin",
  manual: "Creado manualmente",
};

function buildExcelRows(items: ClassificationItem[]) {
  return items.map((r) => {
    const lastPayment = r.wompiPayments
      .filter((p) => p.paymentDate)
      .sort(
        (a, b) =>
          new Date(b.paymentDate!).getTime() - new Date(a.paymentDate!).getTime()
      )[0];

    return {
      Email: r.email ?? "",
      Identificación: r.identification ?? "",
      Nombre: r.names?.trim() || [r.firstName, r.lastName].filter(Boolean).join(" "),
      País: r.pais ?? "",
      "Indicativo país": r.indicativodepais ?? "",
      Teléfono: r.phone ?? "",
      "Perfil profesional": r.perfilProfesional ?? "",
      Especialidad: r.especialidad ?? "",
      "Especialidad subespecialidad": r.especialidadsubespecialidad ?? "",
      Clasificación: CLASS_CONFIG[r.classification].label,
      "Estado plan": r.paymentPlan
        ? r.paymentPlan.status === "active"
          ? "Activa"
          : "Vencida"
        : "Sin suscripción",
      "Fecha vencimiento": r.paymentPlan
        ? dtfCO.format(new Date(r.paymentPlan.date_until))
        : "",
      Renovado: r.paymentPlan ? (r.paymentPlan.isRenewed ? "Sí" : "No") : "",
      Origen: r.paymentPlan ? (SOURCE_LABEL[r.paymentPlan.source] ?? r.paymentPlan.source) : "",
      "Pagos Wompi": r.wompiPayments.length,
      "Fecha último pago": lastPayment?.paymentDate
        ? dtfCO.format(new Date(lastPayment.paymentDate))
        : "",
      "Monto último pago": lastPayment?.amount ?? "",
    };
  });
}

export default function SubscriptionClassificationReport({ organizationId }: Props) {
  const [data, setData] = useState<FullClassificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportToExcel = () => {
    if (!data) return;
    setExporting(true);
    try {
      const activas = data.items.filter((r) => r.paymentPlan?.status === "active");
      const vencidas = data.items.filter((r) => r.paymentPlan?.status === "expired");
      const sinSuscripcion = data.items.filter((r) => r.paymentPlan === null);

      const workbook = XLSX.utils.book_new();

      const addSheet = (rows: ClassificationItem[], sheetName: string) => {
        const worksheet = XLSX.utils.json_to_sheet(buildExcelRows(rows));
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      };

      addSheet(activas, "Activas");
      addSheet(vencidas, "Vencidas");
      addSheet(sinSuscripcion, "Sin suscripcion");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `suscripciones-${date}.xlsx`);
    } finally {
      setExporting(false);
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFullClassification(organizationId);
      setData(result);
    } catch {
      setError("No se pudo cargar la clasificación. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [organizationId]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Title order={4}>Clasificación Unificada de Suscripciones</Title>
          {data && (
            <Text size="xs" c="dimmed">
              Total usuarios:{" "}
              <Text span fw={600} c="dark">
                {data.summary.total.toLocaleString("es-CO")}
              </Text>
              {" · "}Datos Wompi desde enero 2023
            </Text>
          )}
        </Stack>
        <Group gap="xs">
          {data && (
            <Button
              variant="light"
              color="green"
              size="xs"
              leftSection={<FaFileExcel size={12} />}
              loading={exporting}
              onClick={handleExportToExcel}
            >
              Exportar Excel
            </Button>
          )}
          {data && (
            <PDFDownloadLink
              document={
                <ClassificationReportPDF
                  summary={data.summary}
                  organizationId={organizationId}
                />
              }
              fileName={`clasificacion-suscripciones-${new Date().toISOString().slice(0, 10)}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <Button
                  variant="light"
                  color="red"
                  size="xs"
                  leftSection={<FaFilePdf size={12} />}
                  loading={pdfLoading}
                >
                  Descargar PDF
                </Button>
              )}
            </PDFDownloadLink>
          )}
          <Button
            variant="subtle"
            size="xs"
            leftSection={<FaArrowsRotate size={12} />}
            onClick={load}
            loading={loading}
          >
            Actualizar
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      {loading && !data && (
        <Group justify="center" py="xl">
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text size="xs" c="dimmed">
              Descargando historial completo de Wompi desde ene 2023 y clasificando…
            </Text>
          </Stack>
        </Group>
      )}

      {data && (
        <Stack gap="xl">

          {/* ── NIVEL 1: Totales generales ────────────────────────────── */}
          <Stack gap="sm">
            <SectionTitle>Total de usuarios</SectionTitle>
            <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
              <BigStat
                icon={<FaUsers size={16} />}
                color="gray"
                label="Total registrados"
                value={data.summary.total}
                description="Todos los usuarios en la org"
              />
              <BigStat
                icon={<FaCircleCheck size={16} />}
                color="green"
                label="Activos"
                value={data.summary.totalActive}
                total={data.summary.total}
                description="Plan vigente hoy"
              />
              <BigStat
                icon={<FaHourglassEnd size={16} />}
                color="red"
                label="Vencidos"
                value={data.summary.totalExpired}
                total={data.summary.total}
                description="Tuvieron plan pero expiró"
              />
              <BigStat
                icon={<FaCircleXmark size={16} />}
                color="orange"
                label="Sin suscripción"
                value={data.summary.sin_plan}
                total={data.summary.total}
                description="Nunca tuvieron plan"
              />
            </SimpleGrid>
          </Stack>

          <Divider />

          {/* ── NIVEL 2: Renovación sobre TODOS con plan ─────────────── */}
          <Stack gap="sm">
            <Group gap="xs" align="center">
              <FaArrowRight size={11} color="var(--mantine-color-blue-6)" />
              <SectionTitle>
                Renovación — sobre los {data.summary.totalWithPlan.toLocaleString("es-CO")} con plan (activos + vencidos)
              </SectionTitle>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">

              {/* ── Han renovado ── */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Group wrap="nowrap" align="flex-start" gap="sm">
                    <ThemeIcon size="lg" radius="md" color="cyan" variant="light">
                      <FaRotate size={16} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Han renovado ≥ 1 vez</Text>
                      <Group gap="xs" align="baseline">
                        <Text size="xl" fw={700} lh={1}>{data.summary.totalRenewed.toLocaleString("es-CO")}</Text>
                        <Text size="xs" c="dimmed">{pct(data.summary.totalRenewed, data.summary.totalWithPlan)}</Text>
                      </Group>
                    </Stack>
                  </Group>
                  <IndentBlock>
                    <Stack gap="xs">
                      {/* Con Wompi */}
                      <Stack gap={2}>
                        <Group gap="xs">
                          <FaMoneyBillWave size={11} color="var(--mantine-color-blue-6)" />
                          <Text size="xs" fw={700} c="blue">Con pago Wompi: {data.summary.totalRenewed_conWompi.toLocaleString("es-CO")}</Text>
                          <Text size="xs" c="dimmed">{pct(data.summary.totalRenewed_conWompi, data.summary.totalRenewed)}</Text>
                        </Group>
                        <Group gap="xs" pl="md">
                          <Badge color="green" size="xs" variant="dot">Activos</Badge>
                          <Text size="xs">{data.summary.renewedActive_conWompi.toLocaleString("es-CO")}</Text>
                          <Badge color="red" size="xs" variant="dot">Vencidos</Badge>
                          <Text size="xs">{data.summary.renewedExpired_conWompi.toLocaleString("es-CO")}</Text>
                        </Group>
                      </Stack>
                      {/* Cortesía */}
                      <Stack gap={2}>
                        <Group gap="xs">
                          <FaHandHoldingHeart size={11} color="var(--mantine-color-yellow-6)" />
                          <Text size="xs" fw={700} c="yellow.7">Cortesía: {data.summary.totalRenewed_sinWompi.toLocaleString("es-CO")}</Text>
                          <Text size="xs" c="dimmed">{pct(data.summary.totalRenewed_sinWompi, data.summary.totalRenewed)}</Text>
                        </Group>
                        <Group gap="xs" pl="md">
                          <Badge color="green" size="xs" variant="dot">Activos</Badge>
                          <Text size="xs">{data.summary.renewedActive_sinWompi.toLocaleString("es-CO")}</Text>
                          <Badge color="red" size="xs" variant="dot">Vencidos</Badge>
                          <Text size="xs">{data.summary.renewedExpired_sinWompi.toLocaleString("es-CO")}</Text>
                        </Group>
                      </Stack>
                    </Stack>
                  </IndentBlock>
                </Stack>
              </Paper>

              {/* ── Sin renovar ── */}
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Group wrap="nowrap" align="flex-start" gap="sm">
                    <ThemeIcon size="lg" radius="md" color="teal" variant="light">
                      <FaCircleCheck size={16} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Sin renovar (primer período)</Text>
                      <Group gap="xs" align="baseline">
                        <Text size="xl" fw={700} lh={1}>{data.summary.totalNotRenewed.toLocaleString("es-CO")}</Text>
                        <Text size="xs" c="dimmed">{pct(data.summary.totalNotRenewed, data.summary.totalWithPlan)}</Text>
                      </Group>
                    </Stack>
                  </Group>
                  <IndentBlock>
                    <Stack gap="xs">
                      {/* Con Wompi */}
                      <Stack gap={2}>
                        <Group gap="xs">
                          <FaMoneyBillWave size={11} color="var(--mantine-color-blue-6)" />
                          <Text size="xs" fw={700} c="blue">Con pago Wompi: {data.summary.totalNotRenewed_conWompi.toLocaleString("es-CO")}</Text>
                          <Text size="xs" c="dimmed">{pct(data.summary.totalNotRenewed_conWompi, data.summary.totalNotRenewed)}</Text>
                        </Group>
                        <Group gap="xs" pl="md">
                          <Badge color="green" size="xs" variant="dot">Activos</Badge>
                          <Text size="xs">{data.summary.notRenewedActive_conWompi.toLocaleString("es-CO")}</Text>
                          <Badge color="red" size="xs" variant="dot">Vencidos</Badge>
                          <Text size="xs">{data.summary.notRenewedExpired_conWompi.toLocaleString("es-CO")}</Text>
                        </Group>
                      </Stack>
                      {/* Cortesía */}
                      <Stack gap={2}>
                        <Group gap="xs">
                          <FaHandHoldingHeart size={11} color="var(--mantine-color-yellow-6)" />
                          <Text size="xs" fw={700} c="yellow.7">Cortesía: {data.summary.totalNotRenewed_sinWompi.toLocaleString("es-CO")}</Text>
                          <Text size="xs" c="dimmed">{pct(data.summary.totalNotRenewed_sinWompi, data.summary.totalNotRenewed)}</Text>
                        </Group>
                        <Group gap="xs" pl="md">
                          <Badge color="green" size="xs" variant="dot">Activos</Badge>
                          <Text size="xs">{data.summary.notRenewedActive_sinWompi.toLocaleString("es-CO")}</Text>
                          <Badge color="red" size="xs" variant="dot">Vencidos</Badge>
                          <Text size="xs">{data.summary.notRenewedExpired_sinWompi.toLocaleString("es-CO")}</Text>
                        </Group>
                      </Stack>
                    </Stack>
                  </IndentBlock>
                </Stack>
              </Paper>

            </SimpleGrid>
          </Stack>

          <Divider />

          {/* ── NIVEL 3: De los activos — fuente de pago ─────────────── */}
          <Stack gap="sm">
            <Group gap="xs" align="center">
              <FaArrowRight size={11} color="var(--mantine-color-green-6)" />
              <SectionTitle>
                De los {data.summary.totalActive.toLocaleString("es-CO")} activos — fuente de pago (Wompi como fuente de verdad)
              </SectionTitle>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Group wrap="nowrap" align="flex-start" gap="sm">
                    <ThemeIcon size="lg" radius="md" color="blue" variant="light">
                      <FaMoneyBillWave size={16} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Pagaron con Wompi</Text>
                      <Group gap="xs" align="baseline">
                        <Text size="xl" fw={700} lh={1}>
                          {data.summary.activePagaron.toLocaleString("es-CO")}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {pct(data.summary.activePagaron, data.summary.totalActive)}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">Tienen ≥1 transacción Wompi (cualquier período)</Text>
                    </Stack>
                  </Group>
                  <IndentBlock>
                    <Stack gap="xs">
                      <SubStat
                        classification="pagado_sin_renovar"
                        value={data.summary.activePagaron_sinRenovar}
                        total={data.summary.activePagaron}
                      />
                      <SubStat
                        classification="pagado_renovado_pagando"
                        value={data.summary.activePagaron_renovaronPagando}
                        total={data.summary.activePagaron}
                      />
                      <SubStat
                        classification="pagado_renovado_cortesia"
                        value={data.summary.activePagaron_renovaronCortesia}
                        total={data.summary.activePagaron}
                      />
                      <SubStat
                        classification="cortesia_renovada_pagando"
                        value={data.summary.activePagaron_cortesiaRenovoPagando}
                        total={data.summary.activePagaron}
                      />
                    </Stack>
                  </IndentBlock>
                </Stack>
              </Paper>

              <Paper withBorder p="md" radius="md">
                <Stack gap="sm">
                  <Group wrap="nowrap" align="flex-start" gap="sm">
                    <ThemeIcon size="lg" radius="md" color="yellow" variant="light">
                      <FaHandHoldingHeart size={16} />
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Membresía cortesía</Text>
                      <Group gap="xs" align="baseline">
                        <Text size="xl" fw={700} lh={1}>
                          {data.summary.activeCortesia.toLocaleString("es-CO")}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {pct(data.summary.activeCortesia, data.summary.totalActive)}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">Sin ningún pago Wompi registrado</Text>
                    </Stack>
                  </Group>
                  <IndentBlock>
                    <Stack gap="xs">
                      <SubStat
                        classification="cortesia_sin_renovar"
                        value={data.summary.activeCortesia_sinRenovar}
                        total={data.summary.activeCortesia}
                      />
                      <SubStat
                        classification="cortesia_renovada_cortesia"
                        value={data.summary.activeCortesia_renovaronCortesia}
                        total={data.summary.activeCortesia}
                      />
                    </Stack>
                  </IndentBlock>
                </Stack>
              </Paper>
            </SimpleGrid>

            {/* Verificación: activos = pagaron + cortesía */}
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Verificación activos:{" "}
                <Text span fw={600} c="dark">
                  {data.summary.activePagaron.toLocaleString("es-CO")} con Wompi
                </Text>
                {" + "}
                <Text span fw={600} c="dark">
                  {data.summary.activeCortesia.toLocaleString("es-CO")} cortesía
                </Text>
                {" = "}
                <Text
                  span fw={600}
                  c={data.summary.activePagaron + data.summary.activeCortesia === data.summary.totalActive ? "green" : "red"}
                >
                  {(data.summary.activePagaron + data.summary.activeCortesia).toLocaleString("es-CO")}
                </Text>
                {" de "}{data.summary.totalActive.toLocaleString("es-CO")}
              </Text>
            </Group>
          </Stack>

          <Divider />

          {/* ── HISTÓRICO: Totales activos+vencidos con/sin Wompi ─────── */}
          <Stack gap="sm">
            <Group gap="xs" align="center">
              <FaArrowRight size={11} color="var(--mantine-color-gray-5)" />
              <SectionTitle>
                Histórico total (activos + vencidos) — comparable con reconciliación Wompi
              </SectionTitle>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <BigStat
                icon={<FaMoneyBillWave size={16} />}
                color="blue"
                label="Con pago Wompi (histórico)"
                value={data.summary.totalConWompi}
                total={data.summary.totalWithPlan}
                description={`Activos: ${data.summary.activePagaron.toLocaleString("es-CO")} · Vencidos: ${data.summary.expiredConWompi.toLocaleString("es-CO")}`}
              />
              <BigStat
                icon={<FaHandHoldingHeart size={16} />}
                color="yellow"
                label="Cortesía (histórico)"
                value={data.summary.totalSinWompi}
                total={data.summary.totalWithPlan}
                description={`Activos: ${data.summary.activeCortesia.toLocaleString("es-CO")} · Vencidos: ${data.summary.expiredSinWompi.toLocaleString("es-CO")}`}
              />
              <BigStat
                icon={<FaHourglassEnd size={16} />}
                color="gray"
                label="Vencidos con Wompi"
                value={data.summary.expiredConWompi}
                total={data.summary.totalExpired}
                description="Pagaron pero su plan ya expiró"
              />
            </SimpleGrid>
            <Text size="xs" c="dimmed">
              El total con pago Wompi histórico ({data.summary.totalConWompi.toLocaleString("es-CO")}) debería ser cercano al "matchedPlans" en la reconciliación Wompi.
            </Text>
          </Stack>

          <Divider />

          {/* ── NIVEL 4: Distribución donut (visual) ─────────────────── */}
          <Stack gap="sm">
            <SectionTitle>Distribución completa de activos</SectionTitle>
            <Group gap="md" wrap="wrap">
              <RingProgress
                size={180}
                thickness={20}
                label={
                  <Text ta="center" size="xs" fw={600}>
                    {data.summary.totalActive.toLocaleString("es-CO")}
                    <br />
                    <Text span size="xs" c="dimmed">activos</Text>
                  </Text>
                }
                sections={[
                  {
                    value: data.summary.totalActive ? (data.summary.activePagaron_sinRenovar / data.summary.totalActive) * 100 : 0,
                    color: "blue",
                    tooltip: `Pagó sin renovar: ${data.summary.activePagaron_sinRenovar}`,
                  },
                  {
                    value: data.summary.totalActive ? (data.summary.activePagaron_renovaronPagando / data.summary.totalActive) * 100 : 0,
                    color: "green",
                    tooltip: `Pagó + renovó pagando: ${data.summary.activePagaron_renovaronPagando}`,
                  },
                  {
                    value: data.summary.totalActive ? (data.summary.activePagaron_renovaronCortesia / data.summary.totalActive) * 100 : 0,
                    color: "teal",
                    tooltip: `Pagó + renovó cortesía: ${data.summary.activePagaron_renovaronCortesia}`,
                  },
                  {
                    value: data.summary.totalActive ? (data.summary.activePagaron_cortesiaRenovoPagando / data.summary.totalActive) * 100 : 0,
                    color: "violet",
                    tooltip: `Cortesía original + renovó pagando: ${data.summary.activePagaron_cortesiaRenovoPagando}`,
                  },
                  {
                    value: data.summary.totalActive ? (data.summary.activeCortesia_sinRenovar / data.summary.totalActive) * 100 : 0,
                    color: "yellow",
                    tooltip: `Cortesía sin renovar: ${data.summary.activeCortesia_sinRenovar}`,
                  },
                  {
                    value: data.summary.totalActive ? (data.summary.activeCortesia_renovaronCortesia / data.summary.totalActive) * 100 : 0,
                    color: "orange",
                    tooltip: `Cortesía + renovó cortesía: ${data.summary.activeCortesia_renovaronCortesia}`,
                  },
                ]}
              />
              <Stack gap="xs">
                {(
                  [
                    ["pagado_sin_renovar", data.summary.activePagaron_sinRenovar],
                    ["pagado_renovado_pagando", data.summary.activePagaron_renovaronPagando],
                    ["pagado_renovado_cortesia", data.summary.activePagaron_renovaronCortesia],
                    ["cortesia_renovada_pagando", data.summary.activePagaron_cortesiaRenovoPagando],
                    ["cortesia_sin_renovar", data.summary.activeCortesia_sinRenovar],
                    ["cortesia_renovada_cortesia", data.summary.activeCortesia_renovaronCortesia],
                  ] as [SubscriptionClassification, number][]
                ).map(([c, v]) => (
                  <Group key={c} gap="xs" wrap="nowrap">
                    <Box w={10} h={10} style={{ borderRadius: 2, backgroundColor: `var(--mantine-color-${CLASS_CONFIG[c].color}-5)`, flexShrink: 0 }} />
                    <Text size="xs" fw={600} style={{ minWidth: 32 }}>{v.toLocaleString("es-CO")}</Text>
                    <Text size="xs" c="dimmed">{CLASS_CONFIG[c].label}</Text>
                  </Group>
                ))}
              </Stack>
            </Group>
          </Stack>

          <Divider />

          {/* ── Tablas ────────────────────────────────────────────────── */}
          <Tabs defaultValue="usuarios">
            <Tabs.List>
              <Tabs.Tab value="usuarios" leftSection={<FaUsers size={12} />}>
                Usuarios clasificados{" "}
                <Badge size="xs" color="blue" ml={4}>{data.items.length}</Badge>
              </Tabs.Tab>
              <Tabs.Tab value="no-cruzadas" leftSection={<FaCircleXmark size={12} />}>
                No cruzadas con BD{" "}
                <Badge size="xs" color="red" ml={4}>
                  {data.unmatchedWompiTransactions.length}
                </Badge>
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="usuarios" pt="md">
              <ClassificationTable items={data.items} />
            </Tabs.Panel>

            <Tabs.Panel value="no-cruzadas" pt="md">
              <UnmatchedTable rows={data.unmatchedWompiTransactions} />
            </Tabs.Panel>
          </Tabs>

          <Text size="xs" c="dimmed" ta="right">
            Generado:{" "}
            {new Date(data.summary.generatedAt).toLocaleString("es-CO", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}
