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
  Grid,
  Paper,
  Box,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCheck,
  IconPhoto,
} from "@tabler/icons-react";
import { useEditor } from "@tiptap/react";
import { RichTextEditor, Link } from "@mantine/tiptap";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import {
  fetchOrganizationById,
  updateOrganization,
} from "../../../../services/organizationService";
import { uploadImageToFirebase } from "../../../../utils/uploadImageToFirebase";

interface EmailTemplate {
  enabled: boolean;
  subject: string;
  title: string;
  /** Cuerpo en HTML (editor visual) */
  body_html: string;
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

/** Convierte texto plano (con saltos de línea) en HTML de párrafos. */
function textToHtml(text: string): string {
  const t = String(text ?? "").trim();
  if (!t) return "";
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** ¿El string ya contiene etiquetas HTML? */
function looksLikeHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(String(str ?? ""));
}

/** Sanitizado ligero para la vista previa (quita scripts y handlers on*). */
function sanitizeForPreview(html: string): string {
  return String(html ?? "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

/** Reemplaza {{clave}} con valores de ejemplo para la vista previa. */
function fillSampleVars(html: string): string {
  return String(html ?? "").replace(
    /\{\{\s*([\w-]+)\s*\}\}/gi,
    (match, key: string) => {
      const k = String(key).toLowerCase();
      if (k === "nombres") return "Juan Pérez";
      if (k === "fecha") return "31 de diciembre de 2026";
      return match;
    }
  );
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Imágenes de branding para la vista previa
  const [bannerUrl, setBannerUrl] = useState<string>("");
  const [footerUrl, setFooterUrl] = useState<string>("");

  const [tpl, setTpl] = useState<EmailTemplate>({
    enabled: true,
    subject: "",
    title: "",
    body_html: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentAppliedRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: true,
    extensions: [
      StarterKit,
      Underline,
      Link,
      Image.configure({
        HTMLAttributes: {
          style: "max-width:100%;height:auto;border-radius:8px;",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
      TextStyle,
      Color,
    ],
    content: "",
    onUpdate: ({ editor }) => {
      setTpl((prev) => ({ ...prev, body_html: editor.getHTML() }));
    },
  });

  const defaultBodyHtml = textToHtml(defaults.body);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    contentAppliedRef.current = false;
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        const styles = (org as any).styles || {};
        setBannerUrl(
          styles.banner_image_email || styles.banner_image || ""
        );
        setFooterUrl(styles.FooterImage || styles.logo_image || "");

        const cfg = (org as any)[configKey] || {};
        // Precarga: HTML guardado > texto plano heredado > plantilla por defecto.
        let bodyHtml: string;
        if (cfg.body_html) {
          bodyHtml = cfg.body_html;
        } else if (cfg.body) {
          bodyHtml = looksLikeHtml(cfg.body)
            ? cfg.body
            : textToHtml(cfg.body);
        } else {
          bodyHtml = defaultBodyHtml;
        }

        const hasSaved = !!(cfg.subject || cfg.title || cfg.body || cfg.body_html);
        setTpl({
          enabled: cfg.enabled !== false,
          subject: hasSaved ? cfg.subject ?? "" : defaults.subject,
          title: hasSaved ? cfg.title ?? "" : defaults.title,
          body_html: bodyHtml,
        });
      })
      .catch(() => setError("No se pudo cargar la organización"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, configKey]);

  // Aplica el contenido inicial al editor una vez esté listo.
  useEffect(() => {
    if (editor && !loading && !contentAppliedRef.current) {
      editor.commands.setContent(tpl.body_html || "<p></p>");
      contentAppliedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, loading]);

  // Habilita/deshabilita el editor según el switch.
  useEffect(() => {
    editor?.setEditable(tpl.enabled);
  }, [editor, tpl.enabled]);

  const handleChange = (key: keyof EmailTemplate, value: string | boolean) => {
    setTpl((prev) => ({ ...prev, [key]: value }));
  };

  const insertVariable = (field: "subject" | "title" | "body", token: string) => {
    if (field === "body") {
      editor?.chain().focus().insertContent(token).run();
      return;
    }
    setTpl((prev) => ({ ...prev, [field]: (prev[field] || "") + token }));
  };

  const handlePickImage = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImageToFirebase(file, "email_templates");
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      setError("No se pudo subir la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const restoreDefaults = () => {
    setTpl((prev) => ({
      ...prev,
      subject: defaults.subject,
      title: defaults.title,
      body_html: defaultBodyHtml,
    }));
    editor?.commands.setContent(defaultBodyHtml || "<p></p>");
    setOk(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const payload = {
        [configKey]: {
          enabled: tpl.enabled,
          subject: tpl.subject,
          title: tpl.title,
          body_html: editor ? editor.getHTML() : tpl.body_html,
          // Migramos: el cuerpo ahora vive en body_html.
          body: "",
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

  // ── Vista previa del correo (replica el layout real) ──
  const previewTitle = fillSampleVars(tpl.title) || "¡Hola!";
  const previewBody = sanitizeForPreview(fillSampleVars(tpl.body_html));

  const InputVariableButtons = ({
    field,
  }: {
    field: "subject" | "title";
  }) => (
    <Group gap={4} wrap="wrap" mb={4}>
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
            {variables.map((v) => `${v.token} (${v.label})`).join(", ")} — se
            reemplazan automáticamente al enviar el correo.
          </Text>
        )}
      </Alert>

      <Switch
        label={enabledLabel}
        checked={tpl.enabled}
        onChange={(e) => handleChange("enabled", e.currentTarget.checked)}
      />

      <Grid gutter="lg">
        {/* ─────────── Editor ─────────── */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Stack gap="md">
            <div>
              <InputVariableButtons field="subject" />
              <TextInput
                label="Asunto"
                value={tpl.subject}
                onChange={(e) => handleChange("subject", e.currentTarget.value)}
                disabled={!tpl.enabled}
              />
            </div>

            <div>
              <InputVariableButtons field="title" />
              <TextInput
                label="Título (encabezado dentro del correo)"
                value={tpl.title}
                onChange={(e) => handleChange("title", e.currentTarget.value)}
                disabled={!tpl.enabled}
              />
            </div>

            <div>
              <Group gap={4} wrap="wrap" mb={4}>
                <Text size="xs" c="dimmed">
                  Insertar variable:
                </Text>
                {variables.map((v) => (
                  <Button
                    key={v.token}
                    variant="light"
                    size="compact-xs"
                    onClick={() => insertVariable("body", v.token)}
                    disabled={!tpl.enabled}
                  >
                    {v.token}
                  </Button>
                ))}
              </Group>
              <Text size="sm" fw={500} mb={4}>
                Contenido
              </Text>
              <RichTextEditor editor={editor}>
                <RichTextEditor.Toolbar sticky stickyOffset={0}>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Underline />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.Highlight />
                    <RichTextEditor.ClearFormatting />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ColorPicker
                    colors={[
                      "#25262b",
                      "#868e96",
                      "#fa5252",
                      "#e64980",
                      "#be4bdb",
                      "#7950f2",
                      "#4c6ef5",
                      "#228be6",
                      "#15aabf",
                      "#12b886",
                      "#40c057",
                      "#82c91e",
                      "#fab005",
                      "#fd7e14",
                      "#F05A28",
                      "#0b3d91",
                    ]}
                  />

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.H1 />
                    <RichTextEditor.H2 />
                    <RichTextEditor.H3 />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.AlignLeft />
                    <RichTextEditor.AlignCenter />
                    <RichTextEditor.AlignRight />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Control
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!tpl.enabled || uploading}
                      aria-label="Insertar imagen"
                      title="Insertar imagen"
                    >
                      <IconPhoto size={16} />
                    </RichTextEditor.Control>
                  </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>

                <RichTextEditor.Content />
              </RichTextEditor>
              {uploading && (
                <Text size="xs" c="dimmed" mt={4}>
                  Subiendo imagen…
                </Text>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickImage}
                style={{ display: "none" }}
              />
            </div>
          </Stack>
        </Grid.Col>

        {/* ─────────── Vista previa ─────────── */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Text size="sm" fw={500} mb={4}>
            Vista previa del correo
          </Text>
          <Paper
            withBorder
            radius="md"
            style={{ overflow: "hidden", background: "#f4f6f8" }}
          >
            <Box
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid #e5e7eb",
                background: "#fff",
                fontSize: 13,
              }}
            >
              <Text size="xs" c="dimmed">
                Asunto
              </Text>
              <Text size="sm" fw={600} c="#111827">
                {fillSampleVars(tpl.subject) || "(sin asunto)"}
              </Text>
            </Box>
            <Box style={{ maxWidth: 640, margin: "0 auto", background: "#fff" }}>
              {bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt="banner"
                  style={{ display: "block", width: "100%", height: "auto" }}
                />
              ) : (
                <Box
                  style={{
                    background: "#0b3d91",
                    color: "#fff",
                    padding: "24px 16px",
                    textAlign: "center",
                    fontWeight: 700,
                  }}
                >
                  {/* Banner de la organización (configúralo en Branding) */}
                  Encabezado del correo
                </Box>
              )}

              <Box style={{ padding: "18px 20px 8px" }}>
                <Box
                  style={{
                    padding: "10px 16px",
                    border: "2px solid #d6e0ea",
                    borderRadius: 12,
                    color: "#0b3d91",
                    fontWeight: 700,
                    fontSize: 16,
                    textAlign: "center",
                  }}
                >
                  {previewTitle}
                </Box>
              </Box>

              <Box
                style={{
                  padding: "16px 24px 6px",
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#F05A28",
                  fontSize: 18,
                }}
              >
                Estimado(a) Juan Pérez,
              </Box>

              <Box
                style={{
                  padding: "0 24px 16px",
                  color: "#111827",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
                dangerouslySetInnerHTML={{ __html: previewBody }}
              />

              <Box style={{ padding: "10px 24px 6px", textAlign: "center" }}>
                <span
                  style={{
                    display: "inline-block",
                    border: "2px solid #F05A28",
                    borderRadius: 999,
                    padding: "12px 22px",
                    fontWeight: 800,
                    fontSize: 14,
                    color: "#0b3d91",
                  }}
                >
                  Accede a tu cuenta
                </span>
              </Box>

              {footerUrl && (
                <Box style={{ padding: "18px 24px 6px", textAlign: "center" }}>
                  <img
                    src={footerUrl}
                    alt="footer"
                    style={{ maxWidth: 220, height: "auto", margin: "0 auto" }}
                  />
                </Box>
              )}
              <Box
                style={{ background: "#0b3d91", height: 28 }}
              />
            </Box>
          </Paper>
          <Text size="xs" c="dimmed" mt={6}>
            Las variables se muestran con datos de ejemplo. El encabezado y el
            pie se toman del <b>Branding</b> de la organización.
          </Text>
        </Grid.Col>
      </Grid>

      <Group justify="space-between">
        <Button
          variant="subtle"
          color="gray"
          onClick={restoreDefaults}
          disabled={!tpl.enabled}
        >
          Restaurar plantilla predeterminada
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Guardar cambios
        </Button>
      </Group>
    </Stack>
  );
}
