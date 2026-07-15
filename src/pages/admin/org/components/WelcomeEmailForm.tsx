import { useEffect, useState } from "react";
import {
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Alert,
  Loader,
  Switch,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import {
  fetchOrganizationById,
  updateOrganization,
} from "../../../../services/organizationService";

type Props = { organizationId: string };

interface WelcomeEmail {
  enabled: boolean;
  subject: string;
  title: string;
  body: string;
}

const DEFAULT_WELCOME: WelcomeEmail = {
  enabled: true,
  subject: "{{nombres}}, te damos la bienvenida",
  title: "¡Bienvenido(a)!",
  body: "Es un gusto darte la bienvenida a nuestra plataforma.\n\n¡Explora, aprende y fortalece tus conocimientos con nosotros!",
};

export default function WelcomeEmailForm({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [welcome, setWelcome] = useState<WelcomeEmail>(DEFAULT_WELCOME);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        const we = org.welcome_email || {};
        setWelcome({
          enabled: we.enabled !== false,
          subject: we.subject ?? "",
          title: we.title ?? "",
          body: we.body ?? "",
        });
      })
      .catch(() => setError("No se pudo cargar la organización"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const handleChange = (key: keyof WelcomeEmail, value: string | boolean) => {
    setWelcome((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const payload = { welcome_email: welcome };
      await updateOrganization(organizationId, payload as any);
      setOk("Correo de bienvenida guardado correctamente");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <Stack gap="md">
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert
          icon={<IconCheck size={16} />}
          color="green"
          variant="light"
          onClose={() => setOk(null)}
          withCloseButton
        >
          {ok}
        </Alert>
      )}

      <Alert color="blue" variant="light">
        <Text size="sm">
          Este correo se envía automáticamente cuando un usuario se registra en
          la organización. Usa la variable <code>{"{{nombres}}"}</code> para
          insertar el nombre del usuario en el asunto o el contenido. El correo
          usa el banner y el logo configurados en el <b>Branding</b>.
        </Text>
      </Alert>

      <Switch
        label="Enviar correo de bienvenida al registrarse"
        checked={welcome.enabled}
        onChange={(e) => handleChange("enabled", e.currentTarget.checked)}
      />

      <TextInput
        label="Asunto"
        placeholder="{{nombres}}, te damos la bienvenida"
        value={welcome.subject}
        onChange={(e) => handleChange("subject", e.currentTarget.value)}
        disabled={!welcome.enabled}
      />

      <TextInput
        label="Título (encabezado dentro del correo)"
        placeholder="¡Bienvenido(a)!"
        value={welcome.title}
        onChange={(e) => handleChange("title", e.currentTarget.value)}
        disabled={!welcome.enabled}
      />

      <Textarea
        label="Contenido"
        description="Texto principal del correo. Separa párrafos con una línea en blanco."
        placeholder={DEFAULT_WELCOME.body}
        value={welcome.body}
        onChange={(e) => handleChange("body", e.currentTarget.value)}
        autosize
        minRows={5}
        maxRows={12}
        disabled={!welcome.enabled}
      />

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving}>
          Guardar cambios
        </Button>
      </Group>
    </Stack>
  );
}
