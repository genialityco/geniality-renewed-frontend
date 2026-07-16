import { useEffect, useRef, useState } from "react";
import {
  Stack,
  TextInput,
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
import EmailBuilder, {
  EmailBuilderHandle,
  BuilderVariable,
} from "./EmailBuilder";

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
  /** Valores por defecto (el body en texto plano se convierte a HTML) */
  defaults: { subject: string; title: string; body: string };
  /** Etiqueta del switch de activación */
  enabledLabel: string;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function escapeHtml(input: string): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Construye una plantilla de correo COMPLETA a partir de los valores por
 * defecto. Reproduce el aspecto anterior (encabezado, caja de título, saludo,
 * cuerpo, botón y barra inferior) pero todo queda editable/eliminable en el
 * constructor.
 */
function buildDefaultEmailHtml(defaults: {
  title: string;
  body: string;
}): string {
  const bodyHtml = String(defaults.body ?? "")
    .trim()
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td style="background:#0b3d91;color:#ffffff;padding:24px 16px;text-align:center;font-weight:700;font-size:20px;">
        Encabezado del correo
      </td>
    </tr>
    <tr>
      <td style="padding:18px 20px 8px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="padding:10px 16px;border:2px solid #d6e0ea;border-radius:12px;color:#0b3d91;font-weight:700;font-size:16px;text-align:center;">
              ${escapeHtml(defaults.title) || "¡Hola!"}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px 6px 24px;text-align:center;font-weight:800;color:#F05A28;font-size:18px;">
        Estimado(a) {{nombres}},
      </td>
    </tr>
    <tr>
      <td style="padding:0 24px 16px 24px;color:#111827;font-size:14px;line-height:1.7;text-align:justify;">
        ${bodyHtml}
      </td>
    </tr>
    <tr>
      <td style="padding:10px 24px 6px 24px;text-align:center;">
        <a href="{{enlace_acceso}}" style="display:inline-block;text-decoration:none;border:2px solid #F05A28;border-radius:999px;padding:12px 22px;font-weight:800;font-size:14px;color:#0b3d91;">
          Accede a tu cuenta
        </a>
      </td>
    </tr>
    <tr>
      <td style="background:#0b3d91;height:28px;line-height:28px;font-size:0;">&nbsp;</td>
    </tr>
  </table>`;
}

/** ¿El string ya contiene etiquetas HTML? */
function looksLikeHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(String(str ?? ""));
}

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

  const [enabled, setEnabled] = useState(true);
  const [subject, setSubject] = useState("");

  // Datos iniciales para el constructor (se leen al montarlo).
  const [initialDesign, setInitialDesign] = useState<any>(null);
  const [initialHtml, setInitialHtml] = useState<string>("");

  const builderRef = useRef<EmailBuilderHandle>(null);
  // Último HTML/diseño emitidos por el constructor.
  const latestRef = useRef<{ html: string; design: any }>({
    html: "",
    design: null,
  });

  const builderVariables: BuilderVariable[] = variables.map((v) => ({
    token: v.token,
    label: v.label,
  }));

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        const cfg = (org as any)[configKey] || {};

        setEnabled(cfg.enabled !== false);
        const hasSaved = !!(
          cfg.subject ||
          cfg.title ||
          cfg.body ||
          cfg.body_html ||
          cfg.html ||
          cfg.design_json
        );
        setSubject(hasSaved ? cfg.subject ?? "" : defaults.subject);

        // Precarga: diseño del constructor > HTML del constructor >
        // body_html heredado > plantilla por defecto.
        if (cfg.design_json) {
          setInitialDesign(cfg.design_json);
          setInitialHtml(cfg.html || "");
        } else if (cfg.html) {
          setInitialHtml(cfg.html);
        } else if (cfg.body_html) {
          setInitialHtml(
            looksLikeHtml(cfg.body_html) ? cfg.body_html : buildDefaultEmailHtml(defaults),
          );
        } else {
          setInitialHtml(buildDefaultEmailHtml(defaults));
        }
      })
      .catch(() => setError("No se pudo cargar la organización"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, configKey]);

  const insertSubjectVariable = (token: string) => {
    setSubject((prev) => (prev || "") + token);
  };

  const restoreDefaults = () => {
    const html = buildDefaultEmailHtml(defaults);
    setSubject(defaults.subject);
    builderRef.current?.loadHtml(html);
    latestRef.current = { html, design: null };
    setOk(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      // Toma lo más reciente directamente del editor.
      const data = builderRef.current?.getData() || latestRef.current;
      const payload = {
        [configKey]: {
          enabled,
          subject,
          html: data.html,
          design_json: data.design,
          // Migramos: el cuerpo ahora vive en html/design_json.
          body: "",
          body_html: "",
          title: "",
        },
      };
      await updateOrganization(organizationId, payload as any);
      setOk("Correo guardado correctamente");
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
        <Text size="sm">{infoText}</Text>
        {variables.length > 0 && (
          <Text size="xs" mt={6}>
            <strong>Variables disponibles:</strong>{" "}
            {variables.map((v) => `${v.token} (${v.label})`).join(", ")} — se
            reemplazan automáticamente al enviar el correo. Arrástralas desde el
            panel <b>Variables</b> del constructor.
          </Text>
        )}
      </Alert>

      <Switch
        label={enabledLabel}
        checked={enabled}
        onChange={(e) => setEnabled(e.currentTarget.checked)}
      />

      <div>
        <Group gap={4} wrap="wrap" mb={4}>
          <Text size="xs" c="dimmed">
            Variables:
          </Text>
          {variables.map((v) => (
            <Button
              key={v.token}
              variant="light"
              size="compact-xs"
              onClick={() => insertSubjectVariable(v.token)}
            >
              {v.token}
            </Button>
          ))}
        </Group>
        <TextInput
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.currentTarget.value)}
        />
      </div>

      <div>
        <Text size="sm" fw={500} mb={4}>
          Diseño del correo
        </Text>
        <Text size="xs" c="dimmed" mb={8}>
          Arrastra bloques (texto, imagen, columnas, botón) al lienzo. Sube
          imágenes de encabezado, pie o contenido con doble clic sobre una
          imagen. Para <b>cambiar el tamaño</b> de una imagen: selecciónala y
          arrastra las esquinas (mantiene la proporción), o ajusta el
          <b> ancho</b> en el panel <b>Dimensiones</b>. Usa el selector
          <b> Escritorio/Móvil</b> (arriba a la derecha) para ver cómo se verá en
          cada dispositivo. Este diseño es exactamente lo que recibirá el
          usuario.
        </Text>
        <EmailBuilder
          ref={builderRef}
          initialDesign={initialDesign}
          initialHtml={initialHtml}
          variables={builderVariables}
          onChange={(data) => {
            latestRef.current = data;
          }}
        />
      </div>

      <Group justify="space-between">
        <Button variant="subtle" color="gray" onClick={restoreDefaults}>
          Restaurar plantilla predeterminada
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Guardar cambios
        </Button>
      </Group>
    </Stack>
  );
}
