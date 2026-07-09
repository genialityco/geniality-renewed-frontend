// src/routes/guards.tsx
import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Flex, Loader, Text } from "@mantine/core";
import { useUser } from "../context/UserContext";
import { fetchPaymentPlanByUserAndOrg } from "../services/paymentPlansService";
import { fetchOrganizationUserByUserAndOrg } from "../services/organizationUserService";

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
 * - Payment plan activo para ese usuario (date_until > now)
 */
export function RequireMembership({
  checkOrgMembership = true,
}: {
  checkOrgMembership?: boolean;
}) {
  const { loading, firebaseUser, userId } = useUser();
  const { organizationId } = useParams();
  const location = useLocation();

  const [busy, setBusy] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

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
    (async () => {
      try {
        if (loading) return;
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
        const plan = await fetchPaymentPlanByUserAndOrg(userId, organizationId);
        if (!plan || isExpired(plan.date_until)) {
          setHasAccess(false);
          return;
        }

        setHasAccess(true);
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loading, firebaseUser, userId, organizationId, checkOrgMembership]);

  if (loading || busy) return <CenterLoader label="Validando membresía..." />;

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
 * Valida que el usuario tenga rol admin en la organización.
 * Asume que `organizationUserData` en el UserContext tiene `rol_id` o similar.
 */
export function RequireAdmin() {
  const { loading, firebaseUser, organizationUserData } = useUser();
  const { organizationId } = useParams();
  const location = useLocation();

  const isAdmin = useMemo(() => {
    if (!organizationUserData) return false;
    const rid =
      typeof organizationUserData.rol_id === "string"
        ? organizationUserData.rol_id
        : organizationUserData.rol_id?._id;
    // Ajusta esta condición a tu modelo de roles
    return ["admin", "owner", "super_admin"].includes(
      String(rid || "").toLowerCase()
    );
  }, [organizationUserData]);

  if (loading) return <CenterLoader label="Verificando permisos..." />;

  if (!firebaseUser) {
    const loginPath = organizationId
      ? `/organization/${organizationId}/iniciar-sesion`
      : `/`;
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  if (!isAdmin) {
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
