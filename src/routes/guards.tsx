// src/routes/guards.tsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Flex, Loader, Text } from "@mantine/core";
import { useUser } from "../context/UserContext";
import { fetchPaymentPlanByUserAndOrg } from "../services/paymentPlansService";
import { fetchOrganizationUserByUserAndOrg } from "../services/organizationUserService";
import { fetchOrganizationById } from "../services/organizationService";
import { isOrgAuthor, hasAdminRole } from "../utils/orgAccess";

const PAYWALL_ORGANIZATION_ID = "63f552d916065937427b3b02";

function CenterLoader({ label = "Cargando..." }: { label?: string }) {
  return (
    <Flex
      justify="center"
      align="center"
      style={{ minHeight: "50vh", flexDirection: "column" }}
    >
      <Loader size="lg" variant="dots" />
      <Text mt="sm" c="dimmed">
        {label}
      </Text>
    </Flex>
  );
}

// src/routes/guards.tsx
export function RequireAuth() {
  const { loading, firebaseUser } = useUser();
  const location = useLocation();
  const { organizationId } = useParams();

  if (loading) return <CenterLoader label="Verificando sesión..." />;

  if (!firebaseUser) {
    // Guarda el token del query
    const usp = new URLSearchParams(location.search);
    const t = usp.get("token");
    if (t) sessionStorage.setItem("recovery_token", t);

    // 👉 Arma el "next" con pathname + search (incluye ?token=...)
    const next = encodeURIComponent(location.pathname + location.search);

    // Redirige al login de la org con ?next=...
    const loginPath = organizationId
      ? `/organization/${organizationId}/iniciar-sesion?next=${next}`
      : `/?next=${next}`;

    // Nota: mantenemos state.from por si ya lo usabas
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/**
 * Valida:
 * - Usuario logeado
 * - (Opcional) Pertenencia a la organización en URL
 * - (Opcional) Payment plan activo para ese usuario (date_until > now)
 *
 * `checkPayment=false` permite acotar una ruta a los miembros de la
 * organización sin exigir suscripción vigente (p. ej. el perfil, donde el
 * miembro debe poder ver/renovar su plan aunque esté vencido).
 */
export function RequireMembership({
  checkOrgMembership = true,
  checkPayment = true,
}: {
  checkOrgMembership?: boolean;
  checkPayment?: boolean;
}) {
  const { loading, firebaseUser, userId } = useUser();
  const { organizationId } = useParams();
  const location = useLocation();

  const [busy, setBusy] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  // Organización para la que se calculó la última decisión. Evita usar una
  // decisión de la org anterior durante el frame en que cambia la URL (lo que
  // mostraría contenido de otra org a un no-miembro por un instante).
  const [decidedOrg, setDecidedOrg] = useState<string | undefined>(undefined);

  const isExpired = (dateUntil?: string | number | Date) => {
    if (!dateUntil) return true;
    const until =
      typeof dateUntil === "string" || typeof dateUntil === "number"
        ? new Date(dateUntil)
        : dateUntil;
    return until < new Date();
  };

  useEffect(() => {
    let mounted = true;
    // Aún resolviendo la sesión de Firebase: no decidir, mantener el loader.
    if (loading) return;
    // Firebase ya resolvió pero el userId del backend todavía está cargando
    // (llega en una llamada posterior). No decidir aún: sin esto, un miembro
    // válido que recarga la página sería expulsado por un falso "sin acceso".
    if (firebaseUser && !userId) return;

    setBusy(true);
    (async () => {
      try {
        if (!firebaseUser || !userId) {
          setHasAccess(false);
          return;
        }

        // 1) (opcional) validar que pertenece a la org de la URL
        // Búsqueda scoped a (userId, organizationId): un usuario puede
        // pertenecer a varias organizaciones, así que nunca se resuelve
        // la membresía solo por userId.
        if (checkOrgMembership && organizationId) {
          try {
            const orgUser = await fetchOrganizationUserByUserAndOrg(
              userId,
              organizationId
            );
            if (!orgUser) {
              setHasAccess(false);
              return;
            }
          } catch {
            setHasAccess(false);
            return;
          }
        }

        // 2) validar payment plan (scoped a esta organización)
        if (!organizationId) {
          setHasAccess(false);
          return;
        }
        if (checkPayment) {
          const plan = await fetchPaymentPlanByUserAndOrg(
            userId,
            organizationId
          );
          if (!plan || isExpired(plan.date_until)) {
            setHasAccess(false);
            return;
          }
        }

        setHasAccess(true);
      } finally {
        if (mounted) {
          setDecidedOrg(organizationId);
          setBusy(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [
    loading,
    firebaseUser,
    userId,
    organizationId,
    checkOrgMembership,
    checkPayment,
  ]);

  // No decidir hasta que la resolución corresponda a la organización actual.
  if (loading || busy || decidedOrg !== organizationId)
    return <CenterLoader label="Validando membresía..." />;

  if (!firebaseUser) {
    const usePaymentMessage = organizationId === PAYWALL_ORGANIZATION_ID;
    const loginPath = organizationId
      ? usePaymentMessage
        ? `/organization/${organizationId}/iniciar-sesion?payment=1`
        : `/organization/${organizationId}/iniciar-sesion`
      : `/`;
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (!hasAccess) {
    // Envía a la landing de la org; ahí puedes abrir el modal de suscripción
    const fallback = organizationId ? `/organization/${organizationId}` : `/`;
    return (
      <Navigate
        to={fallback}
        replace
        state={{ reason: "membership_required", from: location }}
      />
    );
  }

  return <Outlet />;
}

/**
 * Valida que el usuario pueda administrar la organización de la URL.
 * El acceso se concede a quien sea AUTOR de la organización O tenga un rol
 * administrativo en su membresía (misma regla que `MyOrganizations`, ahora
 * centralizada en `utils/orgAccess`). Es autosuficiente: resuelve membresía
 * y organización aquí en vez de depender del estado reactivo del contexto,
 * para no bloquear a un admin/autor por una condición de carrera de carga.
 */
export function RequireAdmin() {
  const { loading, firebaseUser, userId } = useUser();
  const { organizationId } = useParams();
  const location = useLocation();

  const [busy, setBusy] = useState(true);
  const [canAccess, setCanAccess] = useState(false);
  // Ver nota en RequireMembership: ancla la decisión a la org calculada.
  const [decidedOrg, setDecidedOrg] = useState<string | undefined>(undefined);

  useEffect(() => {
    let mounted = true;
    // Aún resolviendo la sesión de Firebase: no decidir, mantener el loader.
    if (loading) return;
    // Firebase ya resolvió pero el userId del backend aún carga: esperar, para
    // no expulsar a un admin/autor válido por una condición de carrera.
    if (firebaseUser && !userId) return;

    setBusy(true);
    (async () => {
      try {
        if (!firebaseUser || !userId || !organizationId) {
          setCanAccess(false);
          return;
        }
        const [orgUser, org] = await Promise.all([
          fetchOrganizationUserByUserAndOrg(userId, organizationId).catch(
            () => null
          ),
          fetchOrganizationById(organizationId).catch(() => null),
        ]);
        const allowed =
          hasAdminRole(orgUser) || isOrgAuthor((org as any)?.author, userId);
        if (mounted) setCanAccess(allowed);
      } finally {
        if (mounted) {
          setDecidedOrg(organizationId);
          setBusy(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loading, firebaseUser, userId, organizationId]);

  if (loading || busy || decidedOrg !== organizationId)
    return <CenterLoader label="Verificando permisos..." />;

  if (!firebaseUser) {
    const loginPath = organizationId
      ? `/organization/${organizationId}/iniciar-sesion`
      : `/`;
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (!canAccess) {
    // 403: redirige a landing de la org o muestra un NotAuthorized
    const fallback = organizationId ? `/organization/${organizationId}` : `/`;
    return (
      <Navigate
        to={fallback}
        replace
        state={{ reason: "forbidden_admin_only", from: location }}
      />
    );
  }

  return <Outlet />;
}
