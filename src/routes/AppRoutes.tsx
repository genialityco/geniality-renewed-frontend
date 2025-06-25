// src/routes/AppRoutes.tsx
import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Organizations from "../pages/Organizations";
import AuthPage from "../pages/AuthPage";
import NotFound from "../pages/NotFound";

import OrganizationLayout from "../layouts/OrganizationLayout";
import OrganizationDetail from "../pages/OrganizationDetail";
import CourseDetail from "../pages/course/CourseDetail";
import ActivityDetailContainer from "../pages/activity/ActivityDetailContainer";
import Profile from "../pages/profile";

import AdminOrganizationEvents from "../pages/admin/AdminOrganizationEvents";
import AdminEventEdit from "../pages/admin/AdminEventEdit";
import PaymentPage from "../pages/payment/PaymentPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/organizations" element={<Organizations />} />

      {/* Página dedicada de login/registro */}
      <Route
        path="/organization/:orgId/iniciar-sesion"
        element={<AuthPage />}
      />

      {/* TODO lo que dependa de una orgId */}
      <Route
        path="/organizations/:organizationId/*"
        element={<OrganizationLayout />}
      >
        <Route index element={<OrganizationDetail />} />
        <Route path="course/:eventId" element={<CourseDetail />} />
        <Route
          path="activitydetail/:activityId"
          element={<ActivityDetailContainer />}
        />
        <Route path="profile" element={<Profile />} />

        <Route path="admin">
          <Route index element={<AdminOrganizationEvents />} />
          <Route path="events/:eventId" element={<AdminEventEdit />} />
        </Route>

        <Route path="pagos" element={<PaymentPage />} />
      </Route>

      {/* Cualquiera otra */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
