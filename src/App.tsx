import "@mantine/core/styles.css";
import {
  MantineProvider,
  Group,
  Avatar,
  Text,
  Button,
  Menu,
  Image,
} from "@mantine/core";
import { UserProvider, useUser } from "./context/UserContext";
import {
  BrowserRouter,
  useNavigate,
} from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { theme } from "./theme";
import { PaymentModalProvider } from "./context/PaymentModalContext";
import { AuthModalProvider, useAuthModal } from "./context/AuthModalContext";
import { OrganizationProvider, useOrganization } from "./context/OrganizationContext";

function AppShellWithAuth() {
  const { userId, name, email, signOut: contextSignOut } = useUser();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();
  const { organization: headerOrg } = useOrganization();

  const handleLogout = async () => {
    try {
      await contextSignOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleNavigate = (tab: string) => {
    navigate(`/profile?tab=${tab}`);
  };

  const renderHeader = () => (
    <div style={{ padding: "0.5rem", borderBottom: "1px solid #ccc" }}>
      <Group justify="space-between" align="center" style={{ height: "100%" }}>
        <Group justify="space-between">
          <Image
            src={
              headerOrg?.image
                ? headerOrg.image
                : "https://firebasestorage.googleapis.com/v0/b/geniality-sas.appspot.com/o/images%2FLOGOS_GEN.iality_web-02.svg?alt=media&token=8290b734-ceb9-456c-b9d2-39b7ce736cb4"
            }
            w={80}
            radius="sm"
            style={{ boxShadow: "0 0 5px black" }}
          />
          <Text fw="bold" size="xl">
            {headerOrg?.name || "Geniality SAS"}
          </Text>
        </Group>
        {userId ? (
          <Group>
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Avatar radius="xl">{name?.charAt(0) || "U"}</Avatar>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => handleNavigate("courses")}>
                  Mis cursos
                </Menu.Item>
                <Menu.Item onClick={() => handleNavigate("info")}>
                  Mis datos
                </Menu.Item>
                <Menu.Item color="red" onClick={handleLogout}>
                  Cerrar sesión
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <Text size="sm">{name || email || "Usuario"}</Text>
          </Group>
        ) : (
          <Group>
            <Button variant="outline" onClick={openAuthModal}>
              Registrate o Iniciar sesión
            </Button>
          </Group>
        )}
      </Group>
    </div>
  );

  return <>{renderHeader()}</>;
}

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <UserProvider>
        <AuthModalProvider>
          <PaymentModalProvider>
            <BrowserRouter>
              <OrganizationProvider>
                <AppShellWithAuth />
                <AppRoutes />
              </OrganizationProvider>
            </BrowserRouter>
          </PaymentModalProvider>
        </AuthModalProvider>
      </UserProvider>
    </MantineProvider>
  );
}
