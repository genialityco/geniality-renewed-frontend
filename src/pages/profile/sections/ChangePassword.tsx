import { useState } from "react";
import {
  Button,
  PasswordInput,
  Stack,
  Text,
  Notification,
  CheckIcon,
} from "@mantine/core";
import { updatePassword } from "firebase/auth";
import { auth } from "../../../firebase/firebaseConfig";
import { FaX } from "react-icons/fa6";

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      await updatePassword(currentUser, newPassword);
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack pt="md" maw={400}>
      <Text size="xl" fw={700}>
        Cambiar Contraseña
      </Text>

      <PasswordInput
        label="Nueva contraseña"
        value={newPassword}
        onChange={(e) => setNewPassword(e.currentTarget.value)}
        placeholder="••••••••"
      />

      <PasswordInput
        label="Confirmar contraseña"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.currentTarget.value)}
        placeholder="••••••••"
      />

      <Button onClick={handleChangePassword} loading={loading}>
        Cambiar contraseña
      </Button>

      {success && (
        <Notification icon={<CheckIcon />} color="teal" mt="sm">
          Contraseña actualizada correctamente.
        </Notification>
      )}

      {error && (
        <Notification icon={<FaX />} color="red" mt="sm">
          {error}
        </Notification>
      )}
    </Stack>
  );
};

export default ChangePassword;
