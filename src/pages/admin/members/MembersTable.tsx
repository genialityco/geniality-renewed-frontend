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
import { FaClipboard, FaCopy } from "react-icons/fa6";
import { useOrganization } from "../../../context/OrganizationContext";
import { OrganizationUser, PaymentPlan } from "../../../services/types";

// Props
interface Props {
  users: OrganizationUser[];
  onChangeCredentials: (user: OrganizationUser) => void;
  onUpdatePlan: (userId: string) => void;
  onEditUser: (user: OrganizationUser) => void;
  onDeleteUser: (user: OrganizationUser) => void;
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
}: Props) {
  const { organization } = useOrganization();

  const userProps =
    (organization?.user_properties || []).map(
      (p: { name: any; label: any; type: any }) => ({
        name: String(p.name),
        label: stripHtml(String(p.label)),
        type: String(p.type || "").toLowerCase(),
      })
    ) ?? [];

  return (
    <ScrollArea>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            {userProps.map((prop: { label: any; name: any }) => {
              const rawLabel = stripHtml(String(prop.label));
              const displayLabel =
                rawLabel.length > HEADER_TRUNCATE_LENGTH
                  ? rawLabel.slice(0, HEADER_TRUNCATE_LENGTH) + "..."
                  : rawLabel;
              return (
                <Table.Th key={String(prop.name)} title={rawLabel}>
                  {displayLabel}
                </Table.Th>
              );
            })}
            <Table.Th>Plan</Table.Th>
            <Table.Th>Acciones</Table.Th>
          </Table.Tr>
        </Table.Thead>

        <Table.Tbody>
          {users.map((user) => {
            const props = user.properties || {};
            const rawPlan = user.payment_plan_id;
            const planInfo = isPaymentPlan(rawPlan) ? rawPlan : undefined;

            return (
              <Table.Tr key={String(user._id)}>
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
                    <Table.Td key={name}>
                      {isEmail ? (
                        <Group gap="xs" align="center" wrap="nowrap">
                          <Tooltip label={cleanValue} withArrow>
                            <Text truncate style={{ maxWidth: 220 }}>
                              {cleanValue || "—"}
                            </Text>
                          </Tooltip>
                          {cleanValue && <CopyEmailButton email={cleanValue} />}
                        </Group>
                      ) : (
                        <Tooltip label={cleanValue} withArrow>
                          <Text truncate style={{ maxWidth: 260 }}>
                            {text || "—"}
                          </Text>
                        </Tooltip>
                      )}
                    </Table.Td>
                  );
                })}

                {/* Columna Plan */}
                <Table.Td>
                  {planInfo ? (
                    <Tooltip
                      multiline
                      w={260}
                      label={`Días: ${planInfo.days}\nVence: ${dtfCO.format(
                        new Date(planInfo.date_until)
                      )}`}
                      withArrow
                    >
                      <Text truncate style={{ maxWidth: 180 }}>
                        {dtfCO.format(new Date(planInfo.date_until))}
                      </Text>
                    </Tooltip>
                  ) : (
                    <Text c="dimmed">Sin plan</Text>
                  )}
                </Table.Td>

                {/* Acciones */}
                <Table.Td>
                  <Group gap="xs" wrap="wrap">
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => onUpdatePlan(String(user._id))}
                      aria-label="Actualizar plan del usuario"
                    >
                      Actualizar plan
                    </Button>

                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onChangeCredentials(user)}
                      aria-label="Cambiar credenciales del usuario"
                    >
                      Cambiar credenciales
                    </Button>

                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => onEditUser(user)}
                      aria-label="Editar usuario"
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
