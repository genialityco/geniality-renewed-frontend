// SmsRecoverBlock.tsx
import { useState } from "react";
import { TextInput, PasswordInput, Button, Group, Text } from "@mantine/core";
import { signInWithPhoneNumber, updatePassword, User } from "firebase/auth";
import { auth, RecaptchaVerifier } from "../../../firebase/firebaseConfig";
import { getUserByPhone } from "../../../services/userService";

type Props = {
  onCancelToChooser: () => void;
  onSuccessChangePassword: () => void; // llamado cuando finaliza con éxito para que el padre cierre el modo reset
};

/** -----------------------------------
 *  Subcomponente: Recuperación por SMS
 *  ----------------------------------- */
export default function SmsRecoverBlock({
  onCancelToChooser,
  onSuccessChangePassword,
}: Props) {
  type Step = 1 | 2 | 3;
  const [resetPhone, setResetPhone] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [smsCode, setSmsCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [smsError, setSmsError] = useState("");

  const cleanToStep1 = () => {
    setStep(1);
    setSmsCode("");
    setConfirmationResult(null);
    setSmsError("");
  };

  const sendCode = async () => {
    setLoading(true);
    setSmsError("");
    try {
      const userByPhone = await getUserByPhone(resetPhone);
      if (!userByPhone) {
        setSmsError(
          "No existe un usuario con este número de teléfono, prueba recuperar con email."
        );
        return;
      }
      // Borra cualquier recaptcha anterior
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
      // El orden correcto: primero auth, luego id del div, luego opciones
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
      );
      // El div debe estar montado antes de esto
      const result = await signInWithPhoneNumber(
        auth,
        resetPhone,
        window.recaptchaVerifier
      );
      setConfirmationResult(result);
      setStep(2);
    } catch (error: any) {
      setSmsError(
        error?.message?.includes("blocked")
          ? "Demasiados intentos. Intenta más tarde."
          : error?.message || "No se pudo enviar el SMS."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setSmsError("");
    try {
      await confirmationResult.confirm(smsCode);
      setStep(3);
    } catch {
      setSmsError("Código incorrecto o expirado.");
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async () => {
    setLoading(true);
    setSmsError("");
    try {
      await updatePassword(auth.currentUser as User, newPassword);
      onSuccessChangePassword();
    } catch {
      setSmsError("Error cambiando la contraseña. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ margin: "1rem 0" }}>
      {step === 1 && (
        <>
          <TextInput
            label="Número de teléfono"
            placeholder="+573001234567"
            value={resetPhone}
            onChange={(e) => setResetPhone(e.currentTarget.value)}
            mb="sm"
            required
          />
          <div id="recaptcha-container" />
          <Group>
            <Button onClick={sendCode} loading={loading} mb="sm">
              Enviar código SMS
            </Button>
            <Button variant="subtle" onClick={onCancelToChooser}>
              Volver
            </Button>
          </Group>
        </>
      )}

      {step === 2 && (
        <>
          <TextInput
            label="Código recibido"
            placeholder="123456"
            value={smsCode}
            onChange={(e) => setSmsCode(e.currentTarget.value)}
            mb="sm"
          />
          <Button onClick={verifyCode} loading={loading} fullWidth mb="sm">
            Validar código
          </Button>
        </>
      )}

      {step === 3 && (
        <>
          <PasswordInput
            label="Nueva contraseña"
            placeholder="********"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            mb="sm"
          />
          <Button onClick={changePassword} loading={loading} fullWidth mb="sm">
            Cambiar contraseña
          </Button>
        </>
      )}

      {smsError && (
        <Text c="red" mt="sm">
          {smsError}
        </Text>
      )}

      {step > 1 && (
        <Button variant="subtle" size="xs" mt="sm" onClick={cleanToStep1}>
          Volver
        </Button>
      )}
    </div>
  );
}
