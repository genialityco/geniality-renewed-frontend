// src/pages/auth/components/AuthForm.tsx
// (reemplazo completo, conserva el comentario del VincularTelefonoModal)
import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  TextInput,
  PasswordInput,
  Button,
  Group,
  Loader,
  Center,
  Image,
  Text,
  Container,
} from "@mantine/core";
import { useUser } from "../../../context/UserContext";
import { PropertyType } from "../../../services/types";
import { auth, RecaptchaVerifier } from "../../../firebase/firebaseConfig";
import { FaArrowLeft } from "react-icons/fa6";
// import VincularTelefonoModal from "./VincularTelefonoModal"; // 👈 se mantiene
import useOrganizationAuth from "../useOrganizationAuth";
import shouldRenderProperty from "../../../utils/shouldRenderProperty";
import DynamicField from "./DynamicField";
import EmailRecoverBlock from "./EmailRecoverBlock";
import SmsRecoverBlock from "./SmsRecoverBlock";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

function isProvidedByType(value: any, type?: string) {
  const t = (type ?? "").toLowerCase();
  if (t === "boolean") return value === true; // checkbox obligatorio => marcado
  if (Array.isArray(value)) return value.length > 0; // multiselect/lista múltiple
  if (typeof value === "string") return value.trim().length > 0; // texto/email/etc
  if (value === null || value === undefined) return false;
  // números/objetos: considera como provistos
  return true;
}

export default function AuthForm({}: { isPaymentPage?: boolean }) {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { signIn, signUp } = useUser();
  const { organization, loadingOrg } = useOrganizationAuth(organizationId);

  // Estado
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState(""); // SOLO login
  const [password, setPassword] = useState(""); // SOLO login
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Recuperación
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [resetMethod, setResetMethod] = useState<"email" | "sms" | null>(null);

  // Inicializar valores dinámicos
  useEffect(() => {
    if (!organization) return;
    const init: Record<string, any> = {};
    for (const prop of organization.user_properties || []) {
      init[prop.name] = prop.type === PropertyType.BOOLEAN ? false : "";
    }
    setFormValues(init);
  }, [organization]);

  // Limpiar errores al tipear email en registro (por si lo usas en reset)
  // Limpia errores SOLO cuando el usuario edita el email durante registro
  useEffect(() => {
    if (!isRegister) return;
    setFormError(null);
  }, [email, isRegister]);

  useEffect(() => {
    if (!organization || !isRegister) return;
    const props = organization.user_properties ?? [];

    // Recalcula visibilidad actual
    const nextVisible = new Map<string, boolean>();
    for (const p of props)
      nextVisible.set(p.name, shouldRenderProperty(p as any, formValues));

    // Si algún campo pasó a oculto, borramos su valor
    setFormValues((prev) => {
      const copy = { ...prev };
      let changed = false;
      for (const p of props) {
        const name = p.name;
        const shouldShow = nextVisible.get(name) ?? true;
        if (!shouldShow && name in copy) {
          delete copy[name];
          changed = true;
        }
      }
      return changed ? copy : prev;
    });
  }, [organization, isRegister, formValues]);

  const handleFieldChange = useCallback((name: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    // si había error, desaparece al empezar a corregir
    setFormError((prev) => (prev ? null : prev));
  }, []);

  const goHome = useCallback(() => {
    if (organization?._id) navigate(`/organization/${organization._id}`);
  }, [navigate, organization?._id]);

  // Helpers para ubicar campos clave en user_properties (registro)
  const getEmailFieldName = useCallback(() => {
    const props = organization?.user_properties ?? [];
    const byType = props.find((p) => p.type === PropertyType.EMAIL);
    if (byType?.name) return byType.name;
    const byName = props.find((p) => p.name?.toLowerCase?.() === "email");
    return byName?.name || "email";
  }, [organization]);

  const getIdFieldName = useCallback(() => {
    const props = organization?.user_properties ?? [];
    const aliases = [
      "id",
      "documento",
      "documentoid",
      "documentoidentidad",
      "documento_de_identidad",
      "cedula",
      "cédula",
      "ceduladeciudadania",
      "doc",
      "doc_identidad",
      "ID", // exact-case
    ];
    const set = new Set(props.map((p) => p.name));
    for (const k of aliases) {
      // busca exact y versión lowercase
      if (set.has(k)) return k;
      const found = props.find(
        (p) => p.name?.toLowerCase?.() === k.toLowerCase()
      );
      if (found) return found.name;
    }
    return "ID";
  }, [organization]);

  /** ------------ LOGIN ------------- */
  const handleSignIn = useCallback(async () => {
    if (!organization) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await signIn(email, password);
      if (auth.currentUser && !auth.currentUser.phoneNumber) {
        // setModalOpen(true); // 👈 se mantiene
        navigate(`/organization/${organization._id}`);
      } else {
        navigate(`/organization/${organization._id}`);
      }
    } catch (err: any) {
      let msg = "Error al iniciar sesión. Intenta de nuevo.";
      if (err?.code === "auth/user-not-found")
        msg = "No existe una cuenta con este correo.";
      else if (err?.code === "auth/invalid-credential")
        msg = "Email o contraseña incorrecta.";
      else if (err?.code === "auth/too-many-requests")
        msg = "Demasiados intentos fallidos. Intenta más tarde.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [organization, signIn, email, password, navigate]);

  /** ------------ REGISTRO ------------- */
  const handleSignUp = useCallback(async () => {
    if (!organization) return;
    setSubmitting(true);
    setFormError(null);

    const emailField = getEmailFieldName();
    const idField = getIdFieldName();

    const emailValue = formValues[emailField];
    const passwordValue = formValues[idField]; // 👈 contraseña = ID

    if (!emailValue) {
      setFormError("Por favor ingresa tu correo en el formulario.");
      setSubmitting(false);
      return;
    }
    if (!passwordValue) {
      setFormError("Por favor ingresa tu documento de identidad (ID).");
      setSubmitting(false);
      return;
    }

    // 🔐 Validación de campos mandatory visibles por dependencia
    const props = organization.user_properties ?? [];
    const missingLabels: string[] = [];

    for (const p of props) {
      // Solo validar cuando el campo se "muestra"
      const shouldShow = shouldRenderProperty(p as any, formValues);

      // Si la organización marca visible=false, igual aplicamos dependencia:
      // - Si no se muestra por dependencia => no se exige
      // - Si se muestra (dep cumplida) y mandatory => se exige
      if (!shouldShow) continue;

      if (p.mandatory) {
        const val = formValues[p.name];
        const ok = isProvidedByType(val, p.type);
        if (!ok) {
          // Usa el label si existe; fallback al name
          const label = (p as any).label ?? p.name;
          missingLabels.push(String(label));
        }
      }
    }

    if (missingLabels.length > 0) {
      setFormError(
        `Faltan campos obligatorios: ${missingLabels.join(
          ", "
        )}. Por favor complétalos.`
      );
      setSubmitting(false);
      return;
    }

    try {
      await signUp({
        email: emailValue,
        password: passwordValue, // (signUp prioriza ID; ver ajuste abajo)
        properties: { ...formValues, email: emailValue, ID: passwordValue },
        organizationId: organization._id,
        positionId: organization.default_position_id,
        rolId: "5c1a59b2f33bd40bb67f2322",
      });
      navigate(`/organization/${organization._id}`);
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        setFormError("Ya existe una cuenta con ese correo.");
      } else if (err?.code === "auth/weak-password") {
        setFormError("La contraseña es demasiado débil.");
      } else {
        setFormError("Error al registrarse. Intenta de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    organization,
    formValues,
    getEmailFieldName,
    getIdFieldName,
    signUp,
    navigate,
  ]);

  // Campos dinámicos SOLO para registro
  const dynamicFields = useMemo(() => {
    if (!organization || !isRegister) return null;
    const visibleProps = (organization.user_properties ?? [])
      .filter((p) => p.visible !== false && (p as any).visible !== "false")
      .filter((p) => shouldRenderProperty(p, formValues))
      .sort((a, b) => {
        const aw = a.order_weight ?? Number.MAX_SAFE_INTEGER;
        const bw = b.order_weight ?? Number.MAX_SAFE_INTEGER;
        if (aw !== bw) return aw - bw;
        const ai = a.index ?? 0;
        const bi = b.index ?? 0;
        return ai - bi;
      });

    return visibleProps.map((prop) => (
      <DynamicField
        key={prop.name}
        prop={prop}
        value={formValues[prop.name]}
        onChange={handleFieldChange}
        formValues={formValues}
      />
    ));
  }, [organization, isRegister, formValues, handleFieldChange]);

  const cleanResetStates = useCallback(() => {
    setResetMethod(null);
  }, []);

  // -------- Render principal --------
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

  return (
    <Container size="xs" p="md" style={{ maxWidth: 480 }}>
      {organization.styles?.event_image && (
        <Image
          src={organization.styles.event_image}
          alt={organization.name}
          mb="md"
          radius="sm"
          style={{ cursor: "pointer" }}
          onClick={goHome}
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
          onClick={goHome}
          size="xs"
        >
          Ir al inicio
        </Button>
      </Group>

      {/* --- Recuperación de contraseña --- */}
      {isResetPassword ? (
        <div>
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

          {resetMethod === "email" && (
            <EmailRecoverBlock
              email={email}
              setEmail={setEmail}
              organizationId={organizationId}
              onBack={() => setResetMethod(null)}
            />
          )}

          {resetMethod === "sms" && (
            <SmsRecoverBlock
              onCancelToChooser={() => setResetMethod(null)}
              onSuccessChangePassword={() => {
                setIsResetPassword(false);
                cleanResetStates();
              }}
            />
          )}

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
          {/* LOGIN: correo + contraseña */}
          {!isRegister && (
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
                label="Contraseña"
                placeholder="********"
                value={password}
                onChange={(e) => { setPassword(e.currentTarget.value); setFormError(null); }}
                mb="sm"
                required
              />
            </>
          )}

          {/* REGISTRO: solo user_properties */}
          {isRegister && (
            <>
              <Text c="dimmed" size="sm" mb="xs">
                Completa el formulario. La contraseña inicial se tomará del
                campo de identificación (ID).
              </Text>
              {dynamicFields}
            </>
          )}

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

          {/* Mantengo tu código comentado tal cual */}
          {/* <VincularTelefonoModal
            opened={modalOpen}
            organizationId={organization._id}
            organizationUser={organizationUserData}
            onClose={() => setModalOpen(false)}
          /> */}
        </>
      )}
    </Container>
  );
}
