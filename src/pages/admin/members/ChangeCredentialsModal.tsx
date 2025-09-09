// ChangeCredentialsModal.tsx
import { useState } from "react";
import {
  Modal,
  TextInput,
  Group,
  Button,
  Text,
  SegmentedControl,
  Stack,
} from "@mantine/core";
import api from "../../../services/api";

interface Props {
  opened: boolean;
  email: string | null; // email actual conocido (opcional)
  uid?: string | null; // si lo tienes, mejor (evita depender del email)
  onClose: () => void;
}

type Mode = "password" | "email" | "both";

export default function ChangeCredentialsModal({
  opened,
  email,
  uid,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>("password");

  const [newPassword, setNewPassword] = useState("");
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit =
    (mode === "password" && newPassword.length >= 6) ||
    (mode === "email" && newEmail.trim().length > 3) ||
    (mode === "both" &&
      (newPassword.length >= 6 || newEmail.trim().length > 3));

  const handleSubmit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "password") {
        // Si tienes uid, úsalo; si no, por email
        if (uid) {
          await api.post("/users/change-password", { uid, newPassword });
        } else if (email) {
          await api.post("/users/change-password-by-email", {
            email,
            newPassword,
          });
        } else {
          throw new Error("Falta uid o email para cambiar la contraseña.");
        }
        setMessage("Contraseña cambiada correctamente.");
      } else if (mode === "email") {
        if (uid) {
          await api.post("/users/change-email-by-uid", { uid, newEmail });
        } else if (email) {
          await api.post("/users/change-email-by-email", {
            currentEmail: email,
            newEmail,
          });
        } else {
          throw new Error("Falta uid o email actual para cambiar el correo.");
        }
        setMessage("Correo actualizado correctamente.");
      } else {
        // both
        const payload: any = {
          newPassword: newPassword || undefined,
          newEmail: newEmail || undefined,
        };
        if (uid) payload.uid = uid;
        else if (email) payload.currentEmail = email;
        else
          throw new Error(
            "Falta uid o email actual para actualizar credenciales."
          );

        await api.post("/users/change-credentials", payload);
        setMessage("Credenciales actualizadas correctamente.");
      }
    } catch (err: any) {
      setMessage("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

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
            { label: "Correo", value: "email" },
            { label: "Ambos", value: "both" },
          ]}
        />

        {(mode === "email" || mode === "both") && (
          <TextInput
            label="Nuevo correo"
            placeholder="nuevo@correo.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.currentTarget.value)}
          />
        )}

        {(mode === "password" || mode === "both") && (
          <TextInput
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
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
          <Text mt="sm" c={message.includes("correcta") ? "green" : "red"}>
            {message}
          </Text>
        )}
      </Stack>
    </Modal>
  );
}
