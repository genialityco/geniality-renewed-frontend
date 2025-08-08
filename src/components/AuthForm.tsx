import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  TextInput,
  PasswordInput,
  Button,
  Group,
  Checkbox,
  Select,
  Textarea,
  Loader,
  Center,
  Image,
  Text,
  Container,
} from "@mantine/core";
import { useUser } from "../context/UserContext";
import { fetchOrganizationById } from "../services/organizationService";
import { UserProperty, PropertyType } from "../services/types";
import { auth, RecaptchaVerifier } from "../firebase/firebaseConfig";
import {
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  updatePassword,
  User,
} from "firebase/auth";
import { FaArrowLeft } from "react-icons/fa6";
// import VincularTelefonoModal from "./VincularTelefonoModal";
import { getUserByPhone } from "../services/userService";

// Esto le dice a TypeScript que window.recaptchaVerifier puede existir
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export default function AuthForm({
  isPaymentPage,
}: {
  isPaymentPage?: boolean;
}) {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { signIn, signUp } = useUser();

  const [organization, setOrganization] = useState<{
    _id: string;
    name: string;
    styles: any;
    default_position_id: string;
    user_properties: UserProperty[];
  } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  // Form state
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Recuperación de contraseña
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetMethod, setResetMethod] = useState<"email" | "sms" | null>(null);

  // Email reset
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  // SMS reset
  const [resetPhone, setResetPhone] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [smsCode, setSmsCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsError, setSmsError] = useState("");

  // Modal de vinculac telefono
  // const [modalOpen, setModalOpen] = useState(false);

  // Load organization & init formValues
  useEffect(() => {
    if (!organizationId) return;
    fetchOrganizationById(organizationId)
      .then((org) => {
        setOrganization({
          _id: org._id,
          name: org.name,
          styles: org.styles,
          default_position_id: org.default_position_id,
          user_properties: org.user_properties,
        });
        // initialize dynamic fields
        const init: Record<string, any> = {};
        org.user_properties.forEach((prop: UserProperty) => {
          if (prop.type === PropertyType.BOOLEAN) {
            init[prop.name] = false;
          } else {
            init[prop.name] = "";
          }
        });
        setFormValues(init);
      })
      .catch(() => setOrganization(null))
      .finally(() => setLoadingOrg(false));
  }, [organizationId]);

  useEffect(() => {
    if (isRegister && formError) setFormError(null);
  }, [email]);

  const handleFieldChange = (name: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async () => {
    if (!organization) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await signIn(email, password);
      if (auth.currentUser && !auth.currentUser.phoneNumber) {
        // setModalOpen(true);
        navigate(`/organization/${organization._id}`);
      } else {
        navigate(`/organization/${organization._id}`);
      }
    } catch (err: any) {
      let msg = "Error al iniciar sesión. Intenta de nuevo.";
      if (err?.code === "auth/user-not-found") {
        msg = "No existe una cuenta con este correo.";
      } else if (err?.code === "auth/invalid-credential") {
        msg = "Email o contraseña incorrecta.";
      } else if (err?.code === "auth/too-many-requests") {
        msg = "Demasiados intentos fallidos. Intenta más tarde.";
      }
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async () => {
    if (!organization) return;
    setSubmitting(true);
    setFormError(null);
    // Construye el objeto properties incluyendo todo lo necesario
    const propsToSend = {
      ...formValues,
      email,
      ID: formValues.ID || password || "",
      especialidad: formValues.especialidad || "",
      // Puedes agregar más si lo necesitas (ej: "names": formValues.names)
    };

    try {
      await signUp({
        email,
        password,
        properties: propsToSend,
        organizationId: organization._id,
        positionId: organization.default_position_id,
        rolId: "5c1a59b2f33bd40bb67f2322",
      });
      navigate(`/organization/${organization._id}`);
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        setFormError("Ya existe una cuenta con ese correo.");
      } else {
        setFormError("Error al registrarse. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Para limpiar todos los estados del reset
  const cleanResetStates = () => {
    setResetLoading(false);
    setResetMessage("");
    setResetError("");
    setResetPhone("");
    setConfirmationResult(null);
    setSmsCode("");
    setNewPassword("");
    setResetStep(1);
    setSmsLoading(false);
    setSmsError("");
    setResetMethod(null);
  };

  if (loadingOrg) {
    return (
      <Center style={{ height: "60vh" }}>
        <Loader size="xl" />
      </Center>
    );
  }
  if (!organization) {
    return (
      <Center style={{ height: "60vh" }}>
        <Text c="red">Organización no encontrada</Text>
      </Center>
    );
  }

  // Función para renderizar campos dependientes
  const shouldRenderProperty = (prop: UserProperty) => {
    if (
      prop.dependency &&
      prop.dependency.fieldName &&
      Array.isArray(prop.dependency.triggerValues) &&
      prop.dependency.triggerValues.length > 0
    ) {
      const depValue = formValues[prop.dependency.fieldName];
      return prop.dependency.triggerValues.includes(depValue);
    }
    return true;
  };

  const renderField = (prop: UserProperty) => {
    if (!shouldRenderProperty(prop)) return null;

    // Detectar campo teléfono
    const isPhoneField =
      prop.name?.toLowerCase().includes("phone") ||
      prop.name?.toLowerCase().includes("cel") ||
      prop.label?.toLowerCase().includes("contacto") ||
      prop.label?.toLowerCase().includes("tel");

    // Placeholder personalizado
    const placeholder = isPhoneField ? "+57 3121234567" : prop.label;

    const common = {
      label: prop.label,
      placeholder,
      required: prop.mandatory,
      value: formValues[prop.name],
      onChange: (e: any) =>
        handleFieldChange(
          prop.name,
          e?.currentTarget ? e.currentTarget.value : e
        ),
      mb: "sm" as const,
    };

    switch (prop.type) {
      case PropertyType.TEXT:
        return (
          <TextInput
            key={prop.name}
            {...common}
            type={isPhoneField ? "tel" : "text"}
            inputMode={isPhoneField ? "tel" : "text"}
          />
        );
      case PropertyType.EMAIL:
        return (
          <TextInput
            key={prop.name}
            {...common}
            type="email"
            inputMode="email"
          />
        );
      case PropertyType.CODEAREA:
        return <Textarea key={prop.name} {...common} />;
      case PropertyType.BOOLEAN:
        return (
          <Checkbox
            key={prop.name}
            label={<span dangerouslySetInnerHTML={{ __html: prop.label }} />}
            checked={formValues[prop.name]}
            onChange={(e) =>
              handleFieldChange(prop.name, e.currentTarget.checked)
            }
            mb="sm"
          />
        );
      case PropertyType.LIST:
        const options = Array.isArray(prop.options) ? prop.options : [];
        return (
          <Select
            key={prop.name}
            label={prop.label}
            data={options}
            placeholder={prop.label}
            required={prop.mandatory}
            value={formValues[prop.name]}
            onChange={(val) => handleFieldChange(prop.name, val)}
            mb="sm"
            searchable
          />
        );
      default:
        return <TextInput {...common} key={prop.name} />;
    }
  };

  // --- Flujo de recuperación por SMS ---
  const smsRecoverBlock = (
    <div style={{ margin: "1rem 0" }}>
      {resetStep === 1 && (
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
            <Button
              onClick={async () => {
                setSmsLoading(true);
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
                    { size: "invisible" }
                  );
                  // El div debe estar montado antes de esto
                  const result = await signInWithPhoneNumber(
                    auth,
                    resetPhone,
                    window.recaptchaVerifier
                  );
                  setConfirmationResult(result);
                  setResetStep(2);
                } catch (error: any) {
                  setSmsError(
                    error.message?.includes("blocked")
                      ? "Demasiados intentos. Intenta más tarde."
                      : error.message || "No se pudo enviar el SMS."
                  );
                } finally {
                  setSmsLoading(false);
                }
              }}
              loading={smsLoading}
              mb="sm"
            >
              Enviar código SMS
            </Button>
            <Button variant="subtle" onClick={() => setResetMethod(null)}>
              Volver
            </Button>
          </Group>
        </>
      )}
      {resetStep === 2 && (
        <>
          <TextInput
            label="Código recibido"
            placeholder="123456"
            value={smsCode}
            onChange={(e) => setSmsCode(e.currentTarget.value)}
            mb="sm"
          />
          <Button
            onClick={async () => {
              setSmsLoading(true);
              setSmsError("");
              try {
                await confirmationResult.confirm(smsCode);
                setResetStep(3);
              } catch (err: any) {
                setSmsError("Código incorrecto o expirado.");
              } finally {
                setSmsLoading(false);
              }
            }}
            loading={smsLoading}
            fullWidth
            mb="sm"
          >
            Validar código
          </Button>
        </>
      )}
      {resetStep === 3 && (
        <>
          <PasswordInput
            label="Nueva contraseña"
            placeholder="********"
            value={newPassword}
            onChange={(e) => setNewPassword(e.currentTarget.value)}
            mb="sm"
          />
          <Button
            onClick={async () => {
              setSmsLoading(true);
              setSmsError("");
              try {
                await updatePassword(auth.currentUser as User, newPassword);
                setResetMessage("¡Contraseña restablecida con éxito!");
                cleanResetStates();
                setIsResetPassword(false);
              } catch (err: any) {
                setSmsError("Error cambiando la contraseña. Intenta de nuevo.");
              } finally {
                setSmsLoading(false);
              }
            }}
            loading={smsLoading}
            fullWidth
            mb="sm"
          >
            Cambiar contraseña
          </Button>
        </>
      )}
      {smsError && (
        <Text c="red" mt="sm">
          {smsError}
        </Text>
      )}
      {resetStep > 1 && (
        <Button
          variant="subtle"
          size="xs"
          mt="sm"
          onClick={() => {
            setResetStep(1);
            setSmsCode("");
            setConfirmationResult(null);
            setSmsError("");
          }}
        >
          Volver
        </Button>
      )}
    </div>
  );

  // --- Flujo de recuperación por Email ---
  const emailRecoverBlock = (
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
        <Button
          onClick={async () => {
            setResetLoading(true);
            setResetMessage("");
            setResetError("");
            try {
              auth.languageCode = "es";
              await sendPasswordResetEmail(auth, email, {
                url: `${window.location.origin}/organization/${organizationId}`,
              });
              setResetMessage(
                "¡Revisa tu correo para restablecer tu contraseña!"
              );
            } catch (err: any) {
              setResetError(
                err.code === "auth/user-not-found"
                  ? "No existe una cuenta con ese correo."
                  : "Error enviando el correo. Intenta más tarde."
              );
            } finally {
              setResetLoading(false);
            }
          }}
          loading={resetLoading}
        >
          Enviar enlace de recuperación
        </Button>
        <Button variant="subtle" onClick={() => setResetMethod(null)}>
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

  // --- Render ---
  return (
    <Container size="xs" p="md" style={{ maxWidth: 480 }}>
      {organization.styles?.event_image && (
        <Image
          src={organization.styles.event_image}
          alt={organization.name}
          mb="md"
          radius="sm"
          style={{ cursor: "pointer" }}
          onClick={() => navigate(`/organization/${organization._id}`)}
        />
      )}
      <Group mb="md" justify="space-between" align="center">
        <Text fw={700} fz={24} mb="md">
          {isRegister
            ? "Crear cuenta"
            : isResetPassword
            ? "Recuperar contraseña"
            : "Iniciar sesión"}
        </Text>

        <Button
          variant="subtle"
          leftSection={<FaArrowLeft size={18} />}
          onClick={() => navigate(`/organization/${organization._id}`)}
          size="xs"
        >
          Ir al inicio
        </Button>
      </Group>
      <Text>{isPaymentPage && "📚 ¡Activa tu acceso en 2 pasos!"}</Text>
      <Text>
        {isPaymentPage &&
          "🪪 Paso 1: En este primer paso registras la cuenta con la que vas acceder."}
      </Text>
      <Text>
        {isPaymentPage &&
          "💳 Paso 2: Luego Realiza el pago para activar la cuenta."}
      </Text>
      <Text>
        {isPaymentPage && "👉 ¡Te tomará menos de 2 minutos comenzar!"}
      </Text>

      {/* --- Recuperación de contraseña (ambos métodos) --- */}
      {isResetPassword ? (
        <div>
          {/* Selección del método */}
          {!resetMethod && (
            <Group grow mb="md">
              <Button variant="light" onClick={() => setResetMethod("email")}>
                Recuperar por Email
              </Button>
              <Button
                variant="light"
                color="teal"
                onClick={() => setResetMethod("sms")}
              >
                Recuperar por SMS
              </Button>
            </Group>
          )}

          {resetMethod === "email" && emailRecoverBlock}
          {resetMethod === "sms" && smsRecoverBlock}

          <Button
            variant="light"
            mt="lg"
            fullWidth
            onClick={() => {
              setIsResetPassword(false);
              cleanResetStates();
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <>
          <TextInput
            label="Correo"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            mb="sm"
            required
          />

          <PasswordInput
            label="Documento de identidad / Contraseña"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            mb="sm"
            required
          />

          {isRegister &&
            organization.user_properties
              .filter(
                (prop) =>
                  ![
                    "email",
                    "correo",
                    "correo electrónico",
                    "id",
                    "documento",
                    "password",
                  ].includes(prop.name?.toLowerCase?.() || "")
              )
              .map((prop) => renderField(prop))}

          {formError && (
            <Text c="red" mb="sm">
              {formError}
            </Text>
          )}

          <Group mt="md">
            {isRegister ? (
              <Button fullWidth onClick={handleSignUp} loading={submitting}>
                Registrarse
              </Button>
            ) : (
              <Button fullWidth onClick={handleSignIn} loading={submitting}>
                Iniciar sesión
              </Button>
            )}
            <Button variant="subtle" onClick={() => setIsRegister((p) => !p)}>
              {isRegister ? "Ya tengo cuenta" : "Crear cuenta"}
            </Button>

            {!isRegister && (
              <Button
                variant="light"
                fullWidth
                mt="xs"
                onClick={() => {
                  setIsResetPassword(true);
                  cleanResetStates();
                }}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            )}
          </Group>
        </>
      )}
      {/* <VincularTelefonoModal
        opened={modalOpen}
        organizationId={organization._id}
        organizationUser={organizationUserData}
        onClose={() => setModalOpen(false)}
      /> */}
    </Container>
  );
}
