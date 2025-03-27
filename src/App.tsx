import "@mantine/core/styles.css";
import {
  MantineProvider,
  Group,
  Avatar,
  Text,
  Button,
  Menu,
} from "@mantine/core";
import { UserProvider, useUser } from "./context/UserContext";
import { BrowserRouter, useNavigate } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { theme } from "./theme";
import { PaymentModalProvider } from "./context/PaymentModalContext";
import { AuthModalProvider, useAuthModal } from "./context/AuthModalContext";

function AppShellWithAuth() {
  const { firebaseUser, userId, name, email, loading, signOut: contextSignOut } = useUser();
  const { openAuthModal } = useAuthModal();
  const navigate = useNavigate();

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
    <div style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
      <Group justify="space-between" align="center" style={{ height: "100%" }}>
        <Text fw="bold" size="xl">
          Mi App
        </Text>
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
            <Button variant="outline" onClick={openAuthModal}>Registrate o Iniciar sesión</Button>
          </Group>
        )}
      </Group>
    </div>
  );

  return (
    <>
      {renderHeader()}
    </>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <UserProvider>
        <AuthModalProvider>
          <PaymentModalProvider>
            <BrowserRouter>
              <AppShellWithAuth />
              <AppRoutes />
            </BrowserRouter>
          </PaymentModalProvider>
        </AuthModalProvider>
      </UserProvider>
    </MantineProvider>
  );
}
