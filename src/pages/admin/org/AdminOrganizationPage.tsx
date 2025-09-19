// app/admin/organization/AdminOrganizationPage.tsx
import { useState } from "react";
import { Tabs, Title, Stack } from "@mantine/core";
import AdminOrganizationSettings from "./AdminOrganizationSettings"; // <- el tuyo
import AdminPaymentsExplorer from "./AdminPaymentsExplorer";

type Props = { organizationId: string };

export default function AdminOrganizationPage({ organizationId }: Props) {
  const [tab, setTab] = useState<string>("settings");

  return (
    <Stack>
      <Title order={2}>Administración de la Organización</Title>

      <Tabs value={tab} onChange={(v) => v && setTab(v)}>
        <Tabs.List>
          <Tabs.Tab value="settings">Ajustes</Tabs.Tab>
          <Tabs.Tab value="payments">Pagos</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="settings" pt="md">
          <AdminOrganizationSettings organizationId={organizationId} />
        </Tabs.Panel>

        <Tabs.Panel value="payments" pt="md">
          <AdminPaymentsExplorer organizationId={organizationId} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
