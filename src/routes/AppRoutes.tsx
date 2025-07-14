// src/routes/AppRoutes.tsx
import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Organizations from "../pages/Organizations";
import AuthPage from "../pages/AuthPage";
import NotFound from "../pages/NotFound";

import OrganizationLayout from "../layouts/OrganizationLayout";
import CourseDetail from "../pages/course/CourseDetail";
import ActivityDetailContainer from "../pages/activity/ActivityDetailContainer";
import Profile from "../pages/profile";

import AdminOrganizationEvents from "../pages/admin/index";
import MembershipPaymentSuccess from "../pages/payment/MembershipPaymentSuccess";
import OrganizationLanding from "../pages/organizationLanding";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Home />} />
      <Route path="/organizations" element={<Organizations />} />

      {/* Página dedicada de login/registro */}
      <Route
        path="/organization/:organizationId/iniciar-sesion"
        element={<AuthPage />}
      />

      {/* TODO lo que dependa de una orgId */}
      <Route
        path="/organization/:organizationId/*"
        element={<OrganizationLayout />}
      >
        <Route index element={<OrganizationLanding />} />
        <Route path="course/:eventId" element={<CourseDetail />} />
        <Route
          path="activitydetail/:activityId"
          element={<ActivityDetailContainer />}
        />
        <Route path="profile" element={<Profile />} />

        <Route path="admin">
          <Route index element={<AdminOrganizationEvents />} />
        </Route>

        <Route path="pago-exitoso"  element={<MembershipPaymentSuccess />} />
      </Route>

      {/* Cualquiera otra */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
