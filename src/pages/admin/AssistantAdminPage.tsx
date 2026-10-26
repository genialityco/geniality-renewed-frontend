// src/pages/admin/AssistantAdminPage.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Stack,
  Switch,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useOrganization } from "../../context/OrganizationContext";
import {
  AssistantConfig,
  fetchAssistantConfig,
  updateAssistantConfig,
} from "../../services/assistantService";

const errorMessage = (e: any) =>
  e?.response?.data?.message || e?.message || "Intenta de nuevo";

/**
 * Asistente por WhatsApp (Gemini): responde el texto libre de los miembros
 * sobre sus cursos, su avance y el contenido de los videos.
 */
export default function AssistantAdminPage() {
  const { organization } = useOrganization();
  const orgId = organization?._id;
  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [saved, setSaved] = useState<AssistantConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    setConfig(null);
    setError(null);
    fetchAssistantConfig(orgId)
      .then((c) => {
        setConfig(c);
        setSaved(c);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [orgId]);

  const dirty = JSON.stringify(config) !== JSON.stringify(saved);
  const patch = (changes: Partial<AssistantConfig>) =>
    setConfig((c) => (c ? { ...c, ...changes } : c));

  const save = async () => {
    if (!orgId || !config) return;
    setSaving(true);
    try {
      const c = await updateAssistantConfig(orgId, config);
      setConfig(c);
      setSaved(c);
      notifications.show({
        color: "green",
        title: "Guardado",
        message: c.enabled ? "El asistente está activo." : "El asistente está apagado.",
      });
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo guardar", message: errorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  if (error) return <Alert color="red" title="Error">{error}</Alert>;
  if (!config) return <Loader />;

  return (
    <Stack gap="lg" maw={760}>
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Asistente por WhatsApp</Title>
          <Text size="sm" c="dimmed">
            Responde con IA (Gemini) los mensajes de texto que los miembros
            escriben al número de WhatsApp: sus cursos, su avance, lo que les
            falta (actividades, exámenes, certificado) y dudas del contenido,
            con el enlace al minuto del video. Solo usa los datos de quien
            escribe. No interrumpe los retos, simulacros ni mensajes de Gen.ON:
            atiende lo que ningún otro flujo atendió.
          </Text>
          <Switch
            label="Activar el asistente en esta organización"
            checked={config.enabled}
            onChange={(e) => patch({ enabled: e.currentTarget.checked })}
          />
          {config.enabled && (
            <Alert color="orange" variant="light">
              Desde que guardes, cualquier miembro de la organización que
              escriba al número recibirá respuestas del asistente. Si un número
              pertenece a varias organizaciones con el asistente activo, se le
              pregunta de cuál quiere hablar (y puede cambiar escribiendo
              ORGANIZACIÓN).
            </Alert>
          )}
          <NumberInput
            label="Mensajes por persona al día"
            description="Al llegar al límite se le avisa y puede seguir al día siguiente."
            min={1}
            max={500}
            value={config.daily_limit}
            onChange={(v) => patch({ daily_limit: Number(v) || 1 })}
            maw={260}
          />
          <Switch
            label="Enlaces con acceso directo"
            description="Los enlaces de las respuestas entran con la sesión de la persona ya iniciada (válidos 7 días; nunca para administradores)."
            checked={config.auto_login_links}
            onChange={(e) => patch({ auto_login_links: e.currentTarget.checked })}
          />
          <Textarea
            label="Indicaciones de la organización"
            description="Opcional. Tono, temas en los que debe enfocarse o qué responder sobre soporte, pagos, etc."
            autosize
            minRows={4}
            maxLength={2000}
            value={config.instructions}
            onChange={(e) => patch({ instructions: e.currentTarget.value })}
          />
          <Group justify="flex-end">
            <Button onClick={save} loading={saving} disabled={!dirty}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
