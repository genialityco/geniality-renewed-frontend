// src/pages/AdminOrganizationEvents/MembersTable.tsx
import React from "react";
import {
  ScrollArea,
  Table,
  Button,
  Text,
  Tooltip,
  ActionIcon,
  Group,
} from "@mantine/core";
import { useClipboard } from "@mantine/hooks";
import { FaClipboard, FaCopy, FaEye } from "react-icons/fa6";
import { useOrganization } from "../../../context/OrganizationContext";
import { OrganizationUser, PaymentPlan } from "../../../services/types";

// Props
interface Props {
  users: OrganizationUser[];
  onChangeCredentials: (user: OrganizationUser) => void;
  onUpdatePlan: (userId: string) => void;
  onEditUser: (user: OrganizationUser) => void;
  onDeleteUser: (user: OrganizationUser) => void;
  onViewUser: (user: OrganizationUser) => void;
}

const HEADER_TRUNCATE_LENGTH = 15;
const LIST_TRUNCATE_LENGTH = 20;

// === Botón de copiar (memo) ===
const CopyEmailButton = React.memo(function CopyEmailButton({
  email,
}: {
  email: string;
}) {
  const clipboard = useClipboard({ timeout: 700 });
  return (
    <Tooltip label={clipboard.copied ? "Copiado!" : "Copiar email"} withArrow>
      <ActionIcon
        aria-label="Copiar email"
        variant="subtle"
        color={clipboard.copied ? "teal" : "gray"}
        onClick={() => clipboard.copy(email)}
      >
        {clipboard.copied ? (
          <FaCopy style={{ width: "70%", height: "70%" }} />
        ) : (
          <FaClipboard style={{ width: "70%", height: "70%" }} />
        )}
      </ActionIcon>
    </Tooltip>
  );
});

// === Sanitización simple de HTML ===
export function stripHtml(input: string): string {
  const withoutTags = input.replace(/<\/?[^>]+(>|$)/g, "");
  return withoutTags.replace(/&nbsp;/g, " ").trim();
}

// === Type guard de PaymentPlan ===
export function isPaymentPlan(obj: unknown): obj is PaymentPlan {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.days === "number" &&
    typeof o.price === "number" &&
    typeof o.date_until === "string" &&
    !!o.date_until
  );
}

// === Formateador de fecha consistente (Bogotá) ===
const dtfCO = new Intl.DateTimeFormat("es-CO", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Bogota",
});

export default function MembersTable({
  users,
  onChangeCredentials,
  onUpdatePlan,
  onEditUser,
  onDeleteUser,
  onViewUser,
}: Props) {
  const { organization } = useOrganization();

  const userProps =
    (organization?.user_properties || [])
      .filter((p: { visible: any }) => p.visible === true)
      .map((p: { name: any; label: any; type: any; visible: any }) => ({
        name: String(p.name),
        label: stripHtml(String(p.label)),
        type: String(p.type || "").toLowerCase(),
        visible: p.visible,
      })) ?? [];
  console.log("userProps:", userProps);

  return (
    <ScrollArea>
      <Table
        striped
        highlightOnHover
        withTableBorder
        withColumnBorders
        verticalSpacing="md"
        horizontalSpacing="lg"
        style={{
          backgroundColor: "var(--mantine-color-gray-0)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <Table.Thead style={{ backgroundColor: "var(--mantine-color-gray-1)" }}>
          <Table.Tr>
            {userProps.map((prop: { label: any; name: any }) => {
              const rawLabel = stripHtml(String(prop.label));
              const displayLabel =
                rawLabel.length > HEADER_TRUNCATE_LENGTH
                  ? rawLabel.slice(0, HEADER_TRUNCATE_LENGTH) + "..."
                  : rawLabel;
              return (
                <Table.Th
                  key={String(prop.name)}
                  title={rawLabel}
                  style={{
                    fontWeight: 600,
                    color: "var(--mantine-color-gray-8)",
                    padding: "16px 12px",
                    borderBottom: "2px solid var(--mantine-color-blue-5)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {displayLabel}
                </Table.Th>
              );
            })}
            <Table.Th
              style={{
                fontWeight: 600,
                color: "var(--mantine-color-gray-8)",
                padding: "16px 12px",
                borderBottom: "2px solid var(--mantine-color-blue-5)",
                whiteSpace: "nowrap",
              }}
            >
              Plan
            </Table.Th>
            <Table.Th
              style={{
                fontWeight: 600,
                color: "var(--mantine-color-gray-8)",
                padding: "16px 12px",
                borderBottom: "2px solid var(--mantine-color-blue-5)",
                whiteSpace: "nowrap",
                minWidth: "280px",
              }}
            >
              Acciones
            </Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {users.map((user, index) => {
            const props = user.properties || {};
            const rawPlan = user.payment_plan_id;
            const planInfo = isPaymentPlan(rawPlan) ? rawPlan : undefined;

            return (
              <Table.Tr
                key={String(user._id)}
                style={{
                  backgroundColor:
                    index % 2 === 0 ? "white" : "var(--mantine-color-gray-0)",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "var(--mantine-color-blue-0)",
                    transform: "scale(1.01)",
                  },
                }}
              >
                {/* Celdas dinámicas */}
                {userProps.map((prop: { name: any; type: string }) => {
                  const name = String(prop.name);
                  const rawValue = props[name] ?? "";
                  const cleanValue = stripHtml(String(rawValue));
                  let text = "";

                  if (prop.type === "boolean") {
                    text =
                      cleanValue.toLowerCase() === "true"
                        ? "Acepto"
                        : "No acepto";
                  } else if (prop.type === "list") {
                    text =
                      cleanValue.length > LIST_TRUNCATE_LENGTH
                        ? cleanValue.slice(0, LIST_TRUNCATE_LENGTH) + "..."
                        : cleanValue;
                  } else {
                    text = cleanValue;
                  }

                  const isEmail = prop.type === "email";

                  return (
                    <Table.Td
                      key={name}
                      style={{
                        padding: "14px 12px",
                        verticalAlign: "middle",
                      }}
                    >
                      {isEmail ? (
                        <Group gap="xs" align="center" wrap="nowrap">
                          <Tooltip label={cleanValue} withArrow>
                            <Text
                              truncate
                              style={{
                                maxWidth: 220,
                                fontWeight: 500,
                              }}
                            >
                              {cleanValue || "—"}
                            </Text>
                          </Tooltip>
                          {cleanValue && <CopyEmailButton email={cleanValue} />}
                        </Group>
                      ) : (
                        <Tooltip label={cleanValue} withArrow>
                          <Text
                            truncate
                            style={{
                              maxWidth: 260,
                              color: text
                                ? "var(--mantine-color-gray-8)"
                                : "var(--mantine-color-gray-5)",
                            }}
                          >
                            {text || "—"}
                          </Text>
                        </Tooltip>
                      )}
                    </Table.Td>
                  );
                })}

                {/* Columna Plan */}
                <Table.Td
                  style={{
                    padding: "14px 12px",
                    verticalAlign: "middle",
                  }}
                >
                  {planInfo ? (
                    (() => {
                      const planDate = new Date(planInfo.date_until);
                      const today = new Date();
                      const isExpired = planDate < today;

                      return (
                        <Tooltip
                          multiline
                          w={260}
                          label={`Días: ${planInfo.days}\nVence: ${dtfCO.format(
                            planDate
                          )}${isExpired ? "\n⚠️ Plan vencido" : ""}`}
                          withArrow
                        >
                          <Text
                            truncate
                            style={{
                              maxWidth: 180,
                              cursor: "help",
                              color: isExpired
                                ? "var(--mantine-color-red-7)"
                                : "var(--mantine-color-green-7)",
                              fontWeight: 500,
                            }}
                          >
                            {dtfCO.format(planDate)}
                          </Text>
                        </Tooltip>
                      );
                    })()
                  ) : (
                    <Text
                      style={{
                        color: "var(--mantine-color-gray-5)",
                        fontStyle: "italic",
                      }}
                    >
                      Sin plan
                    </Text>
                  )}
                </Table.Td>

                {/* Acciones */}
                <Table.Td
                  style={{
                    padding: "14px 12px",
                    verticalAlign: "middle",
                  }}
                >
                  <Group gap="xs" wrap="wrap" justify="flex-start">
                    <Button
                      size="xs"
                      variant="light"
                      color="green"
                      onClick={() => onViewUser(user)}
                      aria-label="Ver información del usuario"
                      leftSection={<FaEye size={10} />}
                      style={{
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      Ver
                    </Button>
                    <Button
                      size="xs"
                      variant="light"
                      color="blue"
                      onClick={() => onUpdatePlan(String(user._id))}
                      aria-label="Actualizar plan del usuario"
                      style={{
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      Actualizar plan
                    </Button>

                    <Button
                      size="xs"
                      variant="outline"
                      color="gray"
                      onClick={() => onChangeCredentials(user)}
                      aria-label="Cambiar credenciales del usuario"
                      style={{
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      Credenciales
                    </Button>

                    <Button
                      size="xs"
                      variant="outline"
                      color="blue"
                      onClick={() => onEditUser(user)}
                      aria-label="Editar usuario"
                      style={{
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      Editar
                    </Button>

                    <Button
                      size="xs"
                      variant="light"
                      color="red"
                      component="a"
                      onClick={() => onDeleteUser(user)}
                      aria-label="Eliminar usuario"
                      style={{
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      Eliminar
                    </Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
