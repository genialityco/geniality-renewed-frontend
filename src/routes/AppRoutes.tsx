// src/routes/AppRoutes.tsx
import { Routes, Route } from "react-router-dom";

import Organizations from "../pages/Organizations";
import AuthPage from "../pages/auth/AuthPage";
import NotFound from "../components/NotFound";

import OrganizationLayout from "../layouts/OrganizationLayout";
import CourseDetailWithTracker from "../pages/course/CourseDetailWithTracker";
import ActivityDetailContainer from "../pages/activity/ActivityDetailContainer";
import Profile from "../pages/profile";

import AdminOrganizationEvents from "../pages/admin/index";
import CoursePreview from "../pages/course/CoursePreview";
import PaymentStatus from "../pages/payment/PaymentStatus";
import OrganizationLanding from "../pages/organizationLanding";
import SuperAdmin from "../pages/superadmin";
import QuizPage from "../pages/course/QuizPage";
import QuizResultPage from "../pages/course/QuizResultPage";

import { RequireAuth, RequireMembership, RequireAdmin } from "./guards";

// ⭐ Nueva página de recuperación (contenido/UX):
import Recovery from "../pages/auth/RecoveryPassword/Recovery";
// import { DocumentsAdminPage } from "../pages/admin/DocumentsAdminPage";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      {/* <Route path="/" element={<Home />} /> */}
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
          <Route path="course/:eventId" element={<CourseDetailWithTracker />} />
          <Route path="course/:eventId/quiz/:quizId" element={<QuizPage />} />
          <Route path="course/:eventId/quiz/:quizId/result" element={<QuizResultPage />} />
          <Route
            path="activitydetail/:activityId"
            element={<ActivityDetailContainer />}
          />
        </Route>

        {/* Perfil: requiere ser MIEMBRO de esta organización (no solo estar
            logueado). Un miembro de otra org no debe ver el perfil aquí. No
            se exige suscripción vigente: el miembro debe poder entrar a ver o
            renovar su plan aunque esté vencido. */}
        <Route element={<RequireMembership checkPayment={false} />}>
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Recuperación de datos: solo requiere sesión (se abre desde un link
            enviado por correo, el usuario puede aún no ser miembro activo). */}
        <Route element={<RequireAuth />}>
          {/* ⭐ /organization/:organizationId/recuperar-datos?token=... */}
          <Route path="recuperar-datos" element={<Recovery />} />
        </Route>

        {/* Administración: requiere ser AUTOR de la organización o tener rol
            admin en ella. Antes esta ruta estaba SIN protección. */}
        <Route element={<RequireAdmin />}>
          <Route path="admin">
            <Route index element={<AdminOrganizationEvents />} />
            {/* Vista previa del curso/actividad tal como la ve el usuario final,
                sin exigir membresía ni pago (solo admins). */}
            <Route path="preview/:eventId" element={<CoursePreview />} />
          </Route>
        </Route>
        {/* <Route path="documents" element={<DocumentsAdminPage />} /> */}

        {/* Callback de pago puede ser público (o moverlo a RequireAuth si quieres) */}
        <Route path="pago-exitoso" element={<PaymentStatus />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
