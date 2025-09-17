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
  Modal, // 👈 Modal para campos faltantes
  List, // 👈 Lista opcional de campos con error
} from "@mantine/core";
import { useUser } from "../../../context/UserContext";
import { PropertyType } from "../../../services/types";
import { auth, RecaptchaVerifier } from "../../../firebase/firebaseConfig";
import {
  signOut as fbSignOut,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
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

/* =========================
 *  AYUDAS DE VALIDACIÓN
 * ========================= */
const ONLY_LETTERS_RE = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function detectKinds(
  label: string,
  name: string,
  type?: PropertyType | string
) {
  const lname = (name || "").toLowerCase();
  const llabel = (label || "").toLowerCase();
  const isEmailField = type === PropertyType.EMAIL || lname === "email";
  const isNamesField =
    lname === "nombres" ||
    llabel.includes("nombres") ||
    lname === "names" ||
    (llabel.includes("nombre") && !llabel.includes("correo"));
  const isSurnamesField =
    lname === "apellidos" ||
    llabel.includes("apellidos") ||
    lname === "surnames" ||
    llabel.includes("apellido");
  const isIdField =
    lname === "id" ||
    lname === "documento" ||
    lname === "documentoid" ||
    lname === "documentoidentidad" ||
    lname === "documento_de_identidad" ||
    lname === "cedula" ||
    lname === "cédula" ||
    lname === "doc" ||
    lname === "doc_identidad";
  const isPhoneField =
    lname.includes("phone") ||
    lname.includes("cel") ||
    llabel.includes("contacto") ||
    llabel.includes("tel") ||
    llabel.includes("teléfono") ||
    llabel.includes("telefono") ||
    lname === "numero de contacto" ||
    lname === "número de contacto" ||
    lname === "numero_de_contacto" ||
    lname === "phone";

  return {
    isEmailField,
    isNamesField,
    isSurnamesField,
    isIdField,
    isPhoneField,
  };
}

/** obligatorio efectivo: prop.mandatory || (depto/city && pais === "Colombia") */
function isEffectiveMandatory(prop: any, values: Record<string, any>) {
  const name = (prop?.name || "").toLowerCase();
  const isLocation = name === "departamento" || name === "city";
  const isColombia = (values?.pais || "") === "Colombia";
  return !!(prop?.mandatory || (isLocation && isColombia));
}

/** valida TODO lo visible y devuelve { name: error } y arreglo para el modal */
function validateRegistrationAll(
  properties: any[],
  values: Record<string, any>
): {
  fieldErrors: Record<string, string>;
  modalItems: Array<{ name: string; label: string; msg: string }>;
} {
  const fieldErrors: Record<string, string> = {};
  const modalItems: Array<{ name: string; label: string; msg: string }> = [];

  for (const p of properties || []) {
    // Validar solo si se muestra (dependencias satisfechas)
    const visible = shouldRenderProperty(p, values);
    if (!visible) continue;

    const name = p.name;
    const label = p.label || name;
    let val = values[name];

    // Requerido efectivo
    if (isEffectiveMandatory(p, values)) {
      const provided = isProvidedByType(val, p.type);
      if (!provided) {
        const msg = "Este campo es obligatorio.";
        fieldErrors[name] = msg;
        modalItems.push({ name, label, msg });
        continue;
      }
    }

    // Normaliza (solo para validaciones)
    if (typeof val === "string") val = val.trim();

    const {
      isEmailField,
      isNamesField,
      isSurnamesField,
      isIdField,
      isPhoneField,
    } = detectKinds(label, name, p.type);

    // Email
    if (isEmailField && val && !EMAIL_RE.test(String(val))) {
      const msg = "Formato de correo inválido.";
      fieldErrors[name] = msg;
      modalItems.push({ name, label, msg });
      continue;
    }

    // ID / Teléfono => solo dígitos y 6–15 de largo
    if ((isIdField || isPhoneField) && val) {
      const digits = String(val).replace(/\D+/g, "");
      if (!/^\d+$/.test(digits) || digits.length < 6 || digits.length > 15) {
        const msg = "Debe contener solo números y entre 6 y 15 dígitos.";
        fieldErrors[name] = msg;
        modalItems.push({ name, label, msg });
        continue;
      }
    }

    // Nombres / Apellidos => solo letras
    if (
      (isNamesField || isSurnamesField) &&
      val &&
      !ONLY_LETTERS_RE.test(String(val))
    ) {
      const msg = "Solo letras y espacios.";
      fieldErrors[name] = msg;
      modalItems.push({ name, label, msg });
      continue;
    }

    // Dependencias explícitas (por legibilidad)
    if (name === "departamento" && values.pais === "Colombia" && !val) {
      const msg = "Selecciona un departamento.";
      fieldErrors[name] = msg;
      modalItems.push({ name, label, msg });
      continue;
    }
    if (name === "city" && values.pais === "Colombia" && !val) {
      const msg = "Selecciona una ciudad.";
      fieldErrors[name] = msg;
      modalItems.push({ name, label, msg });
      continue;
    }
  }

  return { fieldErrors, modalItems };
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

  // Validación + Modal
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [modalOpened, setModalOpened] = useState(false);
  const [modalItems, setModalItems] = useState<
    Array<{ name: string; label: string; msg: string }>
  >([]);

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

  // Limpiar errores al tipear email en registro
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
    // limpia errores generales e inline del campo editado
    setFormError((prev) => (prev ? null : prev));
    setFieldErrors((prev) => {
      if (!prev[name]) return prev;
      const { [name]: _, ...rest } = prev;
      return rest;
    });
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
      if (set.has(k)) return k;
      const found = props.find(
        (p) => p.name?.toLowerCase?.() === k.toLowerCase()
      );
      if (found) return found.name;
    }
    return "ID";
  }, [organization]);

  /** --------- Limpieza de sesión para evitar “multi-dispositivo” --------- */
  const ensureCleanAuthSession = useCallback(async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {}
    try {
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
    } catch {}
    try {
      if (window.recaptchaVerifier) {
        // @ts-ignore
        if (typeof window.recaptchaVerifier.clear === "function") {
          // @ts-ignore
          window.recaptchaVerifier.clear();
        }
        window.recaptchaVerifier = undefined;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }, []);

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
    setSubmittedOnce(true); // activa mensajes "obligatorio" en campos

    const emailField = getEmailFieldName();
    const idField = getIdFieldName();

    const emailValue = formValues[emailField];
    const passwordValue = formValues[idField]; // contraseña = ID

    // Validación completa (obligatorios visibles + reglas por tipo)
    const props = organization.user_properties ?? [];
    const { fieldErrors: errors, modalItems } = validateRegistrationAll(
      props,
      formValues
    );

    // --- Errores estructurales (falta email / id que controlan cuenta) ---
    // Helpers para usar el label del schema y evitar duplicados en el modal
    const getLabel = (field: string, fallback: string) =>
      (props.find((p) => p.name === field)?.label as string) || fallback;

    const upsertModal = (name: string, label: string, msg: string) => {
      const idx = modalItems.findIndex((it) => it.name === name);
      const item = { name, label, msg };
      if (idx >= 0) modalItems[idx] = item; // reemplaza (evita duplicados)
      else modalItems.unshift(item);
    };

    if (!emailValue) {
      const label = getLabel(emailField, "Correo electrónico");
      const msg = "Este campo es obligatorio.";
      errors[emailField] = msg;
      upsertModal(emailField, label, msg);
    }

    if (!passwordValue) {
      const label = getLabel(idField, "ID");
      const msg = "Este campo es obligatorio.";
      errors[idField] = msg;
      upsertModal(idField, label, msg);
    } else {
      // Revalida límites 6–15 y solo dígitos para ID (por si acaso)
      const digits = String(passwordValue).replace(/\D+/g, "");
      if (!/^\d+$/.test(digits) || digits.length < 6 || digits.length > 15) {
        const label = getLabel(idField, "ID");
        const msg = "Debe contener solo números y entre 6 y 15 dígitos.";
        errors[idField] = msg;
        upsertModal(idField, label, msg);
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // 👉 Abre el modal con el mensaje que pediste
      setModalItems(modalItems);
      setModalOpened(true);
      setSubmitting(false);

      // Enfoque suave al primer campo inválido (para que vea el rojo)
      setTimeout(() => {
        const first = Object.keys(errors)[0];
        if (!first) return;
        const wrapper = document.querySelector<HTMLElement>(
          `[data-field="${first}"]`
        );
        wrapper?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        const input =
          document.querySelector<HTMLElement>(`[name="${first}"]`) ||
          wrapper?.querySelector<HTMLElement>(
            "input, textarea, [role='combobox']"
          );
        input?.focus?.();
      }, 50);
      return;
    }

    try {
      // 🚫 Evita sesión previa que dispara “multi-dispositivo”
      await ensureCleanAuthSession();

      await signUp({
        email: emailValue,
        password: passwordValue, // (signUp prioriza ID)
        properties: { ...formValues, email: emailValue, ID: passwordValue },
        organizationId: organization._id,
        positionId: organization.default_position_id,
        rolId: "5c1a59b2f33bd40bb67f2322",
      });

      // 🔄 Refresca token para que el backend cuente solo ESTA sesión
      try {
        await auth.currentUser?.getIdToken(true);
      } catch {}

      navigate(`/organization/${organization._id}`);
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        setFormError("Ya existe una cuenta con ese correo.");
      } else if (err?.code === "auth/weak-password") {
        setFormError("La contraseña es demasiado débil.");
      } else {
        const msg =
          typeof err?.message === "string" &&
          /dispositivo|sesion|sesión/i.test(err.message)
            ? err.message
            : "Error al registrarse. Intenta de nuevo.";
        setFormError(msg);
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
    ensureCleanAuthSession,
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
        submittedOnce={submittedOnce} // 👈 muestra "obligatorio" tras 1er submit
        externalError={fieldErrors[prop.name]} // 👈 pinta en rojo el campo
      />
    ));
  }, [
    organization,
    isRegister,
    formValues,
    handleFieldChange,
    submittedOnce,
    fieldErrors,
  ]);

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
                onChange={(e) => {
                  setPassword(e.currentTarget.value);
                  setFormError(null);
                }}
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

            <Button
              variant="subtle"
              onClick={async () => {
                // al alternar, resetea estados de validación y limpia sesión si va a registro
                const goingToRegister = !isRegister;
                setIsRegister(goingToRegister);
                setSubmittedOnce(false);
                setFieldErrors({});
                setFormError(null);
                if (goingToRegister) {
                  try {
                    await ensureCleanAuthSession();
                  } catch {}
                }
              }}
            >
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

      {/* 🧩 Modal que pediste: abre si hay faltantes y muestra el mensaje */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Faltan datos por completar"
        centered
      >
        <Text size="sm" mb="sm">
          Por favor ingresa los <b>campos faltantes marcados en rojo</b>.
        </Text>

        {modalItems.length > 0 && (
          <>
            <Text size="sm" c="dimmed" mb="xs">
              Campos con problemas:
            </Text>
            <List spacing="xs">
              {modalItems.map((it) => (
                <List.Item key={it.name}>
                  <b>{it.label}:</b> {it.msg}
                </List.Item>
              ))}
            </List>
          </>
        )}

        <Group justify="flex-end" mt="md">
          <Button onClick={() => setModalOpened(false)}>Entendido</Button>
        </Group>
      </Modal>
    </Container>
  );
}
