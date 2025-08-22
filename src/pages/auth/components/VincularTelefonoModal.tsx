import { useEffect, useState } from "react";
import { Modal, TextInput, Button, Text, Group } from "@mantine/core";
import { auth, RecaptchaVerifier } from "../firebase/firebaseConfig";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  PhoneAuthProvider,
  linkWithCredential,
  signInWithPhoneNumber,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { createOrUpdateOrganizationUser } from "../services/organizationUserService";
import { createOrUpdateUser } from "../services/userService";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: any;
  }
}

export default function VincularTelefonoModal({
  opened,
  organizationUser,
  organizationId,
  onClose,
}: {
  opened: boolean;
  organizationUser: any;
  organizationId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setPhone(organizationUser?.properties.phone || "");
  }, [organizationUser]);

  const handleSendCode = async () => {
    setLoading(true);
    setError("");
    try {
      // Limpia cualquier recaptcha anterior
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        }
        window.recaptchaVerifier = new RecaptchaVerifier(
          auth,
          "recaptcha-link-container",
          { size: "invisible" }
        );
        window.confirmationResult = await signInWithPhoneNumber(
          auth,
          phone,
          window.recaptchaVerifier
        );
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Error enviando el código.");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    setLoading(true);
    setError("");
    try {
        const credential = PhoneAuthProvider.credential(
          window.confirmationResult.verificationId,
          code
        );
        await linkWithCredential(auth.currentUser!, credential);

      if (organizationUser.properties.phone !== phone) {
        const updatedOrganizationUser = {
          ...organizationUser,
          properties: {
            ...organizationUser.properties,
            phone,
          },
        };

        try {
          await createOrUpdateOrganizationUser(updatedOrganizationUser);
        } catch (error) {
          console.log(error);
        }
      }

      await createOrUpdateUser({
        uid: auth.currentUser!.uid,
        names: organizationUser.properties.names,
        email: organizationUser.properties.email,
        phone,
      });

      setStep(1);
      setPhone("");
      setCode("");
      onClose();
      navigate(`/organization/${organizationId}`);
    } catch (err: any) {
      setError(err.message || "Error vinculando teléfono.");
    } finally {
      setLoading(false);
    }
  };

  const onCancelGoHome = () => {
    setStep(1);
    setPhone("");
    setCode("");
    onClose();
    navigate(`/organization/${organizationId}`);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Vincular teléfono" centered>
      <Text size="xs" mb="xs">
        Vincula tu <b>número de teléfono</b> para recuperar tu cuenta por SMS si
        olvidas tu contraseña.
        <br />
        <span style={{ color: "#388e3c", fontWeight: 500 }}>
          Recomendado para mayor seguridad y acceso rápido.
        </span>
        <br />
        <span style={{ color: "#b71c1c", fontWeight: 500 }}>
          Si no lo vinculas, solo podrás recuperar la cuenta por email.
        </span>
      </Text>
{step === 1 && (
  <>
    <Text size="sm" mb={4}>Número de teléfono</Text>
    <PhoneInput
      defaultCountry="CO"
      value={phone}
      onChange={(value) => setPhone(value || "")}
      international
      countryCallingCodeEditable={false}
    />
    <div id="recaptcha-link-container" />
    <Group mt="md">
      <Button variant="subtle" color="gray" onClick={onCancelGoHome}>
        No, prefiero solo email
      </Button>
      <Button loading={loading} onClick={handleSendCode}>
        Enviar código
      </Button>
    </Group>
  </>
)}

      {step === 2 && (
        <>
          <TextInput
            label="Código recibido"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value)}
            mb="sm"
            required
          />
          <Group>
            <Button fullWidth loading={loading} onClick={handleLink}>
              Vincular teléfono
            </Button>
            <Button
              variant="subtle"
              onClick={() => {
                setStep(1);
                setCode("");
              }}
            >
              Volver
            </Button>
          </Group>
        </>
      )}
      {error && (
        <Text c="red" mt="sm">
          {error}
        </Text>
      )}
    </Modal>
  );
}
