// app/admin/organization/AdminPaymentsExplorer.tsx
import { Stack, Title, Alert, Paper } from "@mantine/core";
import {
  usePaymentSearch,
  usePaymentModal,
  usePaymentPlan,
} from "./payments/HooksPayment";
import {} from "./payments/UtilsPayment";
import {
  PaymentFilters,
  PaymentTable,
  PaymentRawModal,
  PaymentPlanModal,
} from "./payments/ComponentsPayment";

type Props = {
  organizationId: string;
};

export default function AdminPaymentsExplorer({ organizationId }: Props) {
  // Hooks para manejo de estado
  const {
    filters,
    setQuery,
    setStatus,
    setDateFrom,
    setDateTo,
    page,
    setPage,
    loading,
    error,
    rows,
    totalPages,
    doSearch,
  } = usePaymentSearch(organizationId);

  const {
    rawOpen,
    sourceRow: rawSourceRow,
    openRawModal,
    closeRawModal,
  } = usePaymentModal();

  const {
    planOpen,
    loadingPlan,
    plan,
    planMsg,
    newUntil,
    setNewUntil,
    openPlanModal,
    closePlanModal,
  } = usePaymentPlan();

  return (
    <Stack>
      <Title order={4}>Explorador de Pagos</Title>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      <PaymentFilters
        filters={filters}
        loading={loading}
        onQueryChange={setQuery}
        onStatusChange={setStatus}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onSearch={doSearch}
      />

      <Paper withBorder p={0} radius="md">
        <PaymentTable
          rows={rows}
          loading={loading}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onViewRaw={openRawModal}
          onViewPlan={openPlanModal}
        />
      </Paper>

      {/* Modales */}
      <PaymentRawModal
        opened={rawOpen}
        onClose={closeRawModal}
        sourceRow={rawSourceRow}
      />

      <PaymentPlanModal
        opened={planOpen}
        onClose={closePlanModal}
        loading={loadingPlan}
        plan={plan}
        planMsg={planMsg}
        newUntil={newUntil}
        onNewUntilChange={setNewUntil}
      />
    </Stack>
  );
}
