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
    visible: boolean;
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
      size="lg"
      padding="xl"
      styles={{
        content: {
          borderRadius: "12px",
        },
      }}
    >
      <ScrollArea.Autosize mah="70vh">
        <Stack gap="lg">
          {/* Información básica */}
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
              <Text size="lg" fw={600} c="gray.8">
                Datos Básicos
              </Text>
              <Badge variant="light" color="blue" size="sm">
                ID: {String(user._id)}
              </Badge>
            </Group>
            <Divider mb="md" />

            <Stack gap="sm">
              {userProperties
                .filter((prop) => prop.visible)
                .map((prop) => {
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

                  return (
                    <Group key={name} justify="space-between" wrap="nowrap">
                      <Text
                        size="sm"
                        fw={500}
                        c="gray.7"
                        style={{ minWidth: 120 }}
                      >
                        {prop.label}:
                      </Text>
                      <Group gap="xs" style={{ flex: 1 }}>
                        <Text
                          size="sm"
                          style={{
                            wordBreak: "break-word",
                            flex: 1,
                            textAlign: "right",
                          }}
                        >
                          {displayValue}
                        </Text>
                        {(prop.type === "email" || cleanValue.length > 20) && (
                          <CopyButton
                            text={cleanValue}
                            label={
                              prop.type === "email"
                                ? "Copiar email"
                                : "Copiar texto"
                            }
                          />
                        )}
                      </Group>
                    </Group>
                  );
                })}
            </Stack>
          </Paper>

          {/* Información del plan */}
          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm">
              <Text size="lg" fw={600} c="gray.8">
                Plan de Pago
              </Text>
              <FaCalendarAlt size={16} color="var(--mantine-color-blue-6)" />
            </Group>
            <Divider mb="md" />

            {planInfo ? (
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="sm" fw={500} c="gray.7">
                    Estado:
                  </Text>
                  <Badge
                    variant="light"
                    color={isExpired ? "red" : "green"}
                    size="md"
                  >
                    {isExpired ? "⚠️ Vencido" : "✅ Activo"}
                  </Badge>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" fw={500} c="gray.7">
                    Duración:
                  </Text>
                  <Text size="sm">{planInfo.days} días</Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" fw={500} c="gray.7">
                    Precio:
                  </Text>
                  <Text size="sm" fw={600}>
                    ${planInfo.price.toLocaleString("es-CO")}
                  </Text>
                </Group>

                <Group justify="space-between">
                  <Text size="sm" fw={500} c="gray.7">
                    Fecha de vencimiento:
                  </Text>
                  <Group gap="xs">
                    <Text
                      size="sm"
                      fw={600}
                      c={isExpired ? "red.7" : "green.7"}
                    >
                      {planDate && dtfCO.format(planDate)}
                    </Text>
                    <CopyButton
                      text={planDate ? dtfCO.format(planDate) : ""}
                      label="Copiar fecha"
                    />
                  </Group>
                </Group>

                {isExpired && (
                  <Group justify="center" mt="sm">
                    <Badge variant="filled" color="red" size="lg">
                      <FaInfoCircle style={{ marginRight: 4 }} />
                      Este plan ha vencido
                    </Badge>
                  </Group>
                )}
              </Stack>
            ) : (
              <Group justify="center" py="xl">
                <Stack align="center" gap="sm">
                  <Badge variant="light" color="gray" size="xl">
                    Sin plan asignado
                  </Badge>
                  <Text size="sm" c="gray.6" ta="center">
                    Este usuario no tiene un plan de pago activo
                  </Text>
                </Stack>
              </Group>
            )}
          </Paper>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
}
