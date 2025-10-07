// src/components/UserInfoModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Text,
  Group,
  Stack,
  Badge,
  Divider,
  Paper,
  Title,
  ActionIcon,
  Tooltip,
  ScrollArea,
  Box,
  Flex,
  Loader,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import {
  FaClipboard,
  FaCopy,
  FaUser,
  FaCalendarAlt,
  FaInfoCircle,
} from "react-icons/fa";
import { OrganizationUser, PaymentPlan } from "../../../services/types";
import {
  searchPaymentRequests,
  type PaymentRequestRow,
} from "../../../services/paymentRequestsService";
import { useOrganization } from "../../../context/OrganizationContext";

interface Props {
  user: OrganizationUser | null;
  isOpen: boolean;
  onClose: () => void;
  userProperties: Array<{
    name: string;
    label: string;
    type: string;
    visible?: boolean;
  }>;
}

// === Componente para copiar texto ===
const CopyButton = React.memo(function CopyButton({
  text,
  label = "Copiar",
}: {
  text: string;
  label?: string;
}) {
  const clipboard = useClipboard({ timeout: 1000 });

  return (
    <Tooltip label={clipboard.copied ? "¡Copiado!" : label} withArrow>
      <ActionIcon
        variant="subtle"
        size="sm"
        color={clipboard.copied ? "teal" : "gray"}
        onClick={() => clipboard.copy(text)}
      >
        {clipboard.copied ? <FaCopy size={12} /> : <FaClipboard size={12} />}
      </ActionIcon>
    </Tooltip>
  );
});

// === Sanitización HTML ===
function stripHtml(input: string): string {
  const withoutTags = input.replace(/<\/?[^>]+(>|$)/g, "");
  return withoutTags.replace(/&nbsp;/g, " ").trim();
}

// === Type guard de PaymentPlan ===
function isPaymentPlan(obj: unknown): obj is PaymentPlan {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.days === "number" &&
    typeof o.price === "number" &&
    typeof o.date_until === "string" &&
    !!o.date_until
  );
}

// === Formateador de fecha ===
const dtfCO = new Intl.DateTimeFormat("es-CO", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Bogota",
});

// === Componente de fila de propiedad ===
const PropertyRow = React.memo(function PropertyRow({
  label,
  value,
  showCopyButton = false,
  copyLabel = "Copiar",
}: {
  label: string;
  value: string;
  showCopyButton?: boolean;
  copyLabel?: string;
}) {
  return (
    <Flex
      align="flex-start"
      gap="md"
      py="xs"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-2)",
      }}
    >
      {/* Columna izquierda - Título (60%) */}
      <Box style={{ width: "60%", flex: 1 }}>
        <Text size="sm" fw={500} c="gray.7" style={{ lineHeight: 1.4 }}>
          {label}:
        </Text>
      </Box>

      {/* Columna derecha - Valor (40%) */}
      <Box style={{ width: "40%", minWidth: "100px", flexShrink: 0 }}>
        <Flex align="flex-start" gap="xs" justify="flex-end">
          <Text
            size="sm"
            style={{
              wordBreak: "break-word",
              lineHeight: 1.4,
              textAlign: "right",
              flex: 1,
            }}
          >
            {value}
          </Text>
          {showCopyButton && (
            <Box style={{ flexShrink: 0 }}>
              <CopyButton text={value} label={copyLabel} />
            </Box>
          )}
        </Flex>
      </Box>
    </Flex>
  );
});

// === Color por estado de pago ===
function statusColor(s: PaymentRequestRow["status"]) {
  switch (s) {
    case "APPROVED":
      return "green";
    case "PENDING":
      return "yellow";
    case "CREATED":
      return "blue";
    case "DECLINED":
    case "VOIDED":
    case "ERROR":
      return "red";
    default:
      return "gray";
  }
}

export default function UserInfoModal({
  user,
  isOpen,
  onClose,
  userProperties,
}: Props) {
  if (!user) return null;
  const u = user as OrganizationUser; // ← garantiza no nulo para TS después del early return

  const { organization } = useOrganization();
  const organizationId = organization?._id || "";

  const [payLoading, setPayLoading] = useState(false);
  const [payItems, setPayItems] = useState<PaymentRequestRow[]>([]);
  const [payTotal, setPayTotal] = useState(0);

  const rawPlan = u.payment_plan_id;
  const planInfo = isPaymentPlan(rawPlan) ? rawPlan : undefined;
  const properties = u.properties || {};

  // Verificar si el plan está vencido
  let isExpired = false;
  let planDate: Date | null = null;
  if (planInfo) {
    planDate = new Date(planInfo.date_until);
    isExpired = planDate < new Date();
  }

  // Filtrar por "visible" (mostrar si visible !== false)
  const visibleUserProps = (userProperties ?? []).filter(
    (p) => p.visible !== false
  );

  // Obtener userId string desde OrganizationUser.user_id (puede ser string u objeto)
  const userIdString: string | null = useMemo(() => {
    const ref: any = u.user_id;
    if (!ref) return null;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && ref._id) return String(ref._id);
    return null;
  }, [u.user_id]);

  // Cargar intentos de pago (payment-requests) asociados
  useEffect(() => {
    let mounted = true;
    async function loadPaymentRequests() {
      if (!isOpen || !organizationId) return;
      setPayLoading(true);
      try {
        const q =
          userIdString ||
          properties.email ||
          properties.correo ||
          String(u._id);

        const { items, total } = await searchPaymentRequests({
          organizationId,
          q,
          page: 1,
          pageSize: 50,
        });

        if (mounted) {
          setPayItems(items as PaymentRequestRow[]);
          setPayTotal(total ?? items?.length ?? 0);
        }
      } catch {
        if (mounted) {
          setPayItems([]);
          setPayTotal(0);
        }
      } finally {
        if (mounted) setPayLoading(false);
      }
    }
    loadPaymentRequests();
    return () => {
      mounted = false;
    };
  }, [
    isOpen,
    organizationId,
    userIdString,
    u._id,
    properties.email,
    properties.correo,
  ]);

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="sm">
          <FaUser size={20} color="var(--mantine-color-blue-6)" />
          <Title order={3}>Información del Usuario</Title>
        </Group>
      }
      size="xl"
      padding="xl"
      styles={{
        content: {
          borderRadius: "12px",
        },
      }}
    >
      <ScrollArea.Autosize mah="75vh">
        <Stack gap="lg">
          {/* Información básica */}
          <Paper withBorder p="lg" radius="md">
            <Group justify="space-between" mb="md">
              <Text size="lg" fw={600} c="gray.8">
                Datos Básicos
              </Text>
              <Badge variant="light" color="blue" size="sm">
                ID: {String(u._id)}
              </Badge>
            </Group>
            <Divider mb="lg" />

            <Stack gap="xs">
              {visibleUserProps.length === 0 && (
                <Text size="sm" c="gray.6">
                  No hay propiedades visibles para este usuario.
                </Text>
              )}

              {visibleUserProps.map((prop) => {
                const name = String(prop.name);
                const rawValue = properties[name] ?? "";

                // Si el valor es nulo/indefinido/empty string, no renderizamos la fila
                if (
                  rawValue === null ||
                  rawValue === undefined ||
                  rawValue === ""
                )
                  return null;

                const cleanValue = stripHtml(String(rawValue));
                let displayValue = "";

                // Formatear según el tipo
                if (prop.type === "boolean") {
                  const v = String(cleanValue).toLowerCase();
                  displayValue = v === "true" || v === "1" ? "Sí" : "No";
                } else if (prop.type === "email") {
                  displayValue = cleanValue;
                } else {
                  displayValue = cleanValue;
                }

                // Si tras limpiar queda vacío, no mostramos
                if (!displayValue) return null;

                const shouldShowCopy =
                  prop.type === "email" || cleanValue.length > 20;
                const copyLabel =
                  prop.type === "email" ? "Copiar email" : "Copiar texto";

                return (
                  <PropertyRow
                    key={name}
                    label={prop.label}
                    value={displayValue}
                    showCopyButton={shouldShowCopy}
                    copyLabel={copyLabel}
                  />
                );
              })}
            </Stack>
          </Paper>

          {/* Información del plan */}
          <Paper withBorder p="lg" radius="md">
            <Group justify="space-between" mb="md">
              <Text size="lg" fw={600} c="gray.8">
                Plan de Pago
              </Text>
              <FaCalendarAlt size={16} color="var(--mantine-color-blue-6)" />
            </Group>
            <Divider mb="lg" />

            {planInfo ? (
              <Stack gap="xs">
                <Flex
                  align="flex-start"
                  gap="md"
                  py="xs"
                  style={{
                    borderBottom: "1px solid var(--mantine-color-gray-2)",
                  }}
                >
                  <Box style={{ width: "80%", flex: 1 }}>
                    <Text size="sm" fw={500} c="gray.7">
                      Estado:
                    </Text>
                  </Box>
                  <Box
                    style={{ width: "20%", minWidth: "100px", flexShrink: 0 }}
                  >
                    <Flex justify="flex-end">
                      <Badge
                        variant="light"
                        color={isExpired ? "red" : "green"}
                        size="md"
                      >
                        {isExpired ? "⚠️ Vencido" : "✅ Activo"}
                      </Badge>
                    </Flex>
                  </Box>
                </Flex>

                <PropertyRow label="Duración" value={`${planInfo.days} días`} />

                <PropertyRow
                  label="Precio"
                  value={`$${planInfo.price.toLocaleString("es-CO")}`}
                />

                <PropertyRow
                  label="Fecha de vencimiento"
                  value={planDate ? dtfCO.format(planDate) : ""}
                  showCopyButton={!!planDate}
                  copyLabel="Copiar fecha"
                />

                {isExpired && (
                  <Box mt="md" ta="center">
                    <Badge variant="filled" color="red" size="lg">
                      <FaInfoCircle style={{ marginRight: 4 }} />
                      Este plan ha vencido
                    </Badge>
                  </Box>
                )}
              </Stack>
            ) : (
              <Box py="xl" ta="center">
                <Stack align="center" gap="sm">
                  <Badge variant="light" color="gray" size="xl">
                    Sin plan asignado
                  </Badge>
                  <Text size="sm" c="gray.6" ta="center">
                    Este usuario no tiene un plan de pago activo
                  </Text>
                </Stack>
              </Box>
            )}
          </Paper>

          {/* Intentos de pago (Payment Requests) */}
          <Paper withBorder p="lg" radius="md">
            <Group justify="space-between" mb="md">
              <Text size="lg" fw={600} c="gray.8">
                Intentos de Pago
              </Text>
              {payLoading ? (
                <Loader size="sm" />
              ) : (
                <Badge variant="light" color="gray">
                  {payTotal} registro{payTotal === 1 ? "" : "s"}
                </Badge>
              )}
            </Group>
            <Divider mb="lg" />

            {payLoading ? (
              <Box py="xl" ta="center">
                <Loader />
              </Box>
            ) : payItems.length === 0 ? (
              <Text size="sm" c="gray.6">
                No se encontraron intentos de pago asociados.
              </Text>
            ) : (
              <Stack gap="xs">
                {payItems.map((row) => {
                  const created = row.createdAt
                    ? dtfCO.format(new Date(row.createdAt))
                    : "";
                  const updated = row.updatedAt
                    ? dtfCO.format(new Date(row.updatedAt))
                    : "";
                  return (
                    <Box
                      key={`${row.reference}-${row.createdAt}`}
                      p="sm"
                      style={{
                        border: "1px solid var(--mantine-color-gray-2)",
                        borderRadius: 8,
                      }}
                    >
                      <Group justify="space-between" mb={6}>
                        <Group gap="xs">
                          <Badge
                            variant="light"
                            color={statusColor(row.status)}
                          >
                            {row.status}
                          </Badge>
                          <Text size="sm" c="gray.7">
                            Ref:&nbsp;<strong>{row.reference}</strong>
                          </Text>
                          <CopyButton text={row.reference} label="Copiar ref" />
                        </Group>
                        {row.transactionId && (
                          <Group gap="xs">
                            <Text size="sm" c="gray.7">
                              Tx:&nbsp;<strong>{row.transactionId}</strong>
                            </Text>
                            <CopyButton
                              text={row.transactionId}
                              label="Copiar Tx"
                            />
                          </Group>
                        )}
                      </Group>

                      <Group justify="space-between">
                        <Text size="sm">
                          Monto:&nbsp;
                          <strong>
                            ${row.amount.toLocaleString("es-CO")}{" "}
                            {row.currency ?? "COP"}
                          </strong>
                        </Text>
                        <Text size="xs" c="gray.6">
                          Creado: {created} · Actualizado: {updated}
                        </Text>
                      </Group>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}
