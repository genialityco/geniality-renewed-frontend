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

interface EmailTemplate {
  enabled: boolean;
  subject: string;
  title: string;
  body: string;
}

export interface EmailTemplateVariable {
  /** Token tal cual se inserta, ej: "{{nombres}}" */
  token: string;
  /** Descripción legible */
  label: string;
}

type Props = {
  organizationId: string;
  /** Nombre del campo en la organización, ej: "welcome_email" */
  configKey: string;
  /** Texto explicativo mostrado arriba */
  infoText: React.ReactNode;
  /** Variables disponibles para insertar */
  variables: EmailTemplateVariable[];
  /** Placeholders / valores por defecto (solo como guía visual) */
  defaults: { subject: string; title: string; body: string };
  /** Etiqueta del switch de activación */
  enabledLabel: string;
};

export default function EmailTemplateForm({
  organizationId,
  configKey,
  infoText,
  variables,
  defaults,
  enabledLabel,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [tpl, setTpl] = useState<EmailTemplate>({
    enabled: true,
    subject: "",
    title: "",
    body: "",
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        const cfg = (org as any)[configKey] || {};
        setTpl({
          enabled: cfg.enabled !== false,
          subject: cfg.subject ?? "",
          title: cfg.title ?? "",
          body: cfg.body ?? "",
        });
      })
      .catch(() => setError("No se pudo cargar la organización"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [organizationId, configKey]);

  const handleChange = (key: keyof EmailTemplate, value: string | boolean) => {
    setTpl((prev) => ({ ...prev, [key]: value }));
  };

  const insertVariable = (
    field: "subject" | "title" | "body",
    token: string
  ) => {
    setTpl((prev) => ({ ...prev, [field]: (prev[field] || "") + token }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const payload = { [configKey]: tpl };
      await updateOrganization(organizationId, payload as any);
      setOk("Correo guardado correctamente");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  const VariableButtons = ({
    field,
  }: {
    field: "subject" | "title" | "body";
  }) => (
    <Group gap="xs" wrap="wrap" mb={4}>
      <Text size="xs" c="dimmed">
        Variables:
      </Text>
      {variables.map((v) => (
        <Button
          key={v.token}
          variant="light"
          size="compact-xs"
          onClick={() => insertVariable(field, v.token)}
          disabled={!tpl.enabled}
        >
          {v.token}
        </Button>
      ))}
    </Group>
  );

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
        <Text size="sm">{infoText}</Text>
        {variables.length > 0 && (
          <Text size="xs" mt={6}>
            <strong>Variables disponibles:</strong>{" "}
            {variables.map((v) => `${v.token} (${v.label})`).join(", ")}
          </Text>
        )}
      </Alert>

      <Switch
        label={enabledLabel}
        checked={tpl.enabled}
        onChange={(e) => handleChange("enabled", e.currentTarget.checked)}
      />

      <div>
        <VariableButtons field="subject" />
        <TextInput
          label="Asunto"
          placeholder={defaults.subject}
          value={tpl.subject}
          onChange={(e) => handleChange("subject", e.currentTarget.value)}
          disabled={!tpl.enabled}
        />
      </div>

      <div>
        <VariableButtons field="title" />
        <TextInput
          label="Título (encabezado dentro del correo)"
          placeholder={defaults.title}
          value={tpl.title}
          onChange={(e) => handleChange("title", e.currentTarget.value)}
          disabled={!tpl.enabled}
        />
      </div>

      <div>
        <VariableButtons field="body" />
        <Textarea
          label="Contenido"
          description="Texto principal del correo. Separa párrafos con una línea en blanco."
          placeholder={defaults.body}
          value={tpl.body}
          onChange={(e) => handleChange("body", e.currentTarget.value)}
          autosize
          minRows={5}
          maxRows={12}
          disabled={!tpl.enabled}
        />
      </div>

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving}>
          Guardar cambios
        </Button>
      </Group>
    </Stack>
  );
}
