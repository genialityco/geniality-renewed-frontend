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
  Title,
  Image,
  Text,
} from "@mantine/core";
import { useUser } from "../context/UserContext";
import { fetchOrganizationById } from "../services/organizationService";
import { UserProperty, PropertyType } from "../services/types"; // asume que defines estos tipos en un archivo común

export default function AuthForm({
  isPaymentPage
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
          init[prop.name] = prop.type === PropertyType.BOOLEAN ? false : "";
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
    if (!organization) return;

    try {
      await signIn(email, password);
      if (isPaymentPage) {
        navigate(`/organizations/${organization._id}/pagos`);
      } else {
        navigate(`/organizations/${organization._id}`);
      }
    } catch (err) {
      console.error(err);
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
      if (isPaymentPage) {
        navigate(`/organizations/${organization._id}/pagos`);
      } else {
        navigate(`/organizations/${organization._id}`);
      }
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

  const renderField = (prop: UserProperty) => {
    const common = {
      key: prop.name,
      label: prop.label,
      placeholder: prop.label,
      required: prop.mandatory,
      value: formValues[prop.name],
      onChange: (e: any) =>
        handleFieldChange(
          prop.name,
          e.currentTarget ? e.currentTarget.value : e
        ),
      mb: "sm" as const,
    };
    switch (prop.type) {
      case PropertyType.TEXT:
      case PropertyType.EMAIL:
        return <TextInput {...common} />;
      case PropertyType.CODEAREA:
        return <Textarea {...common} />;
      case PropertyType.BOOLEAN:
        return (
          <Checkbox
            key={prop.name}
            // Renderiza HTML en el label
            label={<span dangerouslySetInnerHTML={{ __html: prop.label }} />}
            checked={formValues[prop.name]}
            onChange={(e) =>
              handleFieldChange(prop.name, e.currentTarget.checked)
            }
            mb="sm"
          />
        );
      case PropertyType.LIST:
        return (
          <Select
            key={prop.name}
            label={prop.label}
            data={prop.options || []}
            placeholder={prop.label}
            required={prop.mandatory}
            value={formValues[prop.name]}
            onChange={(val) => handleFieldChange(prop.name, val)}
            mb="sm"
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
      <Title order={2} mb="lg">
        {organization.name}
      </Title>

      <TextInput
        label="Correo"
        placeholder="tucorreo@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        mb="sm"
        required
      />

      <PasswordInput
        label="Documento de identidad"
        placeholder="********"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        mb="sm"
        required
      />

      {isRegister && organization.user_properties.map(renderField)}

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
