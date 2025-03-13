import "@mantine/core/styles.css";
import {
  MantineProvider,
  Group,
  Avatar,
  Text,
  Modal,
  TextInput,
  Button,
} from "@mantine/core";
import { useState, useEffect } from "react";
import AppRoutes from "./routes/AppRoutes";
import { theme } from "./theme";
import { UserProvider, useUser } from "./context/UserContext";

function AppShellWithAuth() {
  const { firebaseUser, userId, name, email, loading, updateUserData } =
    useUser();
  const [opened, setOpened] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempEmail, setTempEmail] = useState("");

  // Cuando firebaseUser cambia, si no tenemos nombre/email guardados en el contexto,
  // podríamos requerirlos.
  useEffect(() => {
    // Caso 1: Aún estamos cargando => no mostramos modal
    if (loading) return;

    // Caso 2: No hay firebaseUser => algo raro, no hacemos nada, probablemente signInAnonymously
    if (!firebaseUser) return;

    // Caso 3: Si tenemos userId, name y email en el contexto, significa que ya están registrados
    if (userId && name && email) {
      setOpened(false);
    } else {
      // Si no tenemos name/email => mostramos modal para solicitarlos
      setOpened(true);
    }
  }, [firebaseUser, userId, name, email, loading]);

  // Maneja el formulario y llama updateUserData del contexto
  const handleSaveInfo = async () => {
    if (!tempName || !tempEmail) return;
    await updateUserData(tempName, tempEmail);
    // si todo va bien, se cierra el modal (en el useEffect se cerrará solo)
  };

  // Render del header con un avatar si tenemos name/email
  const renderHeader = () => {
    return (
      <div>
        <Group justify="space-between" align="center" style={{ height: "100%" }}>
          <Text fw="bold" size="xl">
            Mi App
          </Text>
          {userId ? (
            <Group>
              <Avatar radius="xl">{name?.charAt(0) || "U"}</Avatar>
              <Text size="sm">{name || email || "Usuario"}</Text>
            </Group>
          ) : (
            <Text size="sm">Cargando usuario...</Text>
          )}
        </Group>
      </div>
    );
  };

  return (
    <>
      {renderHeader()}
      <AppRoutes />

      {/* Modal para recopilar datos si no existen */}
      <Modal
        opened={opened}
        onClose={() => {}}
        withCloseButton={false}
        title="Completa tu información"
      >
        <TextInput
          label="Nombre"
          value={tempName}
          onChange={(e) => setTempName(e.currentTarget.value)}
          mb="sm"
        />
        <TextInput
          label="Correo"
          value={tempEmail}
          onChange={(e) => setTempEmail(e.currentTarget.value)}
          mb="sm"
        />
        <Button onClick={handleSaveInfo}>Guardar</Button>
      </Modal>
    </>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <UserProvider>
        <AppShellWithAuth />
      </UserProvider>
    </MantineProvider>
  );
}
