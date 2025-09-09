// src/pages/AdminOrganizationEvents/MembersTable.tsx
import {
  ScrollArea,
  Table,
  Button,
  Text,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import { useOrganization } from "../../../context/OrganizationContext";
import { OrganizationUser, PaymentPlan } from "../../../services/types";
import { useClipboard } from "@mantine/hooks";
import { FaClipboard, FaCopy } from "react-icons/fa6";
import React from "react";

interface Props {
  users: OrganizationUser[];
  onPasswordChange: (email: string) => void;
  onUpdatePlan: (userId: string) => void;
  onEditUser: (user: OrganizationUser) => void;
}

const HEADER_TRUNCATE_LENGTH = 15;
const LIST_TRUNCATE_LENGTH = 20;

// Fuera del componente principal:
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

// Utility para eliminar HTML
export function stripHtml(input: string): string {
  const withoutTags = input.replace(/<\/?[^>]+(>|$)/g, "");
  return withoutTags.replace(/&nbsp;/g, " ").trim();
}

// Type guard para PaymentPlan
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

const dtfCO = new Intl.DateTimeFormat("es-CO", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "America/Bogota",
});

export default function MembersTable({
  users,
  onPasswordChange,
  onUpdatePlan,
  onEditUser,
}: Props) {
  const { organization } = useOrganization();
  const userProps = organization?.user_properties || [];

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
              <Table.Tr key={user._id as any}>
                {/* Celdas dinámicas */}
                {userProps.map((prop: { name: any; type: string }) => {
                  const name = String(prop.name);
                  const rawValue = props[name] ?? "";
                  const cleanValue = stripHtml(String(rawValue));
                  let text = "";

                  if (prop.type.toLowerCase() === "boolean") {
                    text =
                      cleanValue.toLowerCase() === "true"
                        ? "Acepto"
                        : "No acepto";
                  } else if (prop.type.toLowerCase() === "list") {
                    text =
                      cleanValue.length > LIST_TRUNCATE_LENGTH
                        ? cleanValue.slice(0, LIST_TRUNCATE_LENGTH) + "..."
                        : cleanValue;
                  } else {
                    text = cleanValue;
                  }

                  return (
                    <Table.Td key={name}>
                      {/* Aquí está el cambio */}
                      {prop.type.toLowerCase() === "email" ? (
                        <Text style={{ display: "flex", alignItems: "center" }}>
                          <Tooltip label={cleanValue} withArrow>
                            <Text truncate>{cleanValue}</Text>
                          </Tooltip>
                          <CopyEmailButton email={cleanValue} />
                        </Text>
                      ) : (
                        <Tooltip label={cleanValue} withArrow>
                          <Text truncate>{text}</Text>
                        </Tooltip>
                      )}
                    </Table.Td>
                  );
                })}

                {/* Columna Plan */}
                <Table.Td>
                  {planInfo ? (
                    <Tooltip
                      label={`Días: ${planInfo.days}\nVence: ${new Date(
                        planInfo.date_until
                      ).toLocaleDateString()}`}
                      withArrow
                    >
                      <Text truncate>
                        {planInfo
                          ? dtfCO.format(new Date(planInfo.date_until))
                          : "Sin plan"}
                      </Text>
                    </Tooltip>
                  ) : (
                    <Text c="dimmed">Sin plan</Text>
                  )}
                </Table.Td>

                {/* Acciones */}
                <Table.Td>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={() => onUpdatePlan(user._id as string)}
                    mr="xs"
                    aria-label="Actualizar plan del usuario"
                  >
                    Actualizar plan
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onPasswordChange(String(props.email ?? ""))}
                    aria-label="Cambiar credenciales del usuario"
                  >
                    Cambiar credenciales
                  </Button>

                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onEditUser(user)}
                    mr="xs"
                    aria-label="Editar usuario"
                  >
                    Editar
                  </Button>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
