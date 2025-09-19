// src/components/UserInfoModal.tsx
import React from "react";
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
      {/* Columna izquierda - Título (80%) */}
      <Box
        style={{
          width: "60%",
          flex: 1,
        }}
      >
        <Text
          size="sm"
          fw={500}
          c="gray.7"
          style={{
            lineHeight: 1.4,
          }}
        >
          {label}:
        </Text>
      </Box>
      <Box
        style={{
          width: "30%",
          minWidth: "100px",
          flexShrink: 0,
        }}
      >
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

export default function UserInfoModal({
  user,
  isOpen,
  onClose,
  userProperties,
}: Props) {
  if (!user) return null;

  const rawPlan = user.payment_plan_id;
  const planInfo = isPaymentPlan(rawPlan) ? rawPlan : undefined;
  const properties = user.properties || {};

  // Verificar si el plan está vencido
  let isExpired = false;
  let planDate: Date | null = null;
  if (planInfo) {
    planDate = new Date(planInfo.date_until);
    isExpired = planDate < new Date();
  }

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
                ID: {String(user._id)}
              </Badge>
            </Group>
            <Divider mb="lg" />

            <Stack gap="xs">
              {userProperties.map((prop) => {
                const name = String(prop.name);
                const rawValue = properties[name] ?? "";
                const cleanValue = stripHtml(String(rawValue));
                let displayValue = "";
                // Formatear según el tipo
                if (prop.type === "boolean") {
                  displayValue =
                    cleanValue.toLowerCase() === "true" ? "Sí" : "No";
                } else if (prop.type === "email") {
                  displayValue = cleanValue;
                } else {
                  displayValue = cleanValue;
                }
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
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}
