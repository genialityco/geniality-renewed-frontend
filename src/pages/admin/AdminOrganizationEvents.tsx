import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Title,
  List,
  Button,
  Loader,
  Tabs,
  Table,
  Text,
  Pagination,
  Group,
  Checkbox,
  TextInput,
  Modal,
} from "@mantine/core";
import * as XLSX from "xlsx";

// Servicios
import { fetchEventsByOrganizer } from "../../services/eventService";
import {
  fetchOrganizationUsersByOrganizationId,
  createOrUpdateOrganizationUser,
} from "../../services/organizationUserService";
import { fetchOrganizationById } from "../../services/organizationService";
import { createPaymentPlan } from "../../services/paymentPlansService";
import { Event, OrganizationUser } from "../../services/types";
import { useUser } from "../../context/UserContext";
import api from "../../services/api";

export default function AdminOrganizationEvents() {
  const { organizationId } = useParams();
  const navigate = useNavigate();

  // Eventos
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Organización y usuarios
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userLimit] = useState(20);
  const [userTotal, setUserTotal] = useState(0);

  const [organization, setOrganization] = useState<any>(null);
  const [_orgLoading, setOrgLoading] = useState(true);

  // Carga masiva
  const [massiveUsers, setMassiveUsers] = useState<any[]>([]);
  const [massiveLoading, setMassiveLoading] = useState(false);
  const [createWithPaymentPlan, setCreateWithPaymentPlan] = useState(false);

  // Informe de la última importación
  const [lastImportReport, setLastImportReport] = useState<{
    created: any[];
    updated: any[];
    errors: { row: number; error: string; data: any }[];
  } | null>(null);

  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);

  // Estado para cambiar contraseña
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<string | null>(null);

  const { adminCreateUserAndOrganizationUser } = useUser();

  // Cargar organización y users_properties
  useEffect(() => {
    if (!organizationId) return;
    setOrgLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => setOrganization(org))
      .finally(() => setOrgLoading(false));
  }, [organizationId]);

  // Efecto para cargar eventos y usuarios
  useEffect(() => {
    if (!organizationId) return;
    setLoadingEvents(true);
    fetchEventsByOrganizer(organizationId).then((data) => {
      setEvents(data);
      setLoadingEvents(false);
    });
    fetchOrganizationUsersByOrganizationId(
      organizationId,
      userPage,
      userLimit,
      searchText
    ).then((data) => {
      setUsers(data.results);
      setUserTotal(data.total);
      setLoadingUsers(false);
    });
  }, [organizationId, userPage, userLimit, searchText]);

  // ========== FUNCIONES AUXILIARES PARA BOOLEAN ==========
  function parseBool(value: any) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      return (
        v === "true" ||
        v === "1" ||
        v === "si" ||
        v === "sí" ||
        v === "x" ||
        v === "yes"
      );
    }
    return false;
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    fetchOrganizationUsersByOrganizationId(
      organizationId as string,
      1, // reinicia a la página 1
      userLimit,
      searchText
    ).then((data) => {
      setUsers(data.results);
      setUserTotal(data.total);
      setUserPage(1);
      setSearching(false);
    });
  };

  // ========== CARGA Y AJUSTE DE ARCHIVO ==========
  const handleMassiveFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setMassiveUsers(json);
    };
    reader.readAsArrayBuffer(file);
  };

  // Utilidad para delay/espera
  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ========== CREACIÓN MASIVA ==========
  const handleMassiveCreate = async () => {
    if (!organizationId || !adminCreateUserAndOrganizationUser) return;
    setMassiveLoading(true);

    let createdRows: any[] = [];
    let updatedRows: any[] = [];
    let errorRows: { row: number; error: string; data: any }[] = [];

    const userProperties = organization?.user_properties || [];

    try {
      for (const [idx, row] of massiveUsers.entries()) {
        try {
          // PREPARA LOS PROPERTIES INCLUYENDO VACÍO SI NO EXISTE EN LA FILA
          const properties: Record<string, any> = {};
          for (const prop of userProperties) {
            if (prop.type === "boolean" || prop.type === "BOOLEAN") {
              properties[prop.name] = parseBool(
                row.hasOwnProperty(prop.name) ? row[prop.name] : ""
              );
            } else {
              properties[prop.name] = row.hasOwnProperty(prop.name)
                ? row[prop.name]
                : "";
            }
          }

          // CAMPOS BÁSICOS TAMBIÉN: SI NO ESTÁ, VACÍO O VALOR SEGURO
          const email = row.hasOwnProperty("email") ? row.email : "";
          const name = row.hasOwnProperty("name")
            ? row.name
            : row.hasOwnProperty("names")
            ? row.names
            : "";
          const password = row.hasOwnProperty("password")
            ? row.password
            : row.hasOwnProperty("ID")
            ? row.ID
            : "123456";

          // Espera 300ms antes de cada intento para evitar rate limit de Firebase
          if (idx > 0) await delay(800);

          // Crea usuario o actualiza si ya existe
          const { user, organizationUser } =
            await adminCreateUserAndOrganizationUser({
              email,
              name,
              password,
              organizationId,
              positionId: organization?.default_position_id || "",
              rolId: "60e8a7e74f9fb74ccd00dc22",
              properties,
            });

          // Crea PaymentPlan si corresponde
          if (
            createWithPaymentPlan &&
            organizationUser &&
            organizationUser._id
          ) {
            const date_until = new Date();
            date_until.setDate(
              date_until.getDate() + (organization.access_settings?.days || 365)
            );
            const paymentPlan = await createPaymentPlan({
              days: organization.access_settings?.days || 365,
              date_until: date_until.toISOString(),
              price: organization.access_settings?.price || 0,
              organization_user_id: organizationUser._id,
            });
            // Actualiza organization user con payment_plan_id
            await createOrUpdateOrganizationUser({
              ...organizationUser,
              payment_plan_id: paymentPlan._id,
            });
          }

          if (user && organizationUser) {
            createdRows.push({ row: idx + 2, data: row });
          } else if (!user && organizationUser) {
            updatedRows.push({ row: idx + 2, data: row });
          }
        } catch (err) {
          errorRows.push({
            row: idx + 2,
            error: (err as any)?.message,
            data: row,
          });
        }
      }
      setLastImportReport({
        created: createdRows,
        updated: updatedRows,
        errors: errorRows,
      });
      alert(
        `Usuarios creados: ${createdRows.length}\n` +
          `Usuarios actualizados: ${updatedRows.length}\n` +
          (errorRows.length
            ? `Errores en ${errorRows.length} filas. Ver detalles abajo.`
            : "")
      );
      setMassiveUsers([]);
      fetchOrganizationUsersByOrganizationId(
        organizationId,
        userPage,
        userLimit
      ).then((data) => {
        setUsers(data.results);
        setUserTotal(data.total);
      });
    } finally {
      setMassiveLoading(false);
    }
  };

  // ========== GENERAR PLANTILLA EXCEL AMIGABLE ==========
  const generateUserTemplate = () => {
    if (!organization) return;
    // Campos básicos
    const basicFields = [
      { name: "email", label: "Correo" },
      { name: "name", label: "Nombre completo" },
      {
        name: "password",
        label: "Contraseña (opcional, si no se envía se autogenera)",
      },
    ];
    // Los campos de user_properties de la organización
    const orgFields =
      (organization?.user_properties || []).map((prop: any) => {
        let label = prop.label || prop.name;
        if (prop.mandatory) label += " (OBLIGATORIO)";
        if (prop.type === "boolean" || prop.type === "BOOLEAN") {
          label +=
            " [checkbox: escriba TRUE/1/SI para marcar, FALSE/0/NO para no marcar]";
        }
        return {
          name: prop.name,
          label,
          type: prop.type,
          mandatory: prop.mandatory,
        };
      }) || [];

    // Combina y elimina duplicados
    const fields = [
      ...basicFields,
      ...orgFields.filter(
        (f: { name: string }) => !basicFields.find((b) => b.name === f.name)
      ),
    ];

    // Crea los headers y una fila de ejemplo
    const headers = fields.map((f) => f.name);
    const labels = fields.map((f) => f.label);

    // Ejemplo de usuario (los booleanos con TRUE si obligatorio, FALSE si no)
    const example: Record<string, any> = {
      email: "usuario@email.com",
      name: "Nombre Apellido",
      password: "123456",
    };
    orgFields.forEach(
      (f: { type: string; name: string | number; mandatory: any }) => {
        if (f.type === "boolean" || f.type === "BOOLEAN") {
          example[f.name] = f.mandatory ? "TRUE" : "FALSE";
        } else if (!example[f.name]) {
          example[f.name] = "";
        }
      }
    );

    const worksheet = XLSX.utils.aoa_to_sheet([
      labels,
      headers,
      Object.values(example),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "Usuarios");
    XLSX.writeFile(wb, "usuarios_template.xlsx");
  };

  // Opcional: limpiar el informe manualmente
  const handleClearImportReport = () => setLastImportReport(null);

  // Cambiar contraseña usando el endpoint backend
  const handleChangePassword = async () => {
    if (!selectedUserEmail || !newPassword) return;
    setChangingPassword(true);
    setPasswordChangeMsg(null);
    try {
      await api.post("/users/change-password-by-email", {
        email: selectedUserEmail,
        newPassword,
      });
      setPasswordChangeMsg("Contraseña cambiada correctamente.");
    } catch (err: any) {
      setPasswordChangeMsg("Error cambiando contraseña: " + (err?.response?.data?.message || err.message));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <Container>
      <Title order={2} mb="md">
        Administración de la Organización
      </Title>
      <Tabs defaultValue="events">
        <Tabs.List>
          <Tabs.Tab value="events">Eventos</Tabs.Tab>
          <Tabs.Tab value="members">Miembros</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="events" pt="md">
          {loadingEvents ? (
            <Loader />
          ) : (
            <>
              <Button
                onClick={() =>
                  navigate(`/admin/organizations/${organizationId}/events/new`)
                }
                mb="md"
              >
                Crear Nuevo Evento
              </Button>
              <List spacing="sm">
                {events.map((ev) => (
                  <List.Item key={ev._id}>
                    {ev.name}{" "}
                    <Button
                      variant="outline"
                      size="xs"
                      ml="md"
                      onClick={() =>
                        navigate(
                          `/admin/organizations/${organizationId}/events/${ev._id}`
                        )
                      }
                    >
                      Editar
                    </Button>
                  </List.Item>
                ))}
              </List>
            </>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="members" pt="md">
          <Group mb="md">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleMassiveFile}
              style={{ display: "none" }}
              id="massive-upload"
              disabled={massiveLoading}
            />
            <label htmlFor="massive-upload">
              <Button component="span" disabled={massiveLoading}>
                Subir usuarios masivamente
              </Button>
            </label>
            <Button onClick={generateUserTemplate} variant="light">
              Descargar plantilla Excel
            </Button>
            <Checkbox
              label="Crear usuarios con plan de pago"
              checked={createWithPaymentPlan}
              onChange={(e) =>
                setCreateWithPaymentPlan(e.currentTarget.checked)
              }
              disabled={massiveLoading}
            />
            <Button
              onClick={handleMassiveCreate}
              loading={massiveLoading}
              disabled={massiveUsers.length === 0}
            >
              Procesar usuarios ({massiveUsers.length})
            </Button>
            {lastImportReport && (
              <Button
                variant="subtle"
                color="red"
                ml="sm"
                onClick={handleClearImportReport}
              >
                Limpiar informe
              </Button>
            )}
          </Group>

          <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Buscar nombre o email"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              disabled={loadingUsers || searching}
              style={{ padding: 4, borderRadius: 4, border: "1px solid #ddd" }}
            />
            <Button
              type="submit"
              loading={searching}
              disabled={loadingUsers || searching}
            >
              Buscar
            </Button>
            {searchText && (
              <Button
                variant="subtle"
                onClick={() => {
                  setSearchText("");
                  setUserPage(1);
                }}
              >
                Limpiar
              </Button>
            )}
          </form>

          {/* Informe visual de carga masiva */}
          {lastImportReport && (
            <div style={{ marginBottom: 24 }}>
              <Title order={4} mt="md" mb="sm">
                Informe de importación masiva
              </Title>
              <Text>
                Usuarios <b>creados</b>: {lastImportReport.created.length}
                <br />
                Usuarios <b>actualizados</b>: {lastImportReport.updated.length}
                <br />
                Usuarios <b>con error</b>: {lastImportReport.errors.length}
              </Text>
              {lastImportReport.created.length > 0 && (
                <>
                  <Text mt="md" mb="xs" c="green">
                    Creados:
                  </Text>
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fila</Table.Th>
                        <Table.Th>Datos</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {lastImportReport.created.map((c, idx) => (
                        <Table.Tr key={idx}>
                          <Table.Td>{c.row}</Table.Td>
                          <Table.Td>
                            <pre
                              style={{
                                fontSize: 10,
                                maxWidth: 250,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(c.data, null, 2)}
                            </pre>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </>
              )}
              {lastImportReport.updated.length > 0 && (
                <>
                  <Text mt="md" mb="xs" c="yellow">
                    Actualizados:
                  </Text>
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fila</Table.Th>
                        <Table.Th>Datos</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {lastImportReport.updated.map((u, idx) => (
                        <Table.Tr key={idx}>
                          <Table.Td>{u.row}</Table.Td>
                          <Table.Td>
                            <pre
                              style={{
                                fontSize: 10,
                                maxWidth: 250,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(u.data, null, 2)}
                            </pre>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </>
              )}
              {lastImportReport.errors.length > 0 && (
                <>
                  <Text mt="md" mb="xs" c="red">
                    Errores:
                  </Text>
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Fila</Table.Th>
                        <Table.Th>Error</Table.Th>
                        <Table.Th>Datos</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {lastImportReport.errors.map((err, idx) => (
                        <Table.Tr key={idx}>
                          <Table.Td>{err.row}</Table.Td>
                          <Table.Td>{err.error}</Table.Td>
                          <Table.Td>
                            <pre
                              style={{
                                fontSize: 10,
                                maxWidth: 250,
                                overflow: "auto",
                              }}
                            >
                              {JSON.stringify(err.data, null, 2)}
                            </pre>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </>
              )}
            </div>
          )}

          {massiveUsers.length > 0 && (
            <Table withTableBorder striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  {Object.keys(massiveUsers[0]).map((k) => (
                    <Table.Th key={k}>{k}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {massiveUsers.slice(0, 5).map((row, i) => (
                  <Table.Tr key={i}>
                    {Object.values(row).map((v, j) => (
                      <Table.Td key={j}>{String(v)}</Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
          {loadingUsers ? (
            <Loader />
          ) : users.length === 0 ? (
            <Text>No hay miembros registrados en esta organización.</Text>
          ) : (
            <>
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Usuario</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Profesión</Table.Th>
                    <Table.Th>Especialidad</Table.Th>
                    <Table.Th>Fecha registro</Table.Th>
                    <Table.Th>Acciones</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {users.map((user) => {
                    const props = user.properties || {};
                    return (
                      <Table.Tr key={user._id as any}>
                        <Table.Td>{props.names || props.name || ""}</Table.Td>
                        <Table.Td>{props.email || ""}</Table.Td>
                        <Table.Td>{props.perfilProfesional || ""}</Table.Td>
                        <Table.Td>{props.especialidad || ""}</Table.Td>
                        <Table.Td>
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : ""}
                        </Table.Td>
                        <Table.Td>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setSelectedUserEmail(props.email || "");
                              setShowPasswordModal(true);
                              setNewPassword("");
                              setPasswordChangeMsg(null);
                            }}
                          >
                            Cambiar contraseña
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
              <Pagination
                value={userPage}
                onChange={setUserPage}
                total={Math.ceil(userTotal / userLimit)}
                mt="md"
              />
            </>
          )}
        </Tabs.Panel>
      </Tabs>

      <Modal
        opened={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title={`Cambiar contraseña para: ${selectedUserEmail || ""}`}
        centered
      >
        <TextInput
          type="password"
          label="Nueva contraseña"
          placeholder="Nueva contraseña"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          mb="md"
        />
        <Group>
          <Button
            onClick={handleChangePassword}
            loading={changingPassword}
            disabled={!newPassword}
          >
            Cambiar contraseña
          </Button>
          <Button
            variant="subtle"
            onClick={() => setShowPasswordModal(false)}
          >
            Cancelar
          </Button>
        </Group>
        {passwordChangeMsg && (
          <Text mt="sm" color={passwordChangeMsg.includes("correctamente") ? "green" : "red"}>
            {passwordChangeMsg}
          </Text>
        )}
      </Modal>
    </Container>
  );
}
