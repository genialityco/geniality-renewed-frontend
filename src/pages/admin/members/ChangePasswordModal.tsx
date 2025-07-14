import { useState } from "react";
import { Modal, TextInput, Group, Button, Text } from "@mantine/core";
import api from "../../../services/api";

interface Props {
  opened: boolean;
  email: string | null;
  onClose: () => void;
}

export default function ChangePasswordModal({ opened, email, onClose }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = async () => {
    if (!email) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.post("/users/change-password-by-email", {
        email,
        newPassword: password,
      });
      setMessage("Contraseña cambiada correctamente.");
    } catch (err: any) {
      setMessage("Error: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={`Cambiar contraseña: ${email}`} centered>
      <TextInput
        label="Nueva contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        mb="md"
      />
      <Group justify="space-between">
        <Button onClick={handleChange} loading={loading} disabled={!password}>
          Cambiar
        </Button>
        <Button variant="subtle" onClick={onClose}>
          Cancelar
        </Button>
      </Group>
      {message && (
        <Text mt="sm" color={message.includes("correctamente") ? "green" : "red"}>
          {message}
        </Text>
      )}
    </Modal>
  );
}
