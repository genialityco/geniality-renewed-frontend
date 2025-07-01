// src/components/AuthForm.tsx
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
} from "@mantine/core";
import { useUser } from "../context/UserContext";
import { fetchOrganizationById } from "../services/organizationService";
import { UserProperty, PropertyType } from "../services/types";

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

  const handleFieldChange = (name: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignIn = async () => {
    setSubmitting(true);
    setFormError(null);
    if (!organization) return;
    try {
      await signIn(email, password);
      navigate(`/organizations/${organization._id}`);
    } catch (err: any) {
      console.log(err);
      // Manejo de errores de Firebase Auth
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
    try {
      await signUp({
        email,
        password,
        properties: formValues,
        organizationId: organization._id,
        positionId: organization.default_position_id,
        rolId: "5c1a59b2f33bd40bb67f2322",
      });
      navigate(`/organizations/${organization._id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
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
        <Text color="red">Organización no encontrada</Text>
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
      key: prop.name,
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
            {...common}
            type={isPhoneField ? "tel" : "text"}
            inputMode={isPhoneField ? "tel" : "text"}
            // pattern solo si quieres forzar números y "+"
            // pattern={isPhoneField ? "[+0-9 ]*" : undefined}
          />
        );
      // ... el resto igual
      case PropertyType.EMAIL:
        return <TextInput {...common} type="email" inputMode="email" />;
      case PropertyType.CODEAREA:
        return <Textarea {...common} />;
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

  return (
    <div style={{ maxWidth: 480, margin: "2rem auto", textAlign: "left" }}>
      {organization.styles?.event_image && (
        <Image
          src={organization.styles.event_image}
          alt={organization.name}
          mb="md"
          radius="sm"
        />
      )}
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
        <Text color="red" mb="sm">
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
      </Group>
    </div>
  );
}
