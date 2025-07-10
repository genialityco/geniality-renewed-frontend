// src/layouts/AdminLayout.tsx
import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AppShell,
  ScrollArea,
  UnstyledButton,
  Group,
  Box,
  Text,
  Burger,
  useMantineTheme,
} from "@mantine/core";

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const theme = useMantineTheme();
  const location = useLocation();
  const [opened, setOpened] = useState(false);

  const links = [
    { to: "/admin/organizations", label: "Organizaciones" },
    { to: "/admin/users", label: "Usuarios" },
    { to: "/admin/reports", label: "Reportes" },
  ];

  return (
    <AppShell padding="md">
      {/* HEADER */}
      <AppShell.Header h={60}>
        <Group
          justify="space-between"
          align="center"
          style={{ height: "100%", padding: "0 16px" }}
        >
          <Group align="center" p="sm">
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              size="sm"
            />
            <Text size="lg" fw={500}>
              Admin Panel
            </Text>
          </Group>
          <Text>👤 Admin</Text>
        </Group>
      </AppShell.Header>

      {/* NAVBAR LATERAL */}
      <AppShell.Navbar w={{ base: 200 }} hidden={!opened}>
        <ScrollArea style={{ height: "100%" }}>
          {links.map((link) => {
            const active = location.pathname.startsWith(link.to);
            return (
              <UnstyledButton
                component={Link}
                to={link.to}
                key={link.to}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px",
                  marginBottom: "4px",
                  borderRadius: "4px",
                  textDecoration: "none",
                  backgroundColor: active
                    ? theme.colors.blue[0]
                    : "transparent",
                }}
              >
                <Text>{link.label}</Text>
              </UnstyledButton>
            );
          })}
        </ScrollArea>
      </AppShell.Navbar>

      {/* MAIN CONTENT */}
      <AppShell.Main>{children}</AppShell.Main>

      {/* FOOTER */}
      <AppShell.Footer h={40}>
        <Box style={{ textAlign: "center", width: "100%" }}>
          <Text size="xs">© 2025 Tu Empresa</Text>
        </Box>
      </AppShell.Footer>
    </AppShell>
  );
}
