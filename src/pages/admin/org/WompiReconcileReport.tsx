import { useState } from "react";
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
  Tabs,
  TextInput,
  NumberInput,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  FaArrowsRotate,
  FaCircleCheck,
  FaCircleQuestion,
  FaBoxArchive,
  FaGlobe,
  FaCalendarDays,
  FaMagnifyingGlass,
  FaUser,
  FaCircleXmark,
} from "react-icons/fa6";
import {
  fetchWompiReconcileReport,
  WompiReconcileResult,
  WompiTransactionRow,
  PlanWithoutWompiRow,
} from "../../../services/paymentPlansService";

type Props = { organizationId: string };

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

function DbStatusBadge({ status }: { status: WompiTransactionRow["dbStatus"] }) {
  if (status === "fully_linked")
    return <Badge color="green" size="xs">Con plan</Badge>;
  if (status === "has_user_no_plan")
    return <Badge color="yellow" size="xs">Usuario sin plan</Badge>;
  return <Badge color="red" size="xs">Sin match</Badge>;
}

function MatchedByBadge({ by }: { by: WompiTransactionRow["matchedBy"] }) {
  if (!by) return <Text size="xs" c="dimmed">—</Text>;
  const labels: Record<string, string> = {
    reference: "referencia",
    transaction_id_on_pr: "txId→PR",
    transaction_id_on_plan: "txId→plan",
    email: "email",
  };
  return <Badge color="blue" variant="outline" size="xs">{labels[by] ?? by}</Badge>;
}

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, { color: string; label: string }> = {
    gateway: { color: "blue", label: "Gateway" },
    cron_approved: { color: "cyan", label: "Cron" },
    admin: { color: "violet", label: "Admin" },
    manual: { color: "gray", label: "Manual" },
  };
  const s = map[source] ?? { color: "gray", label: source };
  return <Badge color={s.color} size="xs">{s.label}</Badge>;
}

function PlanStatusBadge({ status }: { status: "active" | "expired" }) {
  return status === "active"
    ? <Badge color="green" size="xs">Activo</Badge>
    : <Badge color="red" size="xs">Vencido</Badge>;
}

// ── Stat card (igual que SubscriptionReport) ──────────────────────────────

type StatCardProps = {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number;
  description: string;
};

function StatCard({ icon, color, label, value, description }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group wrap="nowrap" align="flex-start" gap="sm">
        <ThemeIcon size="lg" radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
          <Text size="xl" fw={700} lh={1}>{value.toLocaleString("es-CO")}</Text>
          <Text size="xs" c="dimmed">{description}</Text>
        </Stack>
      </Group>
    </Paper>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={700} tt="uppercase" c="dimmed">{children}</Text>
  );
}

// ── Tabla: transacciones Wompi ────────────────────────────────────────────

function WompiTable({ rows }: { rows: WompiTransactionRow[] }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? rows.filter((r) => {
        const needle = q.toLowerCase();
        return (
          r.transactionId?.toLowerCase().includes(needle) ||
          r.reference?.toLowerCase().includes(needle) ||
          r.customerEmail?.toLowerCase().includes(needle) ||
          r.organizationUser?.identification?.toLowerCase().includes(needle) ||
          r.organizationUser?.email?.toLowerCase().includes(needle)
        );
      })
    : rows;

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Buscar por txId, referencia, email o identificación…"
        leftSection={<FaMagnifyingGlass size={13} />}
        size="xs"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        w={340}
      />
      <Text size="xs" c="dimmed">{filtered.length} de {rows.length} transacciones</Text>
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders fz="xs" miw={1000}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Estado BD</Table.Th>
              <Table.Th>Email Wompi</Table.Th>
              <Table.Th>Monto</Table.Th>
              <Table.Th>Encontrado por</Table.Th>
              <Table.Th>Usuario BD</Table.Th>
              <Table.Th>Identificación</Table.Th>
              <Table.Th>Plan</Table.Th>
              <Table.Th>Origen plan</Table.Th>
              <Table.Th>Vence</Table.Th>
              <Table.Th>Fecha del pago</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((r) => (
              <Table.Tr key={r.transactionId}>
                <Table.Td><DbStatusBadge status={r.dbStatus} /></Table.Td>
                <Table.Td>{r.customerEmail ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                <Table.Td>{fmt(r.amount)}</Table.Td>
                <Table.Td><MatchedByBadge by={r.matchedBy} /></Table.Td>
                <Table.Td>{r.organizationUser?.email ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                <Table.Td>{r.organizationUser?.identification ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                <Table.Td>
                  {r.paymentPlan
                    ? <PlanStatusBadge status={r.paymentPlan.status} />
                    : <Text size="xs" c="dimmed">—</Text>}
                </Table.Td>
                <Table.Td>
                  {r.paymentPlan ? <SourceBadge source={r.paymentPlan.source} /> : <Text size="xs" c="dimmed">—</Text>}
                </Table.Td>
                <Table.Td>{r.paymentPlan ? fmtDate(r.paymentPlan.date_until) : "—"}</Table.Td>
                <Table.Td>{fmtDate(r.wompiCreatedAt)}</Table.Td>
              </Table.Tr>
            ))}
            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={11}>
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

// ── Tabla: planes sin Wompi ───────────────────────────────────────────────

function PlansWithoutWompiTable({ rows }: { rows: PlanWithoutWompiRow[] }) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? rows.filter((r) => {
        const needle = q.toLowerCase();
        return (
          r.email?.toLowerCase().includes(needle) ||
          r.identification?.toLowerCase().includes(needle) ||
          r.firstName?.toLowerCase().includes(needle) ||
          r.lastName?.toLowerCase().includes(needle)
        );
      })
    : rows;

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Buscar por email, identificación o nombre…"
        leftSection={<FaMagnifyingGlass size={13} />}
        size="xs"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        w={340}
      />
      <Text size="xs" c="dimmed">{filtered.length} de {rows.length} planes</Text>
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder withColumnBorders fz="xs" miw={900}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Email</Table.Th>
              <Table.Th>Identificación</Table.Th>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Origen</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Vence</Table.Th>
              <Table.Th>Precio</Table.Th>
              <Table.Th>Creado</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filtered.map((r) => (
              <Table.Tr key={r.paymentPlanId}>
                <Table.Td>{r.email ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                <Table.Td>{r.identification ?? <Text size="xs" c="dimmed">—</Text>}</Table.Td>
                <Table.Td>
                  {[r.firstName, r.lastName].filter(Boolean).join(" ") || (
                    <Text size="xs" c="dimmed">—</Text>
                  )}
                </Table.Td>
                <Table.Td><SourceBadge source={r.source} /></Table.Td>
                <Table.Td><PlanStatusBadge status={r.status} /></Table.Td>
                <Table.Td>{fmtDate(r.date_until)}</Table.Td>
                <Table.Td>{fmt(r.price)}</Table.Td>
                <Table.Td>{fmtDate(r.created_at)}</Table.Td>
              </Table.Tr>
            ))}
            {filtered.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={8}>
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

export default function WompiReconcileReport({ organizationId }: Props) {
  const today = new Date();

  const [fromDate, setFromDate] = useState<Date | null>(new Date("2023-01-01"));
  const [untilDate, setUntilDate] = useState<Date | null>(today);
  const [amountCOP, setAmountCOP] = useState<number | string>(50000);
  const [data, setData] = useState<WompiReconcileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [innerTab, setInnerTab] = useState<string>("wompi");

  const load = async () => {
    if (!fromDate || !untilDate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWompiReconcileReport({
        organizationId,
        from_date: fromDate.toISOString(),
        until_date: untilDate.toISOString(),
        amountCOP: typeof amountCOP === "number" ? amountCOP : undefined,
      });
      setData(result);
    } catch {
      setError("No se pudo cargar el reporte. Verifica las fechas e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap="lg">
      {/* Encabezado y controles */}
      <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
        <Stack gap={2}>
          <Title order={4}>Reconciliación Wompi</Title>
          <Text size="xs" c="dimmed">
            Pagos de Wompi cruzados con planes y usuarios de la BD
          </Text>
        </Stack>
        <Group align="flex-end" gap="sm" wrap="wrap">
          <DatePickerInput
            label="Desde"
            placeholder="Fecha inicio"
            value={fromDate}
            onChange={setFromDate}
            size="xs"
            maxDate={untilDate ?? today}
            leftSection={<FaCalendarDays size={12} />}
            w={150}
          />
          <DatePickerInput
            label="Hasta"
            placeholder="Fecha fin"
            value={untilDate}
            onChange={setUntilDate}
            size="xs"
            minDate={fromDate ?? undefined}
            maxDate={today}
            leftSection={<FaCalendarDays size={12} />}
            w={150}
          />
          <NumberInput
            label="Monto (COP)"
            value={amountCOP}
            onChange={setAmountCOP}
            size="xs"
            min={0}
            step={1000}
            thousandSeparator="."
            decimalSeparator=","
            w={130}
          />
          <Button
            size="xs"
            leftSection={<FaArrowsRotate size={12} />}
            onClick={load}
            loading={loading}
            disabled={!fromDate || !untilDate}
          >
            Consultar
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" variant="light">{error}</Alert>
      )}

      {loading && !data && (
        <Group justify="center" py="xl">
          <Stack align="center" gap="xs">
            <Loader size="sm" />
            <Text size="xs" c="dimmed">Consultando Wompi y cruzando con BD…</Text>
          </Stack>
        </Group>
      )}

      {data && (
        <Stack gap="md">
          {/* Resumen — perspectiva Wompi (transacciones) */}
          <SectionTitle>Transacciones Wompi en el rango</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
            <StatCard
              icon={<FaGlobe size={16} />}
              color="blue"
              label="Total transacciones"
              value={data.summary.wompiTotal}
              description="Con el monto indicado en el rango"
            />
            <StatCard
              icon={<FaCircleCheck size={16} />}
              color="green"
              label="Vinculadas con plan"
              value={data.summary.fullyLinked}
              description="Transacciones con plan encontrado en BD"
            />
            <StatCard
              icon={<FaUser size={16} />}
              color="yellow"
              label="Usuario sin plan"
              value={data.summary.hasUserNoPlan}
              description="Usuario existe en BD pero sin plan"
            />
            <StatCard
              icon={<FaCircleQuestion size={16} />}
              color="red"
              label="Sin match en BD"
              value={data.summary.noDbMatch}
              description="No se encontró nada en la BD"
            />
          </SimpleGrid>

          <Divider />

          {/* Resumen — perspectiva planes (BD) */}
          <Group justify="space-between" align="center">
            <SectionTitle>Planes en BD — total: {data.summary.totalPlans.toLocaleString("es-CO")}</SectionTitle>
            <Text size="xs" c="dimmed">
              {data.summary.matchedPlans} + {data.summary.plansWithoutWompi} = {(data.summary.matchedPlans + data.summary.plansWithoutWompi).toLocaleString("es-CO")} planes
            </Text>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <StatCard
              icon={<FaCircleCheck size={16} />}
              color="teal"
              label="Planes con Wompi"
              value={data.summary.matchedPlans}
              description="Planes únicos vinculados a ≥1 transacción Wompi"
            />
            <StatCard
              icon={<FaBoxArchive size={16} />}
              color="orange"
              label="Planes sin Wompi"
              value={data.summary.plansWithoutWompi}
              description="Planes en BD sin ninguna transacción Wompi"
            />
          </SimpleGrid>

          <Divider />

          {/* Tablas */}
          <Tabs value={innerTab} onChange={(v) => v && setInnerTab(v)}>
            <Tabs.List>
              <Tabs.Tab value="wompi" leftSection={<FaGlobe size={12} />}>
                Todas las transacciones{" "}
                <Badge size="xs" color="blue" ml={4}>
                  {data.wompiTransactions.length}
                </Badge>
              </Tabs.Tab>
              <Tabs.Tab value="no-match" leftSection={<FaCircleXmark size={12} />}>
                No cruzadas{" "}
                <Badge size="xs" color="red" ml={4}>
                  {data.wompiTransactions.filter((r) => r.dbStatus !== "fully_linked").length}
                </Badge>
              </Tabs.Tab>
              <Tabs.Tab value="no-wompi" leftSection={<FaBoxArchive size={12} />}>
                Planes sin Wompi{" "}
                <Badge size="xs" color="yellow" ml={4}>
                  {data.plansWithoutWompi.length}
                </Badge>
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="wompi" pt="md">
              <WompiTable rows={data.wompiTransactions} />
            </Tabs.Panel>

            <Tabs.Panel value="no-match" pt="md">
              <Stack gap="xs">
                <Alert color="red" variant="light" icon={<FaCircleXmark size={14} />}>
                  Estas transacciones de <strong>${(typeof amountCOP === "number" ? amountCOP : 50000).toLocaleString("es-CO")} COP</strong> en
                  Wompi <strong>no pudieron cruzarse con ningún plan en la BD</strong>. Incluye tanto las que
                  no tienen ningún registro ("Sin match") como las que tienen usuario pero sin plan activo.
                </Alert>
                <WompiTable
                  rows={data.wompiTransactions.filter((r) => r.dbStatus !== "fully_linked")}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="no-wompi" pt="md">
              <Stack gap="xs">
                <Alert color="yellow" variant="light" icon={<FaBoxArchive size={14} />}>
                  Estos planes existen en la BD pero <strong>no tienen ninguna transacción Wompi</strong> vinculada
                  en el rango consultado. Pueden ser planes migrados, asignados por admin o ingresados manualmente.
                </Alert>
                <PlansWithoutWompiTable rows={data.plansWithoutWompi} />
              </Stack>
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

      {!data && !loading && !error && (
        <Paper withBorder p="xl" radius="md">
          <Group justify="center">
            <Stack align="center" gap="xs">
              <ThemeIcon size="xl" radius="md" color="blue" variant="light">
                <FaGlobe size={20} />
              </ThemeIcon>
              <Text size="sm" c="dimmed" ta="center">
                Selecciona un rango de fechas y presiona <strong>Consultar</strong> para
                obtener las transacciones de Wompi y cruzarlas con la BD.
              </Text>
            </Stack>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}
