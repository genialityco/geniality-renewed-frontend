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
  HoverCard,
  Divider,
  Chip,
  ThemeIcon,
  Box,
  rem,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import {
  FaArrowTurnDown,
  FaClipboard,
  FaCreditCard,
  FaEye,
  FaIdCard,
  FaLink,
  FaMoneyBill,
  FaRegCalendar,
  FaUser,
} from "react-icons/fa6";

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

/* =================== Utils =================== */

function getLast<T>(arr?: T[]): T | undefined {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return arr[arr.length - 1];
}

/** Devuelve el objeto "transacción" coherente para distintos formatos del snapshot:
 *  - payload.data.[id, status, payment_method, ...]     (formato 1)
 *  - payload.data.transaction.[...]                     (formato 2)
 *  - payload.transaction.[...]                          (formato 3)
 *  - payload ya es la transacción                       (fallback)
 */
function getTxFromSnapshotPayload(payload: any) {
  if (!payload) return undefined;

  const d = payload.data;
  // 1) payload.data directo
  if (d?.id && (d?.status || d?.payment_method || d?.amount_in_cents)) {
    return d;
  }
  // 2) payload.data.transaction
  if (d?.transaction) return d.transaction;
  // 3) payload.transaction raíz
  if (payload.transaction) return payload.transaction;
  // 4) payload = tx
  if (payload?.id && (payload?.status || payload?.payment_method))
    return payload;

  return undefined;
}

type ExtractedMethod = {
  method?: string; // CARD | PSE | NEQUI | ...
  brand?: string; // VISA, MASTERCARD...
  last4?: string;
  bank?: string; // nombre o código de banco (PSE)
};

function extractPaymentMethodFromRow(row: any): ExtractedMethod {
  // Directo si ya lo incluyes en la row
  const direct: ExtractedMethod | undefined = row?.paymentMethod || row?.method;
  if (direct?.method) return direct;

  const lastSnap = getLast(row?.wompi_snapshots);
  const tx =
    lastSnap && typeof lastSnap === "object" && "payload" in lastSnap
      ? getTxFromSnapshotPayload((lastSnap as any).payload)
      : undefined;
  const pm = tx?.payment_method || tx?.paymentMethod;
  if (!pm) return {};

  const type = String(pm?.type || tx?.payment_method_type || "").toUpperCase();

  if (type === "CARD") {
    return {
      method: "CARD",
      brand:
        pm?.extra?.brand || pm?.extra?.brand_name || pm?.brand || pm?.network,
      last4: pm?.extra?.last_four || pm?.extra?.last4 || pm?.last4,
    };
  }
  if (type === "PSE") {
    // Wompi a veces no trae 'bank', pero sí 'financial_institution_code'
    const bank =
      pm?.extra?.bank ||
      pm?.bank ||
      pm?.extra?.bank_name ||
      pm?.financial_institution ||
      pm?.financial_institution_name ||
      pm?.financial_institution_code;
    return { method: "PSE", bank };
  }

  return { method: type || undefined };
}

function extractStatusMessageFromRow(row: any): string | undefined {
  const direct =
    row?.statusMessage ||
    row?.status_message ||
    row?.gatewayMessage ||
    row?.message;
  if (direct) return String(direct);

  const lastSnap = getLast(row?.wompi_snapshots);
  const tx =
    lastSnap && typeof lastSnap === "object" && "payload" in lastSnap
      ? getTxFromSnapshotPayload((lastSnap as any).payload)
      : undefined;

  const msg =
    tx?.status_message ||
    tx?.statusMessage ||
    tx?.reason ||
    tx?.response?.message ||
    tx?.message;

  return msg ? String(msg) : undefined;
}

function extractPayerFromRow(row: any): {
  name?: string;
  email?: string;
  phone?: string;
  legalId?: string;
  legalIdType?: string;
} {
  // Intentamos obtener el customer_email directamente del rawWebhook
  const customerEmail = row?.rawWebhook?.data?.transaction?.customer_email;

  if (customerEmail) {
    return {
      email: customerEmail,
      // Dejamos los demás campos vacíos ya que solo queremos mostrar el email
      name: undefined,
      phone: undefined,
      legalId: undefined,
      legalIdType: undefined,
    };
  }

  // Si no existe rawWebhook, mantenemos la lógica original como fallback
  // Preferimos OrganizationUser.properties
  const props = row?.organizationUser?.properties || {};
  const nameOU = props.nombres || props.names || props.name;
  const emailOU = props.email;

  const lastSnap = getLast(row?.wompi_snapshots);
  const tx =
    lastSnap && typeof lastSnap === "object" && "payload" in lastSnap
      ? getTxFromSnapshotPayload((lastSnap as any).payload)
      : undefined;
  const pm = tx?.payment_method || tx?.paymentMethod;

  const emailTx = tx?.customer_email; // plano en tx
  const cd = tx?.customer_data || tx?.customerData || {};
  const billing = tx?.billing_data || tx?.billingData || {};

  // Para PSE a veces el doc viene en payment_method.user_legal_id
  const legalIdFromPm = pm?.user_legal_id;
  const legalIdTypeFromPm = pm?.user_legal_id_type;

  return {
    name: nameOU || cd?.full_name || cd?.name,
    email: emailOU || emailTx || cd?.email,
    phone: cd?.phone_number,
    legalId: billing?.legal_id || legalIdFromPm,
    legalIdType: billing?.legal_id_type || legalIdTypeFromPm,
  };
}

function KV({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text size="xs" c="dimmed" component="span">
        {label}:
      </Text>
      <Text
        size="sm"
        fw={500}
        ff={mono ? "monospace" : undefined}
        component="span"
      >
        {children}
      </Text>
    </Group>
  );
}

/** Valor con botón copiar minimalista */
function Copyable({
  value,
  truncateWidth = 260,
}: {
  value: string;
  truncateWidth?: number;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Code
        fz="xs"
        ff="monospace"
        px="xs"
        py={4}
        style={{ maxWidth: truncateWidth }}
      >
        <Text truncate>{value}</Text>
      </Code>
      <CopyButton value={value}>
        {({ copy, copied }) => (
          <Tooltip label={copied ? "Copiado" : "Copiar"} withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={copy}
              aria-label="Copiar"
            >
              <FaClipboard size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

function getBadgeColor(status: string) {
  if (status === "APPROVED") return "green";
  if (status === "PENDING" || status === "CREATED") return "yellow";
  if (status === "DECLINED" || status === "VOIDED" || status === "ERROR")
    return "red";
  return "gray";
}

function formatCOP(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP" });
}

/** ========= Helpers para el resumen del modal ========= */

type TxSummary = {
  id?: string;
  status?: string;
  statusMessage?: string;
  amountInCents?: number;
  currency?: string;
  reference?: string;
  createdAt?: string | Date;
  finalizedAt?: string | Date;
  paymentMethod?: ExtractedMethod & {
    rawType?: string;
    installments?: number | string;
  };
  payer?: {
    name?: string;
    email?: string;
    phone?: string;
    legalId?: string;
    legalIdType?: string;
  };
  redirectUrl?: string;
  bankExtra?: Record<string, any>;
};

function buildTxSummaryFromSnapshot(snap?: any): TxSummary | undefined {
  if (!snap) return undefined;
  const tx = getTxFromSnapshotPayload(snap.payload);
  if (!tx) return undefined;

  const pm = tx?.payment_method || tx?.paymentMethod;
  const methodExtract = extractPaymentMethodFromRow({
    wompi_snapshots: [snap],
  });

  const cd = tx?.customer_data || tx?.customerData || {};
  const billing = tx?.billing_data || tx?.billingData || {};
  const payer = {
    name: cd?.full_name || cd?.name,
    email: tx?.customer_email || cd?.email,
    phone: cd?.phone_number,
    legalId: billing?.legal_id || pm?.user_legal_id,
    legalIdType: billing?.legal_id_type || pm?.user_legal_id_type,
  };

  const bankExtra =
    methodExtract.method === "PSE"
      ? {
          ticket_id: pm?.extra?.ticket_id,
          traceability_code: pm?.extra?.traceability_code,
          bank_processing_date: pm?.extra?.bank_processing_date,
          return_code: pm?.extra?.return_code,
          financial_institution_code:
            pm?.financial_institution_code ||
            pm?.extra?.financial_institution_code,
          async_payment_url: pm?.extra?.async_payment_url,
        }
      : undefined;

  return {
    id: tx?.id,
    status: tx?.status,
    statusMessage:
      tx?.status_message ||
      tx?.statusMessage ||
      tx?.reason ||
      tx?.response?.message ||
      tx?.message,
    amountInCents: tx?.amount_in_cents,
    currency: tx?.currency,
    reference: tx?.reference,
    createdAt: tx?.created_at,
    finalizedAt: tx?.finalized_at,
    paymentMethod: {
      ...methodExtract,
      rawType: pm?.type || tx?.payment_method_type,
      installments: pm?.installments,
    },
    payer,
    redirectUrl: tx?.redirect_url,
    bankExtra,
  };
}

/* ============================================ */

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

  // Modal RAW / resumen
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
      console.log(res);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar pagos.");
    } finally {
      setLoading(false);
    }
  }, [organizationId, query, status, page, dateFrom, dateTo]);

  useEffect(() => {
    void doSearch();
  }, [doSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Abrir modal de PLAN y traer el plan completo por OrganizationUserId
  const openPlanModal = useCallback(async (row: PaymentRequestRow) => {
    setPlanOpen(true);
    setPlan(null);
    setPlanMsg(null);
    setLoadingPlan(true);
    planSourceRow.current = row;

    try {
      const ouId = (row as any)?.organizationUser?.user_id as string;
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

  const tableRows = useMemo(
    () =>
      rows.map((r) => {
        const statusMessage = extractStatusMessageFromRow(r);
        const pm = extractPaymentMethodFromRow(r);
        const payer = extractPayerFromRow(r);

        const badgeColor = getBadgeColor(r.status);

        return (
          <Table.Tr key={r.reference}>
            {/* Columna única con toda la información del pago */}
            <Table.Td>
              <Paper
                withBorder
                radius="md"
                p="sm"
                style={{ background: "var(--mantine-color-body)" }}
              >
                <Stack gap="xs">
                  {/* HEADER: Estado + Monto + Moneda + Método */}
                  <Group gap="sm" wrap="wrap" align="center">
                    {statusMessage ? (
                      <Tooltip label={statusMessage} multiline w={320}>
                        <Badge color={badgeColor} variant="light">
                          {r.status}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge color={badgeColor} variant="light">
                        {r.status}
                      </Badge>
                    )}
                    <Group gap="xs" wrap="nowrap">
                      <ThemeIcon size={20} variant="light" radius="xl">
                        <FaMoneyBill size={12} />
                      </ThemeIcon>
                      <Text fw={800}>{formatCOP(r.amount)}</Text>
                    </Group>

                    <Text size="xs" c="dimmed">
                      {r.currency}
                    </Text>

                    {pm?.method && (
                      <Badge variant="outline" radius="sm">
                        <Group gap={6}>
                          <FaCreditCard size={12} />
                          <Text size="xs">
                            {pm.method}
                            {pm.brand ? ` · ${pm.brand}` : ""}
                            {pm.last4 ? ` · ****${pm.last4}` : ""}
                            {pm.bank ? ` · ${pm.bank}` : ""}
                          </Text>
                        </Group>
                      </Badge>
                    )}
                  </Group>

                  {/* GRID principal */}
                  <Box
                    style={{
                      display: "grid",
                      gap: rem(8),
                      gridTemplateColumns:
                        "minmax(260px, 1fr) minmax(260px, 1fr)",
                    }}
                  >
                    {/* Columna izquierda */}
                    <Stack gap={6}>
                      <KV label="Ref">
                        <Copyable value={r.reference} />
                      </KV>

                      <KV label="Tx">
                        {(r as any)?.transactionId ? (
                          <Copyable value={(r as any).transactionId} />
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </KV>

                      <KV label="Pagador">
                        <Group gap={6}>
                          <FaUser
                            size={12}
                            color="var(--mantine-color-dimmed)"
                          />
                          <Text size="sm">
                            {payer.name || "—"}
                            {payer.email ? ` · ${payer.email}` : ""}
                            {payer.phone ? ` · ${payer.phone}` : ""}
                          </Text>
                        </Group>
                      </KV>

                      {(payer.legalId || payer.legalIdType) && (
                        <KV label="Doc">
                          <Group gap={6}>
                            <FaIdCard
                              size={12}
                              color="var(--mantine-color-dimmed)"
                            />
                            <Text size="sm">
                              {payer.legalIdType || "ID"}
                              {payer.legalId ? ` · ${payer.legalId}` : ""}
                            </Text>
                          </Group>
                        </KV>
                      )}
                    </Stack>

                    {/* Columna derecha */}
                    <Stack gap={6}>
                      <KV label="Usuario">
                        <Group gap={6} wrap="wrap">
                          <Text size="sm">
                            {r.organizationUser?.properties?.names
                              ? r.organizationUser.properties.names
                              : `${
                                  r.organizationUser?.properties?.nombres || ""
                                } ${
                                  r.organizationUser?.properties?.apellidos ||
                                  ""
                                }`}
                            {" - "}
                            {r.organizationUser?.properties?.email || "—"}
                            {" - "}
                            DNI{" · "}
                            {r.organizationUser?.properties?.ID || "—"}
                          </Text>
                        </Group>
                      </KV>

                      {(r as any)?.paymentPlan ? (
                        <>
                          <KV label="Plan">
                            {(r as any)?.paymentPlan?.payment_request_id
                              ? "link a PR ✔"
                              : "sin link"}
                          </KV>
                          <KV label="Vence">
                            <Group gap={6}>
                              <FaRegCalendar
                                size={12}
                                color="var(--mantine-color-dimmed)"
                              />
                              <Text size="sm">
                                {new Date(
                                  (r as any).paymentPlan.date_until
                                ).toLocaleDateString()}
                              </Text>
                            </Group>
                          </KV>
                        </>
                      ) : (
                        <Text size="sm" c="dimmed">
                          — (sin plan)
                        </Text>
                      )}
                    </Stack>
                  </Box>

                  {/* Mensaje de estado (expandible) */}
                  {statusMessage && (
                    <HoverCard width={520} shadow="md" openDelay={150}>
                      <HoverCard.Target>
                        <Text
                          size="xs"
                          c="dimmed"
                          lineClamp={2}
                          style={{ cursor: "help", maxWidth: 960 }}
                        >
                          {statusMessage}
                        </Text>
                      </HoverCard.Target>
                      <HoverCard.Dropdown>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {statusMessage}
                        </Text>
                      </HoverCard.Dropdown>
                    </HoverCard>
                  )}

                  {/* Fechas */}
                  <Divider my={4} />
                  <Group gap="md" wrap="wrap">
                    <KV label="Creado">
                      {new Date(r.createdAt).toLocaleString()}
                    </KV>
                    <KV label="Actualizado">
                      {new Date(r.updatedAt).toLocaleString()}
                    </KV>
                  </Group>
                </Stack>
              </Paper>
            </Table.Td>

            {/* Acciones */}
            <Table.Td width={140}>
              <Group gap="xs" justify="flex-start">
                <Tooltip label="Ver raw (resumen + JSON)">
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

                {(r as any)?.organizationUser?._id && (
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
            onChange={(value) => {
              setPage(1);
              setStatus(value ?? "ALL");
            }}
            w={180}
            searchable
            allowDeselect={false}
            comboboxProps={{
              withinPortal: true,
              zIndex: 4000,
              position: "bottom-start",
            }}
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

        <Table
          striped
          highlightOnHover
          withColumnBorders
          mt="md"
          horizontalSpacing="md"
          verticalSpacing="sm"
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Pago</Table.Th>
              <Table.Th style={{ width: 140 }}>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={2}>
                  <Group justify="center" py="lg">
                    <Loader />
                  </Group>
                </Table.Td>
              </Table.Tr>
            ) : tableRows.length ? (
              tableRows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={2}>
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

      {/* Modal: snapshots (Resumen + JSON crudo) */}
      <Modal
        opened={rawOpen}
        onClose={() => setRawOpen(false)}
        title="Detalle de Wompi (Resumen + RAW)"
        size="xl"
      >
        {!rawRef.current ? (
          <Text c="dimmed">Sin datos</Text>
        ) : (
          <Stack gap="md">
            {/* --- Resumen legible del último snapshot --- */}
            {(() => {
              const lastSnap = getLast(
                (rawRef.current as any)?.wompi_snapshots
              );
              const sum = buildTxSummaryFromSnapshot(lastSnap);
              if (!sum) {
                return <Text c="dimmed">No hay datos para el resumen.</Text>;
              }

              return (
                <Stack gap="xs">
                  <Group gap="xs" wrap="wrap">
                    <Badge variant="light">{sum.status || "—"}</Badge>
                    {sum.paymentMethod?.method && (
                      <Badge variant="outline">
                        {sum.paymentMethod.method}
                        {sum.paymentMethod.brand
                          ? ` · ${sum.paymentMethod.brand}`
                          : ""}
                        {sum.paymentMethod.last4
                          ? ` · ****${sum.paymentMethod.last4}`
                          : ""}
                        {sum.paymentMethod.bank
                          ? ` · ${sum.paymentMethod.bank}`
                          : ""}
                      </Badge>
                    )}
                    {typeof sum.paymentMethod?.installments !== "undefined" && (
                      <Chip size="xs" checked={false} onChange={() => {}}>
                        cuotas: {String(sum.paymentMethod.installments)}
                      </Chip>
                    )}
                  </Group>

                  <Group gap="md" wrap="wrap">
                    <Text size="sm">
                      <b>Monto:</b>{" "}
                      {typeof sum.amountInCents === "number"
                        ? formatCOP((sum.amountInCents || 0) / 100)
                        : "—"}{" "}
                      <Text component="span" size="xs" c="dimmed">
                        ({sum.currency || "—"})
                      </Text>
                    </Text>
                    <Text size="sm">
                      <b>Ref:</b> {sum.reference || "—"}
                    </Text>
                    <Text size="sm">
                      <b>Tx:</b> {sum.id || "—"}
                    </Text>
                  </Group>

                  <Group gap="md" wrap="wrap">
                    <Text size="sm">
                      <b>Creado:</b>{" "}
                      {sum.createdAt
                        ? new Date(sum.createdAt).toLocaleString()
                        : "—"}
                    </Text>
                    <Text size="sm">
                      <b>Finalizado:</b>{" "}
                      {sum.finalizedAt
                        ? new Date(sum.finalizedAt).toLocaleString()
                        : "—"}
                    </Text>
                  </Group>

                  <Group gap="md" wrap="wrap">
                    <Text size="sm">
                      <b>Pagador:</b> {sum.payer?.name || "—"}
                      {sum.payer?.email ? ` · ${sum.payer.email}` : ""}
                      {sum.payer?.phone ? ` · ${sum.payer.phone}` : ""}
                    </Text>

                    {(sum.payer?.legalId || sum.payer?.legalIdType) && (
                      <Text size="sm">
                        <b>Doc:</b> {sum.payer?.legalIdType || "ID"}
                        {sum.payer?.legalId ? ` · ${sum.payer.legalId}` : ""}
                      </Text>
                    )}
                  </Group>

                  {sum.statusMessage && (
                    <Alert variant="light" color="gray">
                      <Text size="sm">
                        <b>Mensaje de estado:</b> {sum.statusMessage}
                      </Text>
                    </Alert>
                  )}

                  {sum.redirectUrl && (
                    <Text size="xs" c="dimmed">
                      <b>Redirect URL:</b> {sum.redirectUrl}
                    </Text>
                  )}

                  {sum.bankExtra && (
                    <Stack gap={2}>
                      <Text size="xs" c="dimmed">
                        <b>Detalles PSE:</b>
                      </Text>
                      <Code block>
                        {JSON.stringify(
                          Object.fromEntries(
                            Object.entries(sum.bankExtra).filter(
                              ([, v]) => v !== undefined && v !== null
                            )
                          ),
                          null,
                          2
                        )}
                      </Code>
                    </Stack>
                  )}
                </Stack>
              );
            })()}

            {/* --- RAW (todos los snapshots) --- */}
            <Stack gap="xs">
              <Text size="sm">
                <b>reference:</b> {(rawRef.current as any).reference}
              </Text>
              <Text size="sm">
                <b>transactionId:</b>{" "}
                {(rawRef.current as any)?.transactionId || "—"}
              </Text>
              <Text size="sm">
                <b>snapshots:</b>{" "}
                {(rawRef.current as any)?.wompi_snapshots?.length || 0}
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
                  (rawRef.current as any).wompi_snapshots?.map(
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

              {(rawRef.current as any).rawWebhook && (
                <>
                  <Text size="sm">
                    <b>rawWebhook (legacy):</b>
                  </Text>
                  <Code block>
                    {JSON.stringify(
                      (rawRef.current as any).rawWebhook,
                      null,
                      2
                    )}
                  </Code>
                </>
              )}
            </Stack>
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
              {/* Aquí podrías añadir un botón para persistir la nueva fecha,
                  si quieres hacerlo desde esta vista */}
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
