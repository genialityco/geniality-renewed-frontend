// src/routes/AppRoutes.tsx
import { Routes, Route } from "react-router-dom";

//import Home from "../pages/Home";
import Organizations from "../pages/Organizations";
import AuthPage from "../pages/auth/AuthPage";
import NotFound from "../components/NotFound";

import OrganizationLayout from "../layouts/OrganizationLayout";
import CourseDetail from "../pages/course/CourseDetail";
import ActivityDetailContainer from "../pages/activity/ActivityDetailContainer";
import Profile from "../pages/profile";

import AdminOrganizationEvents from "../pages/admin/index";
import PaymentStatus from "../pages/payment/PaymentStatus";
import OrganizationLanding from "../pages/organizationLanding";
import SuperAdmin from "../pages/superadmin";

import { RequireAuth, RequireMembership } from "./guards";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      {/*<Route path="/" element={<Home />} />*/}
      <Route path="/" element={<Organizations />} />
      <Route path="/superadmin" element={<SuperAdmin />} />

      {/* Login/registro por organización */}
      <Route
        path="/organization/:organizationId/iniciar-sesion"
        element={<AuthPage />}
      />

      {/* Todo lo de una organización */}
      <Route
        path="/organization/:organizationId/*"
        element={<OrganizationLayout />}
      >
        {/* Landing libre (desde aquí muestras estado de membresía y tu modal) */}
        <Route index element={<OrganizationLanding />} />

        {/* Rutas que requieren membresía activa */}
        <Route element={<RequireMembership />}>
          <Route path="course/:eventId" element={<CourseDetail />} />
          <Route
            path="activitydetail/:activityId"
            element={<ActivityDetailContainer />}
          />
        </Route>

        {/* Rutas que requieren solo sesión */}
        <Route element={<RequireAuth />}>
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Rutas que requieren rol admin */}
          <Route path="admin">
            <Route index element={<AdminOrganizationEvents />} />
          </Route>

        {/* Callback de pago puede ser público (o moverlo a RequireAuth si quieres) */}
        <Route path="pago-exitoso" element={<PaymentStatus />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
