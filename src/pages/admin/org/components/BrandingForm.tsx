import { useEffect, useState } from "react";
import {
  Stack,
  TextInput,
  FileInput,
  Button,
  Group,
  Alert,
  Loader,
  Image,
  Text,
  Box,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import {
  fetchOrganizationById,
  updateOrganization,
} from "../../../../services/organizationService";
import { uploadImageToFirebase } from "../../../../utils/uploadImageToFirebase";

type Props = { organizationId: string };

export default function BrandingForm({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [authUrl, setAuthUrl] = useState("");
  const [uploading, setUploading] = useState<"banner" | "logo" | "auth" | null>(
    null
  );
  // Conservamos el resto de estilos para no perderlos al guardar.
  const [otherStyles, setOtherStyles] = useState<Record<string, any>>({});

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        setTitle(org.name || "");
        setBannerUrl(org.styles?.banner_image || "");
        setLogoUrl(org.styles?.event_image || "");
        setAuthUrl(org.styles?.auth_image || "");
        const {
          banner_image: _b,
          event_image: _e,
          auth_image: _a,
          ...rest
        } = org.styles || {};
        setOtherStyles(rest);
      })
      .catch(() => setError("No se pudo cargar la organización"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const handleUpload = async (
    file: File | null,
    target: "banner" | "logo" | "auth"
  ) => {
    if (!file) return;
    setUploading(target);
    setError(null);
    try {
      const url = await uploadImageToFirebase(file, "org_branding");
      if (target === "banner") setBannerUrl(url);
      else if (target === "logo") setLogoUrl(url);
      else setAuthUrl(url);
    } catch {
      setError("No se pudo subir la imagen");
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      if (!title.trim()) {
        throw new Error("El título de la organización es obligatorio");
      }

      const payload = {
        name: title,
        styles: {
          ...otherStyles,
          banner_image: bannerUrl || undefined,
          event_image: logoUrl || undefined,
          auth_image: authUrl || undefined,
        },
      };

      await updateOrganization(organizationId, payload);
      setOk("Branding guardado correctamente");
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

      <TextInput
        label="Título de la organización"
        placeholder="Ej: Mi Organización"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        required
      />

      <Box>
        <FileInput
          label="Banner"
          placeholder="Selecciona una imagen"
          accept="image/*"
          onChange={(file) => handleUpload(file, "banner")}
          disabled={uploading === "banner"}
          description="La imagen se mostrará al 100% del ancho"
        />
        {uploading === "banner" && <Loader size="xs" mt="xs" />}
        {bannerUrl && (
          <Box mt="sm" p="sm" style={{ border: "1px solid #dee2e6" }}>
            <Text size="xs" c="dimmed" mb={8}>
              Vista previa:
            </Text>
            <Image
              src={bannerUrl}
              alt="Vista previa del banner"
              fit="contain"
              mah={150}
              w="100%"
            />
          </Box>
        )}
      </Box>

      <Box>
        <FileInput
          label="Logo"
          placeholder="Selecciona una imagen"
          accept="image/*"
          onChange={(file) => handleUpload(file, "logo")}
          disabled={uploading === "logo"}
          description="Se recomienda 200x200px o más con transparencia"
        />
        {uploading === "logo" && <Loader size="xs" mt="xs" />}
        {logoUrl && (
          <Box mt="sm" p="sm" style={{ border: "1px solid #dee2e6" }}>
            <Text size="xs" c="dimmed" mb={8}>
              Vista previa:
            </Text>
            <Image
              src={logoUrl}
              alt="Vista previa del logo"
              fit="contain"
              mah={100}
              w={100}
            />
          </Box>
        )}
      </Box>

      <Box>
        <FileInput
          label="Imagen de inicio de sesión y registro"
          placeholder="Selecciona una imagen"
          accept="image/*"
          onChange={(file) => handleUpload(file, "auth")}
          disabled={uploading === "auth"}
          description="Se mostrará en el formulario de inicio de sesión y de registro"
        />
        {uploading === "auth" && <Loader size="xs" mt="xs" />}
        {authUrl && (
          <Box mt="sm" p="sm" style={{ border: "1px solid #dee2e6" }}>
            <Text size="xs" c="dimmed" mb={8}>
              Vista previa:
            </Text>
            <Image
              src={authUrl}
              alt="Vista previa de la imagen de login/registro"
              fit="contain"
              mah={150}
              w="100%"
            />
          </Box>
        )}
      </Box>

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving}>
          Guardar branding
        </Button>
      </Group>
    </Stack>
  );
}
