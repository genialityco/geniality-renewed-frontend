// src/layouts/OrganizationLayout.tsx
import { Outlet, useLocation, matchPath } from "react-router-dom";
import AppShellWithAuth from "./AppShellWithAuth";

// Rutas que traen su propio encabezado de pantalla completa (su propio AppShell
// con header fijo). En ellas NO se debe renderizar el navbar de la organización,
// porque quedaría superpuesto con el header propio de la vista.
const FULLSCREEN_ROUTES = [
  "/organization/:organizationId/course/:eventId",
];

export default function OrganizationLayout() {
  const { pathname } = useLocation();
  const hideOrgHeader = FULLSCREEN_ROUTES.some((pattern) =>
    matchPath({ path: pattern, end: true }, pathname)
  );

  return (
    <>
      {/* Header/navbar de la organización (logo, nombre, acceso a perfil).
          Se oculta en vistas que traen su propio encabezado. */}
      {!hideOrgHeader && <AppShellWithAuth />}

      {/* Aquí se renderiza la ruta hija */}
      <Outlet />
    </>
  );
}
