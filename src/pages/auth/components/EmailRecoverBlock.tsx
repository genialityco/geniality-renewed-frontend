// EmailRecoverBlock.tsx
import { useState } from "react";
import { TextInput, Button, Group, Text } from "@mantine/core";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../../firebase/firebaseConfig";

type Props = {
  email: string;
  setEmail: (v: string) => void;
  organizationId?: string;
  onBack: () => void;
};

/** -----------------------------------
 *  Subcomponente: Recuperación por Email
 *  ----------------------------------- */
export default function EmailRecoverBlock({
  email,
  setEmail,
  organizationId,
  onBack,
}: Props) {
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const handleSend = async () => {
    setResetLoading(true);
    setResetMessage("");
    setResetError("");
    try {
      auth.languageCode = "es";
      await sendPasswordResetEmail(auth, email, {
        url: `${window.location.origin}/organization/${organizationId}`,
      });
      setResetMessage("¡Revisa tu correo para restablecer tu contraseña!");
    } catch (err: any) {
      setResetError(
        err?.code === "auth/user-not-found"
          ? "No existe una cuenta con ese correo."
          : "Error enviando el correo. Intenta más tarde."
      );
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <TextInput
        label="Correo"
        placeholder="tucorreo@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        mb="sm"
        required
      />
      <Group>
        <Button onClick={handleSend} loading={resetLoading}>
          Enviar enlace de recuperación
        </Button>
        <Button variant="subtle" onClick={onBack}>
          Volver
        </Button>
      </Group>
      {resetMessage && (
        <Text c="green" mt="sm">
          {resetMessage}
        </Text>
      )}
      {resetError && (
        <Text c="red" mt="sm">
          {resetError}
        </Text>
      )}
    </>
  );
}
