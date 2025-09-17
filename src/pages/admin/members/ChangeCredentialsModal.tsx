// ChangeCredentialsModal.tsx
import { useMemo, useState } from "react";
import {
  Modal,
  TextInput,
  Group,
  Button,
  Text,
  SegmentedControl,
  Stack,
  ActionIcon,
} from "@mantine/core";
import api from "../../../services/api";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

interface Props {
  opened: boolean;
  email: string | null; // email actual conocido (opcional)
  userId?: string | null; // id interno (ideal)
  onClose: () => void;
}

type Mode = "password" | "email" | "both";

const isValidEmail = (s: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim().toLowerCase());

export default function ChangeCredentialsModal({
  opened,
  email,
  userId,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("password");

  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const currentEmail = (email ?? "").trim().toLowerCase();
  const nextEmail = (newEmail ?? "").trim().toLowerCase();

  const emailModeDisabled = useMemo(
    () => !userId && !currentEmail, // si no hay userId ni email, no podemos cambiar correo
    [userId, currentEmail]
  );

  const canSubmit = useMemo(() => {
    if (mode === "password") return newPassword.trim().length >= 6;
    // if (mode === "email")
    //   return isValidEmail(nextEmail) && nextEmail !== currentEmail;
    // // both
    const passOk = newPassword.trim().length >= 6;
    // const emailOk = isValidEmail(nextEmail) && nextEmail !== currentEmail;
    // return passOk || emailOk;
    return passOk;
  }, [mode, newPassword, nextEmail, currentEmail]);

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "password") {
        // Preferir userId; fallback a email (legacy)
        if (userId) {
          await api.post("/users/change-password", {
            userId,
            newPassword: newPassword.trim(),
          });
        } else if (currentEmail) {
          await api.post("/users/change-password-by-email", {
            email: currentEmail,
            newPassword: newPassword.trim(),
          });
        } else {
          throw new Error("Falta userId o email para cambiar la contraseña.");
        }
        setMessage("Contraseña cambiada correctamente.");
      } else if (mode === "email") {
        // if (!isValidEmail(nextEmail)) throw new Error("Correo inválido.");
        // if (nextEmail === currentEmail)
        //   throw new Error("El nuevo correo no puede ser igual al actual.");

        if (userId) {
          await api.post("/users/change-email-by-userid", {
            userId,
            newEmail: nextEmail,
          });
        } else if (currentEmail) {
          await api.post("/users/change-email-by-email", {
            currentEmail,
            newEmail: nextEmail,
          });
        } else {
          throw new Error(
            "Falta userId o email actual para cambiar el correo."
          );
        }
        setMessage("Correo actualizado correctamente.");
      } else {
        // both
        const payload: any = {
          newPassword:
            newPassword.trim().length >= 6 ? newPassword.trim() : undefined,
          newEmail:
            isValidEmail(nextEmail) && nextEmail !== currentEmail
              ? nextEmail
              : undefined,
        };

        if (!payload.newPassword && !payload.newEmail) {
          throw new Error(
            "Proporciona una contraseña válida y/o un nuevo correo válido."
          );
        }

        if (userId) payload.userId = userId;
        else if (currentEmail) payload.currentEmail = currentEmail;
        else
          throw new Error(
            "Falta userId o email actual para actualizar credenciales."
          );

        await api.post("/users/change-credentials", payload);
        setMessage("Credenciales actualizadas correctamente.");
      }
    } catch (err: any) {
      setMessage("Error: " + (err?.response?.data?.message || err?.message));
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = !!message && !message.startsWith("Error:");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Actualizar credenciales${email ? `: ${email}` : ""}`}
      centered
    >
      <Stack gap="md">
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          data={[
            { label: "Contraseña", value: "password" },
            { label: "Correo", value: "email", disabled: emailModeDisabled },
            { label: "Ambos", value: "both", disabled: emailModeDisabled },
          ]}
        />

        {(mode === "email" || mode === "both") && (
          <TextInput
            label="Nuevo correo"
            placeholder="nuevo@correo.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.currentTarget.value)}
            // error={
            //   nextEmail && !isValidEmail(nextEmail)
            //     ? "Correo inválido"
            //     : nextEmail === currentEmail && mode !== "password"
            //     ? "Debe ser diferente al correo actual"
            //     : undefined
            // }
          />
        )}

        {(mode === "password" || mode === "both") && (
          <TextInput
            label="Nueva contraseña"
            type={showPassword ? "text" : "password"}
            placeholder="Mínimo 6 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            error={
              newPassword && newPassword.trim().length < 6
                ? "Mínimo 6 caracteres"
                : undefined
            }
            rightSection={
              <ActionIcon
                variant="subtle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </ActionIcon>
            }
          />
        )}

        <Group justify="space-between" mt="sm">
          <Button
            onClick={handleSubmit}
            loading={loading}
            disabled={!canSubmit}
          >
            Guardar cambios
          </Button>
          <Button variant="subtle" onClick={onClose}>
            Cancelar
          </Button>
        </Group>

        {message && (
          <Text mt="sm" c={isSuccess ? "green" : "red"}>
            {message}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
