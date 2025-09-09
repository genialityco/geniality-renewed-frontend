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
} from "@mantine/core";
import * as XLSX from "xlsx";
import { FaFileExcel } from "react-icons/fa6";

import BulkUploadSection from "./BulkUploadSection";
import SearchForm from "./SearchForm";
import ImportReport from "./ImportReport";
import MembersTable, { isPaymentPlan, stripHtml } from "./MembersTable";
import ChangeCredentialsModal from "./ChangeCredentialsModal";
import ChangePaymentPlanModal from "./ChangePaymentPlanModal";
import EditUserModal from "./EditUserModal";

import {
  createOrUpdateOrganizationUser,
  fetchOrganizationUsersByOrganizationId,
  fetchAllOrganizationUsersByOrganizationId,
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

export default function MembersTab() {
  const { organization } = useOrganization();
  const orgId = organization?._id!;

  const limitOptions = ["10", "20", "50", "100"];
  const [userLimit, setUserLimit] = useState("100");

  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);

  const [rawSearch, setRawSearch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [lastImportReport, setLastImportReport] =
    useState<ImportReportType | null>(null);

  // Modal de cambiar credenciales
  const [passwordModalOpened, setPasswordModalOpened] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Modal de actualizar plan
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Editar miembro
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<OrganizationUser | null>(null);

  // Formateador de fecha consistente (para Excel, matching con tabla)
  const dtfCO = new Intl.DateTimeFormat("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Bogota",
  });

  // --- Fetch con "stale guard"
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

  // Debounce del buscador
  useEffect(() => {
    const id = setTimeout(() => setSearchText(rawSearch.trim()), 350);
    return () => clearTimeout(id);
  }, [rawSearch]);

  // Abrir modal de actualizar plan
  const handleUpdatePlan = (userId: string) => {
    setSelectedUserId(userId);
    setPlanModalOpen(true);
  };

  // Guardar plan desde el modal
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
      "_id" in existingPlan
    ) {
      await updatePaymentPlanDateUntil(existingPlan._id, isoDate);
    } else {
      const newPlan = await createPaymentPlan({
        days,
        date_until: isoDate,
        price,
        organization_user_id: selectedUserId,
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

  // Editar miembro
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

  // Exportar a Excel (todos)
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

      const userProps = organization?.user_properties || [];

      const dataToExport = allUsers.map((user) => {
        const props = user.properties || {};
        const rawPlan = user.payment_plan_id;
        const planInfo = isPaymentPlan(rawPlan) ? rawPlan : undefined;

        const rowData: Record<string, string | number> = {};

        // propiedades dinámicas
        userProps.forEach((prop: { name: any; type: string; label: any }) => {
          const name = String(prop.name);
          const rawValue = props[name] ?? "";
          let cleanValue = stripHtml(String(rawValue));

          if (prop.type.toLowerCase() === "boolean") {
            cleanValue =
              cleanValue.toLowerCase() === "true" ? "Acepto" : "No acepto";
          }

          const label = stripHtml(String(prop.label));
          rowData[label] = cleanValue;
        });

        // columna Plan (formato consistente)
        rowData["Plan (Vencimiento)"] = planInfo
          ? dtfCO.format(new Date(planInfo.date_until))
          : "Sin plan";

        return rowData;
      });

      // headers estables
      const headers = userProps.map((prop: { label: any }) =>
        stripHtml(String(prop.label))
      );
      headers.push("Plan (Vencimiento)");

      // crea sheet sin headers automáticos y escribe encabezado en A1
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
      <Paper withBorder radius="md" p="xs" mb="md">
        <Group justify="space-between" mb="xs">
          <Group>
            <BulkUploadSection
              onReport={(r) => {
                setLastImportReport(r);
                fetchUsers();
              }}
            />
            <SearchForm
              value={rawSearch}
              onSearch={(text) => {
                setRawSearch(text);
                setUserPage(1);
              }}
            />
          </Group>
          <Button
            leftSection={<FaFileExcel />}
            variant="outline"
            onClick={handleExportToExcel}
            loading={exporting}
            disabled={exporting}
          >
            Exportar a Excel
          </Button>
        </Group>

        {lastImportReport && (
          <ImportReport
            report={lastImportReport}
            onClear={() => setLastImportReport(null)}
          />
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
              onPasswordChange={(email) => {
                setSelectedEmail(email);
                // opcional: intenta mapear uid a partir del email
                const byEmail = users.find(
                  (u) => String(u.properties?.email ?? "") === email
                );
                setSelectedUid(
                  typeof byEmail?.user_id === "string" ? byEmail.user_id : null
                );
                setPasswordModalOpened(true);
              }}
              onUpdatePlan={handleUpdatePlan}
              onEditUser={handleEditUser}
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

      {/* Modales */}
      <ChangeCredentialsModal
        opened={passwordModalOpened}
        email={selectedEmail}
        uid={selectedUid}
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
      />
    </>
  );
}
