// src/AppShellWithAuth.tsx
import { Group, Avatar, Text, Button, Menu, Image } from "@mantine/core";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useOrganization } from "../context/OrganizationContext";

export default function AppShellWithAuth() {
  const { userId, name, email, signOut: contextSignOut } = useUser();
  const { organization: headerOrg } = useOrganization();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // extrae el orgId de la URL: espera rutas que empiecen "/organization/:orgId"
  const segments = pathname.split("/").filter(Boolean);
  const orgId =
    segments[0] === "organization" && segments[1] ? segments[1] : null;

  const handleLogout = async () => {
    try {
      await contextSignOut();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleNavigate = (tab: string) => {
    if (orgId) {
      navigate(`/organization/${orgId}/profile?tab=${tab}`);
    } else {
      navigate(`/profile?tab=${tab}`);
    }
  };

  const handleAuthClick = () => {
    if (orgId) {
      navigate(`/organization/${orgId}/iniciar-sesion`);
    } else {
      // fallback si no hay orgId
      navigate(`/organization/iniciar-sesion`);
    }
  };

  return (
    <div style={{ padding: "0.5rem", borderBottom: "1px solid #ccc" }}>
      <Group justify="space-between" align="center" style={{ height: "100%" }}>
        <Group
          style={{ cursor: orgId ? "pointer" : "default" }}
          onClick={() => {
            if (orgId) {
              navigate(`/organization/${orgId}`);
            }
          }}
        >
          <Image
            src={
              headerOrg?.image ||
              "https://storage.googleapis.com/geniality-sas.appspot.com/evius/events/JqzemlKcQEClLYBMFxfSv8fAYX6PwXFZdKf0eNqT.png"
              // "https://firebasestorage.googleapis.com/v0/b/geniality-sas.appspot.com/o/images%2FLOGOS_GEN.iality_web-02.svg?alt=media&token=8290b734-ceb9-456c-b9d2-39b7ce736cb4"
            }
            w={80}
            radius="sm"
            style={{ boxShadow: "0 0 5px black" }}
          />
          <Text fw="bold" size="xl">
            {headerOrg?.name || "Endocampus"}
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
            <Button variant="outline" onClick={handleAuthClick}>
              Regístrate o Inicia sesión
            </Button>
          </Group>
        )}
      </Group>
    </div>
  );
}
