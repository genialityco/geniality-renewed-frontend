// src/layouts/OrganizationLayout.tsx
import { Outlet } from "react-router-dom";
import AppShellWithAuth from "./AppShellWithAuth";

export default function OrganizationLayout() {
  return (
    <>
      {/* Header, botón de login que ahora redirige */}
      <AppShellWithAuth />

      {/* Aquí se renderiza la ruta hija */}
      <Outlet />
    </>
  );
}
