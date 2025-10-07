import { useState } from "react";
import {
  Button,
  PasswordInput,
  Stack,
  Text,
  Notification,
  CheckIcon,
  Center,
} from "@mantine/core";
import { updatePassword } from "firebase/auth";
import { auth } from "../../../firebase/firebaseConfig";
import { FaX } from "react-icons/fa6";
import { useNavigate, useLocation, useParams } from "react-router-dom";

import {
  fetchOrganizationUserByEmail,
  createOrUpdateOrganizationUser,
  OrganizationUserPayload,
} from "../../../services/organizationUserService";

const unwrapId = (v: any) =>
  v && typeof v === "object" && "_id" in v ? (v as any)._id : v;

export async function updateMyOrgUserId(email: string, newId: string) {
  const user = await fetchOrganizationUserByEmail(email);
  if (!user) {
    throw new Error(`${email}: No se encontró el usuario en la organización.`);
  }
  const payload: OrganizationUserPayload = {
    properties: {
      ...(user.properties ?? {}),
      ID: newId,
    },
    rol_id: unwrapId((user as any).rol_id) ?? "",
    organization_id: unwrapId((user as any).organization_id),
    user_id: unwrapId((user as any).user_id),
    position_id: unwrapId((user as any).position_id) ?? "",
    payment_plan_id: unwrapId((user as any).payment_plan_id) ?? undefined,
  };
  const updated = await createOrUpdateOrganizationUser(payload);
  return updated;
}

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { organizationId } = useParams();

  const goBackToOrigin = () => {
    const fromState = (location.state as any)?.from;
    if (fromState?.pathname) {
      const path = fromState.pathname + (fromState.search || "");
      navigate(path, { replace: true });
      return;
    }
    if (document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.origin === window.location.origin) {
          window.location.href = ref.href;
          return;
        }
      } catch {}
    }
    if (organizationId) {
      navigate(`/organization/${organizationId}`, { replace: true });
    } else {
      navigate(`/`, { replace: true });
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Usuario no autenticado.");
      setLoading(false);
      return;
    }

    try {
      // 2) Actualiza ID en organization-user
      await updateMyOrgUserId(currentUser.email || "", newPassword);
      // 1) Actualiza contraseña en Firebase (lo usas como ID)
      await updatePassword(currentUser, newPassword);
      if (!organizationId) {
        throw new Error("No se encontró organizationId en la URL.");
      }

      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");

      // 3) Volver al origen
      goBackToOrigin();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.code === "auth/requires-recent-login"
          ? "Por seguridad, debes iniciar sesión de nuevo para cambiar tu ID."
          : err?.response?.data?.message ||
              err?.message ||
              "Error al cambiar el ID."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center mih="20vh" px="md">
      <Stack pt="md" maw={400} w="100%">
        <Text size="xl" fw={700}>
          Cambiar ID
        </Text>

        <PasswordInput
          label="Nuevo ID"
          value={newPassword}
          onChange={(e) => setNewPassword(e.currentTarget.value)}
          placeholder="••••••••"
        />

        <PasswordInput
          label="Confirmar ID"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.currentTarget.value)}
          placeholder="••••••••"
        />

        <Button onClick={handleChangePassword} loading={loading}>
          Cambiar ID
        </Button>

        {success && (
          <Notification icon={<CheckIcon />} color="teal" mt="sm">
            ID actualizado correctamente.
          </Notification>
        )}
        {error && (
          <Notification icon={<FaX />} color="red" mt="sm">
            {error}
          </Notification>
        )}
      </Stack>
    </Center>
  );
};

export default ChangePassword;
