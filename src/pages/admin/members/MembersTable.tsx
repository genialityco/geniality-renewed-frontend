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

interface Props {
  users: OrganizationUser[];
  onPasswordChange: (email: string) => void;
  onUpdatePlan: (userId: string) => void;
  onEditUser: (user: OrganizationUser) => void;
}

const HEADER_TRUNCATE_LENGTH = 15;
const LIST_TRUNCATE_LENGTH = 20;

// Utility para eliminar HTML
export function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

// Type guard para PaymentPlan
export function isPaymentPlan(obj: any): obj is PaymentPlan {
  return (
    obj &&
    typeof obj.days === "number" &&
    typeof obj.price === "number" &&
    typeof obj.date_until === "string"
  );
}

export default function MembersTable({
  users,
  onPasswordChange,
  onUpdatePlan,
  onEditUser,
}: Props) {
  const { organization } = useOrganization();
  const userProps = organization?.user_properties || [];

  const CopyEmailButton = ({ email }: { email: string }) => {
    const clipboard = useClipboard({ timeout: 500 });

    return (
      <Tooltip label={clipboard.copied ? "Copiado!" : "Copiar email"} withArrow>
        <ActionIcon
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
  };

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
                        {`${new Date(
                          planInfo.date_until
                        ).toLocaleDateString()}`}
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
                  >
                    Actualizar plan
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onPasswordChange(props.email || "")}
                  >
                    Cambiar contraseña
                  </Button>

                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => onEditUser(user)}
                    mr="xs"
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
