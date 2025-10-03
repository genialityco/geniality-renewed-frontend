import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader,
  Text,
  Pagination,
  Paper,
  Group,
  ScrollArea,
  Select,
  Button,
  Box,
  Flex,
  Popover,
  Drawer,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import * as XLSX from "xlsx";
import { FaFileExcel } from "react-icons/fa6";

import BulkUploadSection from "./BulkUploadSection";
import SearchForm from "./SearchForm";
import ImportReport from "./ImportReport";
import MembersTable, { isPaymentPlan, stripHtml } from "./MembersTable";
import ChangeCredentialsModal from "./ChangeCredentialsModal";
import ChangePaymentPlanModal from "./ChangePaymentPlanModal";
import EditUserModal from "./EditUserModal";
import UserInfoModal from "./UserInfoModal";
import { useUser } from "../../../context/UserContext";

import {
  createOrUpdateOrganizationUser,
  fetchOrganizationUsersByOrganizationId,
  fetchAllOrganizationUsersByOrganizationId,
  deleteOrganizationUser,
} from "../../../services/organizationUserService";

import {
  createPaymentPlan,
  updatePaymentPlanDateUntil,
} from "../../../services/paymentPlansService";

import type {
  OrganizationUser,
  ImportReportType,
  UserProperty,
} from "../../../services/types";

import { useOrganization } from "../../../context/OrganizationContext";

import DeleteConfirmModal from "./DeleteConfirmModal";

export default function MembersTab() {
  const isMobile = useMediaQuery("(max-width: 48em)");
  const { organization } = useOrganization();
  const { adminCreateMember } = useUser(); // ← Usar la función del admin
  const orgId = organization?._id!;

  const limitOptions = ["10", "20", "50", "100"];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userLimit, setUserLimit] = useState("10");
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);

  const [rawSearch, setRawSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [lastImportReport, setLastImportReport] =
    useState<ImportReportType | null>(null);

  const [passwordModalOpened, setPasswordModalOpened] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<OrganizationUser | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<OrganizationUser | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [userInfoModalOpen, setUserInfoModalOpen] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] =
    useState<OrganizationUser | null>(null);

  const dtfCO = new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Bogota",
  });

  const sharedButtonProps = {
    size: "md" as const,
    radius: "xl" as const,
    fullWidth: isMobile,
    styles: {
      root: {
        height: 44,
        paddingInline: 16,
        minWidth: isMobile ? "auto" : 180,
      },
    },
  };

  const lastRunRef = useRef<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    const runId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    lastRunRef.current = runId;

    try {
      if (!orgId) return;
      const perPage = Number(userLimit) || 10;
      const data = await fetchOrganizationUsersByOrganizationId(
        orgId,
        userPage,
        perPage,
        searchText
      );
      if (lastRunRef.current === runId) {
        setUsers(data.results);
        setUserTotal(data.total);
      }
    } finally {
      if (lastRunRef.current === runId) {
        setLoadingUsers(false);
      }
    }
  }, [orgId, userPage, userLimit, searchText]);

  useEffect(() => {
    if (orgId) fetchUsers();
  }, [orgId, fetchUsers]);

  useEffect(() => {
    const id = setTimeout(() => setSearchText(rawSearch.trim()), 350);
    return () => clearTimeout(id);
  }, [rawSearch]);

  const handleUpdatePlan = (userId: string) => {
    setSelectedUserId(userId);
    setPlanModalOpen(true);
  };

  const handlePlanSave = async ({
    days,
    price,
  }: {
    days: number;
    price: number;
  }) => {
    if (!selectedUserId) return;

    const date_until = new Date();
    date_until.setDate(date_until.getDate() + days);
    const isoDate = date_until.toISOString();

    const user = users.find((u) => u._id === selectedUserId);
    const existingPlan = user?.payment_plan_id as { _id: string } | undefined;

    if (
      existingPlan &&
      typeof existingPlan === "object" &&
      "_id" in existingPlan &&
      user
    ) {
      const userNames = user.properties.nombres
        ? user.properties.nombres
        : user.properties.names;
      await updatePaymentPlanDateUntil(
        existingPlan._id,
        isoDate,
        userNames,
        "admin"
      );
    } else {
      const newPlan = await createPaymentPlan({
        days,
        date_until: isoDate,
        price,
        organization_user_id: selectedUserId,
        source: "manual",
      });

      await createOrUpdateOrganizationUser({
        properties: user?.properties || {},
        rol_id: user?.rol_id || "",
        organization_id: user?.organization_id || "",
        position_id: user?.position_id || "",
        user_id: user?.user_id as string,
        payment_plan_id: newPlan._id,
      });
    }

    setPlanModalOpen(false);
    setSelectedUserId(null);
    fetchUsers();
  };

  const handleEditUser = (user: OrganizationUser) => {
    setUserToEdit(user);
    setEditModalOpen(true);
  };

  const handleUserEditSave = async (updatedProperties: any) => {
    if (!userToEdit) return;

    const updatedUserPayload = {
      ...userToEdit,
      properties: updatedProperties,
      user_id: userToEdit.user_id as string,
      rol_id: userToEdit.rol_id,
      organization_id: userToEdit.organization_id,
      position_id: userToEdit.position_id,
    };

    try {
      await createOrUpdateOrganizationUser(updatedUserPayload);
      fetchUsers();
    } catch (error) {
      console.error("Error al actualizar el usuario:", error);
    }

    setEditModalOpen(false);
    setUserToEdit(null);
  };

  const handleCreateUserSave = async (newUserData: any) => {
    if (!organization || !adminCreateMember) return;

    // Detectar campos de email e ID (igual que AuthForm)
    const emailField =
      (organization.user_properties || []).find(
        (p: any) => p.type === "email" || p.name?.toLowerCase() === "email"
      )?.name || "email";
    const idField =
      (organization.user_properties || []).find((p: any) => {
        const lname = p.name?.toLowerCase() || "";
        return [
          "id",
          "documento",
          "documentoid",
          "documentoidentidad",
          "documento_de_identidad",
          "cedula",
          "cédula",
          "ceduladeciudadania",
          "doc",
          "doc_identidad",
        ].includes(lname);
      })?.name || "ID";

    const emailValue = newUserData[emailField];
    const passwordValue = newUserData[idField];

    if (!emailValue || !passwordValue) {
      throw new Error("Email y documento son requeridos");
    }

    // Construir el nombre completo
    const nombres = newUserData.nombres || newUserData.names || "";
    const apellidos = newUserData.apellidos || newUserData.surnames || "";
    const fullName = [nombres, apellidos].filter(Boolean).join(" ").trim();

    try {
      // Usar la función especial del admin que no afecta la sesión actual
      await adminCreateMember({
        email: emailValue,
        password: passwordValue,
        name: fullName,
        properties: newUserData,
        organizationId: organization._id,
        positionId: organization.default_position_id || "",
        rolId: "5c1a59b2f33bd40bb67f2322",
      });

      setCreateModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error al crear el usuario:", error);

      if (error?.code === "auth/email-already-in-use") {
        throw new Error("Ya existe una cuenta con ese correo");
      } else if (error?.code === "auth/weak-password") {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      } else if (error?.code === "auth/invalid-email") {
        throw new Error("El formato del correo es inválido");
      } else {
        throw new Error(error?.message || "Error al crear el usuario");
      }
    }
  };

  const handleDeleteUser = (user: OrganizationUser) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
    setDeleteError(null);
  };

  const extractUserId = (orgUser: OrganizationUser): string | null => {
    const ref: any = orgUser?.user_id;
    if (!ref) return null;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && ref._id != null) return String(ref._id);
    return null;
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    const userId = extractUserId(userToDelete);
    if (!userId) {
      setDeleteError("No se pudo determinar el user_id.");
      return;
    }
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteOrganizationUser(userId);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (e: any) {
      setDeleteError(e?.message || "Error eliminando el usuario.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCloseDelete = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setUserToDelete(null);
    setDeleteError(null);
  };

  const handleViewUserInfo = (user: OrganizationUser) => {
    setSelectedUserInfo(user);
    setUserInfoModalOpen(true);
  };

  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      const allUsers = await fetchAllOrganizationUsersByOrganizationId(
        orgId,
        searchText
      );
      if (!allUsers || allUsers.length === 0) {
        console.warn("No hay usuarios para exportar.");
        return;
      }

      const exceptionNames = new Set(["names", "indicativodepais"]);

      const propsToExport = (organization?.user_properties || []).filter(
        (p: any) => {
          const name = String(p?.name || "");
          const isException = exceptionNames.has(name);
          return p?.visible === true || isException;
        }
      );

      const dataToExport = allUsers.map((user) => {
        const props = user.properties || {};
        const rawPlan = user.payment_plan_id;
        const planInfo = isPaymentPlan(rawPlan) ? rawPlan : undefined;

        const rowData: Record<string, string | number> = {};

        propsToExport.forEach(
          (prop: { name: string; type: string; label: string }) => {
            const name = String(prop.name);
            const rawValue = props[name] ?? "";
            let cleanValue = stripHtml(String(rawValue));

            if (prop.type?.toLowerCase() === "boolean") {
              const v = cleanValue.toLowerCase();
              cleanValue =
                v === "true" || v === "1" || v === "sí" || v === "si"
                  ? "Acepto"
                  : "No acepto";
            }

            const label = stripHtml(String(prop.label));
            rowData[label] = cleanValue;
          }
        );

        const createdAt = user.created_at ? new Date(user.created_at) : null;
        rowData["Fecha de registro"] = createdAt ? dtfCO.format(createdAt) : "";

        rowData["Plan (Vencimiento)"] = planInfo
          ? dtfCO.format(new Date(planInfo.date_until))
          : "Sin plan";

        const mapSource = (s?: string) =>
          s === "gateway"
            ? "Pasarela de pago"
            : s === "admin"
            ? "Creado por admin"
            : s === "manual"
            ? "Creado manualmente"
            : "";

        rowData["source"] = planInfo ? mapSource((planInfo as any).source) : "";

        return rowData;
      });

      const headers = [
        ...propsToExport.map((prop: { label: string }) =>
          stripHtml(String(prop.label))
        ),
        "Fecha de registro",
        "Plan (Vencimiento)",
      ];

      const worksheet = XLSX.utils.json_to_sheet(dataToExport, {
        header: headers,
        skipHeader: true,
      });
      XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Miembros");
      XLSX.writeFile(workbook, "miembros_organizacion.xlsx");
    } catch (error) {
      console.error("Error al exportar usuarios:", error);
    } finally {
      setExporting(false);
    }
  };

  const perPage = Number(userLimit) || 10;

  return (
    <>
      <Paper
        withBorder
        radius="xl"
        p="md"
        mb="md"
        bg="gradient(45deg, #f8fafc 0%, #ffffff 100%)"
        style={{ borderColor: "#e2e8f0" }}
      >
        <Box mb={lastImportReport ? "md" : 0}>
          <Flex
            justify="space-between"
            align="center"
            gap="md"
            wrap="wrap"
            direction={isMobile ? "column" : "row"}
          >
            <Box
              style={{ flex: 1, width: isMobile ? "100%" : "auto" }}
              maw={600}
            >
              <SearchForm
                value={rawSearch}
                onSearch={(text) => {
                  setRawSearch(text);
                  setUserPage(1);
                }}
              />
            </Box>

            <Group
              gap="sm"
              justify={isMobile ? "stretch" : "flex-end"}
              w={isMobile ? "100%" : "auto"}
            >
              {isMobile ? (
                <>
                  <Drawer
                    opened={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    position="bottom"
                    size="auto"
                    withCloseButton
                    padding="md"
                    zIndex={400}
                    overlayProps={{ opacity: 0.35, blur: 2 }}
                  >
                    <BulkUploadSection
                      onReport={(r) => {
                        setLastImportReport(r);
                        fetchUsers();
                      }}
                    />
                  </Drawer>

                  <Button
                    variant="filled"
                    {...sharedButtonProps}
                    onClick={() => setDrawerOpen(true)}
                  >
                    Más opciones
                  </Button>
                </>
              ) : (
                <Popover
                  position="bottom-end"
                  withArrow
                  shadow="md"
                  offset={8}
                  keepMounted
                  trapFocus
                >
                  <Popover.Target>
                    <Button variant="light" color="gray" {...sharedButtonProps}>
                      Más opciones
                    </Button>
                  </Popover.Target>
                  <Popover.Dropdown
                    style={{
                      background: "white",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      padding: 8,
                      minWidth: 360,
                      maxWidth: 520,
                    }}
                  >
                    <BulkUploadSection
                      onReport={(r) => {
                        setLastImportReport(r);
                        fetchUsers();
                      }}
                    />
                  </Popover.Dropdown>
                </Popover>
              )}

              <Button
                variant="filled"
                color="blue"
                onClick={() => setCreateModalOpen(true)}
                {...sharedButtonProps}
              >
                Crear Usuario
              </Button>

              <Button
                leftSection={<FaFileExcel size={18} />}
                variant="filled"
                color="teal"
                onClick={handleExportToExcel}
                loading={exporting}
                disabled={exporting}
                {...sharedButtonProps}
                styles={{
                  ...sharedButtonProps.styles,
                  root: {
                    ...sharedButtonProps.styles.root,
                    background:
                      "linear-gradient(135deg, #0ca678 0%, #059669 100%)",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
                    "&:hover": {
                      transform: isMobile ? "none" : "translateY(-2px)",
                      boxShadow: "0 6px 16px rgba(5, 150, 105, 0.4)",
                    },
                  },
                }}
              >
                Exportar a Excel
              </Button>
            </Group>
          </Flex>
        </Box>

        {lastImportReport && (
          <Box
            mt="md"
            p="sm"
            bg="rgba(255,255,255,0.7)"
            style={{ borderRadius: "12px", backdropFilter: "blur(10px)" }}
          >
            <ImportReport
              report={lastImportReport}
              onClear={() => setLastImportReport(null)}
            />
          </Box>
        )}
      </Paper>

      {loadingUsers ? (
        <Loader />
      ) : users.length === 0 ? (
        <Text>No hay miembros registrados</Text>
      ) : (
        <Paper withBorder radius="md" p="md">
          <ScrollArea h={1000} mb="md">
            <MembersTable
              users={users}
              onChangeCredentials={(user) => {
                const email = String(user.properties?.email ?? "");
                const userId =
                  typeof user.user_id === "string" ? user.user_id : null;

                setSelectedEmail(email);
                setSelectedUserId(userId);
                setPasswordModalOpened(true);
              }}
              onUpdatePlan={handleUpdatePlan}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onViewUser={handleViewUserInfo}
            />
          </ScrollArea>

          <Group justify="space-between" align="center" mt="md">
            <Text size="sm" c="dimmed">
              Total miembros: {userTotal}
            </Text>
            <Group>
              <Text size="sm" c="dimmed">
                Mostrar
              </Text>
              <Select
                value={userLimit}
                onChange={(value) => {
                  if (value) {
                    setUserLimit(value);
                    setUserPage(1);
                  }
                }}
                data={limitOptions}
                w={80}
              />
            </Group>
            <Pagination
              value={userPage}
              onChange={setUserPage}
              total={Math.max(1, Math.ceil(userTotal / perPage))}
            />
          </Group>
        </Paper>
      )}

      <ChangeCredentialsModal
        opened={passwordModalOpened}
        email={selectedEmail}
        userId={selectedUserId}
        onClose={() => setPasswordModalOpened(false)}
      />

      <ChangePaymentPlanModal
        opened={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        onSave={handlePlanSave}
      />

      <EditUserModal
        opened={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setUserToEdit(null);
        }}
        user={userToEdit}
        userProps={(organization?.user_properties || []) as UserProperty[]}
        onSave={handleUserEditSave}
        mode="edit"
      />

      <EditUserModal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        user={null}
        userProps={(organization?.user_properties || []) as UserProperty[]}
        onSave={handleCreateUserSave}
        mode="create"
      />

      <DeleteConfirmModal
        opened={deleteModalOpen}
        user={userToDelete}
        loading={deleting}
        error={deleteError}
        onConfirm={handleConfirmDelete}
        onClose={handleCloseDelete}
      />

      <UserInfoModal
        user={selectedUserInfo}
        isOpen={userInfoModalOpen}
        onClose={() => {
          setUserInfoModalOpen(false);
          setSelectedUserInfo(null);
        }}
        userProperties={(organization?.user_properties || []).map(
          (p: { name: any; label: any; type: any; visible: any }) => ({
            name: String(p.name),
            label: stripHtml(String(p.label)),
            type: String(p.type || "").toLowerCase(),
            visible: p.visible,
          })
        )}
      />
    </>
  );
}
