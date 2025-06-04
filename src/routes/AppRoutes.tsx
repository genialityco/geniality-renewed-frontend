// AppRoutes.tsx
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Organizations from "../pages/Organizations";
import OrganizationDetail from "../pages/OrganizationDetail";
import NotFound from "../pages/NotFound";
import CourseDetail from "../pages/course/CourseDetail";
import ActivityDetailContainer from "../pages/activity/ActivityDetailContainer";
import Profile from "../pages/profile";

import AdminOrganizationEvents from "../pages/admin/AdminOrganizationEvents";
import AdminEventEdit from "../pages/admin/AdminEventEdit";
import PaymentPage from "../pages/payment/PaymentPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/organizations" element={<Organizations />} />
      <Route path="/organizations/:id" element={<OrganizationDetail />} />
      <Route path="/course/:eventId" element={<CourseDetail />} />
      <Route
        path="/activitydetail/:activityId"
        element={<ActivityDetailContainer />}
      />
      <Route path="/profile" element={<Profile />} />

      {/* 
        NUEVAS rutas de Admin:
        1. Listado de eventos de la organización
        2. Edición/Creación de un evento específico
      */}
      <Route
        path="/admin/organizations/:organizationId"
        element={<AdminOrganizationEvents />}
      />
      <Route
        path="/admin/organizations/:organizationId/events/:eventId"
        element={<AdminEventEdit />}
      />

      <Route path="/pagos/:organizationId" element={<PaymentPage />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
