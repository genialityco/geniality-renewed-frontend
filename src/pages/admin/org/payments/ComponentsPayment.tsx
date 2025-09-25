import {
  FaMoneyBill,
  FaUser,
  FaIdCard,
  FaRegCalendar,
  FaEye,
  FaLink,
  FaArrowTurnDown,
} from "react-icons/fa6";
import {
  Table,
  Paper,
  Stack,
  Group,
  Text,
  ThemeIcon,
  Box,
  rem,
  HoverCard,
  Divider,
  ActionIcon,
  Tooltip,
  TextInput,
  Select,
  Button,
  Loader,
  Pagination,
  Modal,
  Badge,
  Alert,
  Code,
  Chip,
  CopyButton,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { PaymentPlan } from "../../../../services/types";
import type { PaymentRequestRow } from "../../../../services/paymentRequestsService";
import { PaymentBadges, KV, Copyable } from "./CommonPayment";
import {
  extractPayerFromRow,
  extractPaymentMethodFromRow,
  extractStatusMessageFromRow,
  formatCOP,
  buildTxSummaryFromSnapshot,
  getLast,
  PaymentFilters as PaymentFiltersType,
  STATUS_OPTIONS,
} from "./UtilsPayment";

type FiltersProps = {
  filters: PaymentFiltersType;
  loading: boolean;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateFromChange: (value: Date | null) => void;
  onDateToChange: (value: Date | null) => void;
  onSearch: () => void;
};

type RowProps = {
  row: PaymentRequestRow;
  onViewRaw: (row: PaymentRequestRow) => void;
  onViewPlan: (row: PaymentRequestRow) => void;
};

type TableProps = {
  rows: PaymentRequestRow[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onViewRaw: (row: PaymentRequestRow) => void;
  onViewPlan: (row: PaymentRequestRow) => void;
};

type RawModalProps = {
  opened: boolean;
  onClose: () => void;
  sourceRow: PaymentRequestRow | null;
};

type PaymentPlanProps = {
  opened: boolean;
  onClose: () => void;
  loading: boolean;
  plan: PaymentPlan | null;
  planMsg: string | null;
  newUntil: Date | null;
  onNewUntilChange: (value: Date | null) => void;
};

export function PaymentFilters({
  filters,
  loading,
  onQueryChange,
  onStatusChange,
  onDateFromChange,
  onDateToChange,
  onSearch,
}: FiltersProps) {
  return (
    <Paper withBorder p="sm" radius="md">
      <Group wrap="wrap" gap="sm" align="end">
        <TextInput
          label="Buscar"
          description="Referencia, email, nombre, tx…"
          placeholder="membresia-... o correo"
          value={filters.query}
          onChange={(e) => onQueryChange(e.currentTarget.value)}
          w={280}
        />

        <Select
          label="Estado"
          data={STATUS_OPTIONS}
          value={filters.status}
          onChange={(value) => onStatusChange(value ?? "ALL")}
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
          value={filters.dateFrom}
          onChange={onDateFromChange}
          w={180}
          clearable
        />

        <DateInput
          label="Hasta"
          value={filters.dateTo}
          onChange={onDateToChange}
          w={180}
          clearable
        />

        <Button
          leftSection={<FaArrowTurnDown size={16} />}
          variant="light"
          onClick={onSearch}
          loading={loading}
        >
          Actualizar
        </Button>
      </Group>
    </Paper>
  );
}

export function PaymentRow({ row, onViewRaw, onViewPlan }: RowProps) {
  const statusMessage = extractStatusMessageFromRow(row);
  const pm = extractPaymentMethodFromRow(row);
  const payer = extractPayerFromRow(row);

  return (
    <Table.Tr key={row.reference}>
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
              <PaymentBadges
                status={row.status}
                statusMessage={statusMessage}
                paymentMethod={pm}
              />

              <Group gap="xs" wrap="nowrap">
                <ThemeIcon size={20} variant="light" radius="xl">
                  <FaMoneyBill size={12} />
                </ThemeIcon>
                <Text fw={800}>{formatCOP(row.amount)}</Text>
              </Group>

              <Text size="xs" c="dimmed">
                {row.currency}
              </Text>
            </Group>

            {/* GRID principal */}
            <Box
              style={{
                display: "grid",
                gap: rem(8),
                gridTemplateColumns: "minmax(260px, 1fr) minmax(260px, 1fr)",
              }}
            >
              {/* Columna izquierda */}
              <Stack gap={6}>
                <KV label="Ref">
                  <Copyable value={row.reference} />
                </KV>

                <KV label="Tx">
                  {(row as any)?.transactionId ? (
                    <Copyable value={(row as any).transactionId} />
                  ) : (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  )}
                </KV>

                <KV label="Pagador">
                  <Group gap={6}>
                    <FaUser size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="sm">
                      {payer.email || "—"} {payer.name || "—"}
                    </Text>
                  </Group>
                </KV>

                {(payer.legalId || payer.legalIdType) && (
                  <KV label="Doc">
                    <Group gap={6}>
                      <FaIdCard size={12} color="var(--mantine-color-dimmed)" />
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
                      {row.organizationUser?.properties?.names
                        ? row.organizationUser.properties.names
                        : `${row.organizationUser?.properties?.nombres || ""} ${
                            row.organizationUser?.properties?.apellidos || ""
                          }`}
                      {" - "}
                      {row.organizationUser?.properties?.email || "—"}
                      {" - "}
                      DNI{" · "}
                      {row.organizationUser?.properties?.ID || "—"}
                    </Text>
                  </Group>
                </KV>

                {(row as any)?.paymentPlan ? (
                  <>
                    <KV label="Plan">
                      {(row as any)?.paymentPlan?.payment_request_id
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
                            (row as any).paymentPlan.date_until
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
              <KV label="Creado">{new Date(row.createdAt).toLocaleString()}</KV>
              <KV label="Actualizado">
                {new Date(row.updatedAt).toLocaleString()}
              </KV>
            </Group>
          </Stack>
        </Paper>
      </Table.Td>

      {/* Acciones */}
      <Table.Td width={140}>
        <Group gap="xs" justify="flex-start">
          <Tooltip label="Ver raw (resumen + JSON)">
            <ActionIcon variant="light" onClick={() => onViewRaw(row)}>
              <FaEye size={16} />
            </ActionIcon>
          </Tooltip>

          {(row as any)?.organizationUser?._id && (
            <Tooltip label="Ver plan">
              <ActionIcon variant="subtle" onClick={() => onViewPlan(row)}>
                <FaLink size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

export function PaymentTable({
  rows,
  loading,
  page,
  totalPages,
  onPageChange,
  onViewRaw,
  onViewPlan,
}: TableProps) {
  return (
    <>
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
          ) : rows.length ? (
            rows.map((row) => (
              <PaymentRow
                key={row.reference}
                row={row}
                onViewRaw={onViewRaw}
                onViewPlan={onViewPlan}
              />
            ))
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
        <Pagination total={totalPages} value={page} onChange={onPageChange} />
      </Group>
    </>
  );
}

// components/PaymentRawModal.tsx

export function PaymentRawModal({ opened, onClose, sourceRow }: RawModalProps) {
  if (!sourceRow) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title="Detalle de Wompi (Resumen + RAW)"
        size="xl"
      >
        <Text c="dimmed">Sin datos</Text>
      </Modal>
    );
  }

  const lastSnap = getLast((sourceRow as any)?.wompi_snapshots);
  const sum = buildTxSummaryFromSnapshot(lastSnap);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Detalle de Wompi (Resumen + RAW)"
      size="xl"
    >
      <Stack gap="md">
        {/* --- Resumen legible del último snapshot --- */}
        {!sum ? (
          <Text c="dimmed">No hay datos para el resumen.</Text>
        ) : (
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
                  {sum.paymentMethod.bank ? ` · ${sum.paymentMethod.bank}` : ""}
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
                {sum.createdAt ? new Date(sum.createdAt).toLocaleString() : "—"}
              </Text>
              <Text size="sm">
                <b>Finalizado:</b>{" "}
                {sum.finalizedAt
                  ? new Date(sum.finalizedAt).toLocaleString()
                  : "—"}
              </Text>
            </Group>

            {/* SECCIÓN DE PAGADOR MÁS PROMINENTE */}
            <Paper
              withBorder
              p="sm"
              radius="md"
              bg="var(--mantine-color-blue-0)"
            >
              <Text size="sm" fw={600} mb="xs">
                Información del Pagador
              </Text>
              <Stack gap={4}>
                {sum.payer?.name && (
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      Nombre completo:
                    </Text>
                    <Text size="sm">{sum.payer.name}</Text>
                  </Group>
                )}

                {sum.payer?.email && (
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      Email:
                    </Text>
                    <Text size="sm">{sum.payer.email}</Text>
                  </Group>
                )}

                {sum.payer?.phone && (
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      Teléfono:
                    </Text>
                    <Text size="sm">{sum.payer.phone}</Text>
                  </Group>
                )}

                {(sum.payer?.legalId || sum.payer?.legalIdType) && (
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      Documento:
                    </Text>
                    <Text size="sm">
                      {sum.payer?.legalIdType || "ID"}
                      {sum.payer?.legalId ? ` · ${sum.payer.legalId}` : ""}
                    </Text>
                  </Group>
                )}
              </Stack>
            </Paper>

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
        )}

        {/* --- RAW (todos los snapshots) --- */}
        <Stack gap="xs">
          <Text size="sm">
            <b>reference:</b> {(sourceRow as any).reference}
          </Text>
          <Text size="sm">
            <b>transactionId:</b> {(sourceRow as any)?.transactionId || "—"}
          </Text>
          <Text size="sm">
            <b>snapshots:</b> {(sourceRow as any)?.wompi_snapshots?.length || 0}
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
              (sourceRow as any).wompi_snapshots?.map(
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

          {(sourceRow as any).rawWebhook && (
            <>
              <Text size="sm">
                <b>rawWebhook (legacy):</b>
              </Text>
              <Code block>
                {JSON.stringify((sourceRow as any).rawWebhook, null, 2)}
              </Code>
            </>
          )}
        </Stack>
      </Stack>
    </Modal>
  );
}

// components/PaymentPlanModal.tsx

export function PaymentPlanModal({
  opened,
  onClose,
  loading,
  plan,
  planMsg,
  newUntil,
  onNewUntilChange,
}: PaymentPlanProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Detalle de Payment Plan"
      size="lg"
    >
      {loading ? (
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
            <Text>
              <b>Fecha de vencimiento:</b>{" "}
              {plan.date_until
                ? new Date(plan.date_until).toLocaleDateString()
                : "—"}
            </Text>

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
  );
}
