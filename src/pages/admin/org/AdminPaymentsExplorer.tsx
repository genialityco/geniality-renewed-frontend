// app/admin/organization/AdminPaymentsExplorer.tsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  SetStateAction,
} from "react";
import {
  Paper,
  Group,
  Button,
  Select,
  TextInput,
  Table,
  Title,
  Stack,
  Loader,
  Alert,
  Text,
  Modal,
  Badge,
  ActionIcon,
  Tooltip,
  Pagination,
  CopyButton,
  Code,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { FaArrowTurnDown, FaClipboard, FaEye, FaLink } from "react-icons/fa6";

import {
  searchPaymentRequests,
  type PaymentRequestRow,
} from "../../../services/paymentRequestsService";

import { fetchPaymentPlanByUserId } from "../../../services/paymentPlansService";
import { PaymentPlan } from "../../../services/types";

type Props = { organizationId: string };

const STATUS_OPTIONS = [
  { value: "ALL", label: "Todos" },
  { value: "CREATED", label: "CREATED" },
  { value: "PENDING", label: "PENDING" },
  { value: "APPROVED", label: "APPROVED" },
  { value: "DECLINED", label: "DECLINED" },
  { value: "VOIDED", label: "VOIDED" },
  { value: "ERROR", label: "ERROR" },
];

export default function AdminPaymentsExplorer({ organizationId }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PaymentRequestRow[]>([]);
  const [total, setTotal] = useState(0);

  // Modal RAW
  const [rawOpen, setRawOpen] = useState(false);
  const rawRef = useRef<PaymentRequestRow | null>(null);

  // Modal PLAN
  const [planOpen, setPlanOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [plan, setPlan] = useState<PaymentPlan | null>(null);
  const [newUntil, setNewUntil] = useState<Date | null>(null);
  const [planMsg, setPlanMsg] = useState<string | null>(null);
  const planSourceRow = useRef<PaymentRequestRow | null>(null);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await searchPaymentRequests({
        organizationId,
        q: query,
        status: status === "ALL" ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
        dateFrom: dateFrom?.toISOString(),
        dateTo: dateTo?.toISOString(),
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar pagos.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, query, status, page, dateFrom, dateTo]);

  useEffect(() => {
    void doSearch();
  }, [doSearch]);

  const formatCOP = (n: number) =>
    n.toLocaleString("es-CO", { style: "currency", currency: "COP" });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // --- Abrir modal de PLAN y traer el plan completo por OrganizationUserId ---
  const openPlanModal = useCallback(async (row: PaymentRequestRow) => {
    setPlanOpen(true);
    setPlan(null);
    setPlanMsg(null);
    setLoadingPlan(true);
    planSourceRow.current = row;

    try {
      const ouId = row.organizationUser?.user_id as string;
      console.log(row.organizationUser)
      if (!ouId) {
        setPlan(null);
      } else {
        const fullPlan = await fetchPaymentPlanByUserId(ouId);
        setPlan(fullPlan);
        setNewUntil(
          fullPlan?.date_until ? new Date(fullPlan.date_until) : null
        );
      }
    } catch {
      setPlan(null);
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  // --- Guardar nueva fecha del plan ---
  //   const savePlanDate = useCallback(async () => {
  //     if (!plan?._id || !newUntil) return;
  //     setUpdatingPlan(true);
  //     setPlanMsg(null);
  //     try {
  //       const displayName =
  //         planSourceRow.current?.organizationUser?.properties?.nombres ||
  //         planSourceRow.current?.organizationUser?.properties?.names ||
  //         "Usuario";

  //       const updated = await updatePaymentPlanDateUntil({
  //         id: plan._id,
  //         date_until: newUntil.toISOString(),
  //         nameUser: displayName,
  //       });

  //       setPlan((prev) =>
  //         prev ? { ...prev, date_until: updated.date_until } : updated
  //       );
  //       setPlanMsg("Fecha de vencimiento actualizada correctamente.");
  //       // refrescar listado por si hay cambios que quieras ver reflejados
  //       void doSearch();
  //     } catch (e: any) {
  //       setPlanMsg(e?.message || "No se pudo actualizar la fecha.");
  //     } finally {
  //       setUpdatingPlan(false);
  //     }
  //   }, [plan?._id, newUntil, doSearch]);

  const tableRows = useMemo(
    () =>
      rows.map((r) => {
        const badgeColor =
          r.status === "APPROVED"
            ? "green"
            : r.status === "PENDING" || r.status === "CREATED"
            ? "yellow"
            : r.status === "DECLINED" ||
              r.status === "VOIDED" ||
              r.status === "ERROR"
            ? "red"
            : "gray";

        return (
          <Table.Tr key={r.reference}>
            <Table.Td>
              <Text fw={500}>
                {r.organizationUser?.properties?.nombres ||
                  r.organizationUser?.properties?.names ||
                  "—"}
              </Text>
              <Text size="xs" c="dimmed">
                {r.organizationUser?.properties?.email || "—"}
              </Text>
            </Table.Td>

            <Table.Td>
              <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                <Tooltip label={r.reference}>
                  <Text fw={600} truncate w={200}>
                    {r.reference}
                  </Text>
                </Tooltip>
                <CopyButton value={r.reference}>
                  {({ copy, copied }) => (
                    <Tooltip label={copied ? "Copiado" : "Copiar ref."}>
                      <ActionIcon variant="subtle" onClick={copy}>
                        <FaClipboard size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              <Text size="xs" c="dimmed">
                Tx: {r.transactionId || "—"}
              </Text>
            </Table.Td>

            <Table.Td>
              <Badge color={badgeColor} variant="light">
                {r.status}
              </Badge>
            </Table.Td>

            <Table.Td>{formatCOP(r.amount)}</Table.Td>
            <Table.Td>{r.currency}</Table.Td>

            <Table.Td>
              {r.paymentPlan ? (
                <Stack gap={2}>
                  <Text size="sm">
                    Hasta:{" "}
                    <b>
                      {new Date(r.paymentPlan.date_until).toLocaleDateString()}
                    </b>
                  </Text>
                  <Text size="xs" c="dimmed">
                    Plan: {r.paymentPlan._id?.slice?.(0, 8)}… ·{" "}
                    {r.paymentPlan.payment_request_id
                      ? `link a PR ✔`
                      : `sin link`}
                  </Text>
                </Stack>
              ) : (
                <Text c="dimmed" size="sm">
                  — (sin plan)
                </Text>
              )}
            </Table.Td>

            <Table.Td>
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  Creado: {new Date(r.createdAt).toLocaleString()}
                </Text>
                <Text size="xs" c="dimmed">
                  Actualizado: {new Date(r.updatedAt).toLocaleString()}
                </Text>
              </Stack>
            </Table.Td>

            <Table.Td width={120}>
              <Group gap="xs" justify="flex-start">
                <Tooltip label="Ver raw (snapshots)">
                  <ActionIcon
                    variant="light"
                    onClick={() => {
                      rawRef.current = r;
                      setRawOpen(true);
                    }}
                  >
                    <FaEye size={16} />
                  </ActionIcon>
                </Tooltip>

                {r.organizationUser?._id && (
                  <Tooltip label="Ver plan">
                    <ActionIcon
                      variant="subtle"
                      onClick={() => openPlanModal(r)}
                    >
                      <FaLink size={16} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </Group>
            </Table.Td>
          </Table.Tr>
        );
      }),
    [rows, openPlanModal]
  );

  return (
    <Stack>
      <Title order={3}>Pagos (PaymentRequests)</Title>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <Paper withBorder p="sm" radius="md">
        <Group wrap="wrap" gap="sm" align="end">
          <TextInput
            label="Buscar"
            description="Referencia, email, nombre, tx…"
            placeholder="membresia-... o correo"
            value={query}
            onChange={(e) => {
              setPage(1);
              setQuery(e.currentTarget.value);
            }}
            w={280}
          />

          <Select
            label="Estado"
            data={STATUS_OPTIONS}
            value={status}
            onChange={(v) => {
              setPage(1);
              setStatus(v || "ALL");
            }}
            w={180}
          />

          <DateInput
            label="Desde"
            value={dateFrom}
            onChange={(d: SetStateAction<Date | null>) => {
              setPage(1);
              setDateFrom(d);
            }}
            w={180}
            clearable
          />
          <DateInput
            label="Hasta"
            value={dateTo}
            onChange={(d: SetStateAction<Date | null>) => {
              setPage(1);
              setDateTo(d);
            }}
            w={180}
            clearable
          />

          <Button
            leftSection={<FaArrowTurnDown size={16} />}
            variant="light"
            onClick={() => void doSearch()}
            loading={loading}
          >
            Actualizar
          </Button>
        </Group>

        <Table striped highlightOnHover withColumnBorders mt="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Organization User</Table.Th>
              <Table.Th>Referencia / Tx</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Monto</Table.Th>
              <Table.Th>Moneda</Table.Th>
              <Table.Th>Payment Plan</Table.Th>
              <Table.Th>Fechas</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Group justify="center" py="lg">
                    <Loader />
                  </Group>
                </Table.Td>
              </Table.Tr>
            ) : tableRows.length ? (
              tableRows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={8}>
                  <Text c="dimmed" ta="center">
                    Sin resultados
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>

        <Group justify="flex-end" mt="sm">
          <Pagination total={totalPages} value={page} onChange={setPage} />
        </Group>
      </Paper>

      {/* Modal: snapshots */}
      <Modal
        opened={rawOpen}
        onClose={() => setRawOpen(false)}
        title="Snapshots de Wompi"
        size="xl"
      >
        {!rawRef.current ? (
          <Text c="dimmed">Sin datos</Text>
        ) : (
          <Stack gap="xs">
            <Text size="sm">
              <b>reference:</b> {rawRef.current.reference}
            </Text>
            <Text size="sm">
              <b>transactionId:</b> {rawRef.current.transactionId || "—"}
            </Text>
            <Text size="sm">
              <b>snapshots:</b> {rawRef.current.wompi_snapshots?.length || 0}
            </Text>
            <pre
              style={{
                maxHeight: 420,
                overflow: "auto",
                background: "var(--mantine-color-dark-6, #111)",
                color: "var(--mantine-color-gray-2, #ddd)",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {JSON.stringify(
                rawRef.current.wompi_snapshots?.map(
                  (s: { source: any; at: any; payload: any }) => ({
                    source: s.source,
                    at: s.at,
                    keys:
                      typeof s.payload === "object"
                        ? Object.keys(s.payload || {})
                        : typeof s.payload,
                    sample:
                      typeof s.payload === "object"
                        ? JSON.stringify(s.payload).slice(0, 1200)
                        : String(s.payload),
                  })
                ) ?? [],
                null,
                2
              )}
            </pre>

            {rawRef.current.rawWebhook && (
              <>
                <Text size="sm">
                  <b>rawWebhook (legacy):</b>
                </Text>
                <Code block>
                  {JSON.stringify(rawRef.current.rawWebhook, null, 2)}
                </Code>
              </>
            )}
          </Stack>
        )}
      </Modal>

      {/* Modal: plan */}
      <Modal
        opened={planOpen}
        onClose={() => setPlanOpen(false)}
        title="Detalle de Payment Plan"
        size="lg"
      >
        {loadingPlan ? (
          <Group justify="center" py="md">
            <Loader />
          </Group>
        ) : !plan ? (
          <Text c="dimmed">No hay plan asociado a este usuario.</Text>
        ) : (
          <Stack gap="sm">
            <Group justify="space-between" wrap="wrap">
              <Text size="sm">
                <b>Plan ID:</b> {plan._id}
              </Text>
              <CopyButton value={plan._id}>
                {({ copy, copied }) => (
                  <Button size="xs" variant="light" onClick={copy}>
                    {copied ? "Copiado" : "Copiar ID"}
                  </Button>
                )}
              </CopyButton>
            </Group>

            <Text size="sm">
              <b>Vinculado a PR:</b> {plan.payment_request_id ? "Sí ✔" : "No"}
            </Text>

            {plan.price != null && (
              <Text size="sm">
                <b>Precio:</b> {formatCOP(plan.price)}
              </Text>
            )}

            <Group align="end" gap="sm" wrap="wrap">
              <DateInput
                label="Fecha de vencimiento"
                value={newUntil}
                onChange={setNewUntil}
                w={220}
                clearable
              />
              {/* <Button loading={updatingPlan} onClick={savePlanDate}>
                Guardar fecha
              </Button> */}
            </Group>

            {planMsg && (
              <Alert
                color={
                  planMsg.toLowerCase().includes("correcta") ? "green" : "red"
                }
              >
                {planMsg}
              </Alert>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
