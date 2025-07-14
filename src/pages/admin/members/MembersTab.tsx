// src/pages/AdminOrganizationEvents/MembersTab.tsx
import { useState, useEffect } from "react";
import { Loader, Text, Pagination, Paper, Group, ScrollArea } from "@mantine/core";

import BulkUploadSection from "./BulkUploadSection";
import SearchForm from "./SearchForm";
import ImportReport from "./ImportReport";
import MembersTable from "./MembersTable";
import ChangePasswordModal from "./ChangePasswordModal";
import ChangePaymentPlanModal from "./ChangePaymentPlanModal";

import {
  createOrUpdateOrganizationUser,
  fetchOrganizationUsersByOrganizationId,
} from "../../../services/organizationUserService";

import {
  createPaymentPlan,
  updatePaymentPlanDateUntil,
} from "../../../services/paymentPlansService";

import type {
  OrganizationUser,
  ImportReportType,
} from "../../../services/types";

import { useOrganization } from "../../../context/OrganizationContext";

export default function MembersTab() {
  const { organization } = useOrganization();
  const orgId = organization?._id!;
  const USER_LIMIT = 20;

  // Estados de usuarios
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [lastImportReport, setLastImportReport] = useState<ImportReportType | null>(null);

  // Modal de cambiar contraseña
  const [passwordModalOpened, setPasswordModalOpened] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

  // Modal de actualizar plan
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Carga usuarios (ya incluyen payment_plan_id)
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchOrganizationUsersByOrganizationId(
        orgId,
        userPage,
        USER_LIMIT,
        searchText
      );
      setUsers(data.results);
      setUserTotal(data.total);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (orgId) fetchUsers();
  }, [orgId, userPage, searchText]);

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

  // 1. Calcula la nueva fecha de vencimiento
  const date_until = new Date();
  date_until.setDate(date_until.getDate() + days);
  const isoDate = date_until.toISOString();

  // 2. Busca el usuario para leer su payment_plan_id actual
  const user = users.find((u) => u._id === selectedUserId);
  const existingPlan = user?.payment_plan_id as { _id: string } | undefined;

  if (
    existingPlan &&
    typeof existingPlan === "object" &&
    "_id" in existingPlan
  ) {
    // 3a. Si ya tiene plan, solo actualiza date_until
    await updatePaymentPlanDateUntil(existingPlan._id, isoDate);
  } else {
    // 3b. Si no tiene plan, lo crea
    const newPlan = await createPaymentPlan({
      days,
      date_until: isoDate,
      price,
      organization_user_id: selectedUserId,
    });

    // 4. Al crear, actualiza la referencia en OrganizationUser
    await createOrUpdateOrganizationUser({
      properties: user?.properties || {},
      rol_id: user?.rol_id || "",
      organization_id: user?.organization_id || "",
      position_id: user?.position_id || "",
      user_id: user?.user_id as string,
      payment_plan_id: newPlan._id,
    });
  }

  // 5. Cierra modal y recarga usuarios
  setPlanModalOpen(false);
  setSelectedUserId(null);
  fetchUsers();
};

return (
  <>
    {/* Acciones de importación y búsqueda */}
    <Paper withBorder radius="md" p="xs" mb="md">
      <Group grow align="flex-end">
        <BulkUploadSection
          onReport={(r) => {
            setLastImportReport(r);
            fetchUsers();
          }}
        />
      </Group>

      <Group grow align="flex-end">
        <SearchForm
          value={searchText}
          onSearch={(text) => {
            setSearchText(text);
            setUserPage(1);
          }}
        />
      </Group>
    </Paper>

    {/* Informe de importación */}
    {lastImportReport && (
      <Paper withBorder radius="md" p="md" mb="md" bg="gray.0">
        <ImportReport
          report={lastImportReport}
          onClear={() => setLastImportReport(null)}
        />
      </Paper>
    )}

    {/* Tabla de miembros */}
    {loadingUsers ? (
      <Loader />
    ) : users.length === 0 ? (
      <Text>No hay miembros registrados</Text>
    ) : (
      <Paper withBorder radius="md" p="md">
        <ScrollArea h={400} mb="md">
          <MembersTable
            users={users}
            onPasswordChange={(email) => {
              setSelectedEmail(email);
              setPasswordModalOpened(true);
            }}
            onUpdatePlan={handleUpdatePlan}
          />
        </ScrollArea>

        <Group justify="space-between" align="center" mt="md">
          <Text size="sm" c="dimmed">
            Total miembros: {userTotal}
          </Text>
          <Pagination
            value={userPage}
            onChange={setUserPage}
            total={Math.ceil(userTotal / USER_LIMIT)}
          />
        </Group>
      </Paper>
    )}

    {/* Modales */}
    <ChangePasswordModal
      opened={passwordModalOpened}
      email={selectedEmail}
      onClose={() => setPasswordModalOpened(false)}
    />

    <ChangePaymentPlanModal
      opened={planModalOpen}
      onClose={() => setPlanModalOpen(false)}
      onSave={handlePlanSave}
    />
  </>
);

}
