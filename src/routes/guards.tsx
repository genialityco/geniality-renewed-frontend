// src/routes/guards.tsx
import { useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Flex, Loader, Text } from "@mantine/core";
import { useUser } from "../context/UserContext";
import { fetchPaymentPlanByUserId } from "../services/paymentPlansService";
import { fetchOrganizationUserByUserId } from "../services/organizationUserService";

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

export function RequireAuth() {
  const { loading, firebaseUser } = useUser();
  const location = useLocation();
  const { organizationId } = useParams();

  if (loading) return <CenterLoader label="Verificando sesión..." />;

  if (!firebaseUser) {
    // Redirige al login de la org si existe, conservando la ruta destino
    const loginPath = organizationId
      ? `/organization/${organizationId}/iniciar-sesion`
      : `/`;
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
        if (checkOrgMembership && organizationId) {
          try {
            const orgUser = await fetchOrganizationUserByUserId(userId);
            const belongs =
              orgUser?.organization_id === organizationId ||
              (typeof orgUser?.organization_id === "object" &&
                orgUser?.organization_id !== null &&
                " _id" in orgUser.organization_id &&
                (orgUser.organization_id as { _id: string })._id === organizationId);
            if (!belongs) {
              setHasAccess(false);
              return;
            }
          } catch {
            setHasAccess(false);
            return;
          }
        }

        // 2) validar payment plan
        const plan = await fetchPaymentPlanByUserId(userId);
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
    const loginPath = organizationId
      ? `/organization/${organizationId}/iniciar-sesion?payment=1`
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
