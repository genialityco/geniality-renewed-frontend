import { useState } from "react";
import { Tabs, Container, Paper } from "@mantine/core";
import UsersList from "./components/UsersList";
// Importa otros componentes de administración cuando los tengas

export const SuperAdmin = () => {
  const [activeTab, setActiveTab] = useState<string | null>("users");

  return (
    <Container size="xl" py="xl">
      <Paper shadow="md" p="lg" radius="md">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="users">Usuarios</Tabs.Tab>
            {/* <Tabs.Tab value="orgs">Organizaciones</Tabs.Tab> */}
            {/* Agrega más tabs según tus vistas */}
          </Tabs.List>

          <Tabs.Panel value="users">
            <UsersList />
          </Tabs.Panel>
          {/* <Tabs.Panel value="orgs">
            <OrganizationsList />
          </Tabs.Panel> */}
        </Tabs>
      </Paper>
    </Container>
  );
};

export default SuperAdmin;
