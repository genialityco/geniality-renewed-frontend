import { useEffect, useState } from "react";
import { Alert, Button, Group, Loader, Select, Stack, Text } from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import {
  fetchOrganizationById,
  updateOrganization,
} from "../../../../services/organizationService";
import type { UserProperty } from "../../../../services/types";

type Props = { organizationId: string };

const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

/**
 * Define qué casilla del formulario de registro cuenta como consentimiento
 * para recibir WhatsApp de la plataforma (recordatorios y notificaciones).
 * Quien se da de baja (BAJA por WhatsApp o desde su perfil) no recibe
 * mensajes aunque haya marcado la casilla.
 */
export default function WhatsappConsentForm({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [booleanProps, setBooleanProps] = useState<UserProperty[]>([]);
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        const props: UserProperty[] = Array.isArray(org.user_properties)
          ? org.user_properties
          : [];
        setBooleanProps(props.filter((p) => p.type === "boolean"));
        setValue(org.whatsapp_consent_property || null);
      })
      .catch(() => setError("No se pudo cargar la configuración."))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      await updateOrganization(organizationId, {
        whatsapp_consent_property: value,
      });
      setOk(
        value
          ? "Guardado. Quienes marcaron esa casilla podrán recibir WhatsApp de la plataforma."
          : "Guardado. Solo recibirán WhatsApp quienes lo activen en su perfil."
      );
    } catch {
      setError("No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <Stack>
      <Text size="sm">
        Meta exige consentimiento para los mensajes que inicia la plataforma.
        Siempre cuenta quien activa WhatsApp en su perfil; además, puedes
        indicar una casilla del registro cuyo texto cubra el contacto por
        WhatsApp. Quien se dé de baja no vuelve a recibir mensajes.
      </Text>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}
      {ok && (
        <Alert color="green" icon={<IconCheck size={16} />}>
          {ok}
        </Alert>
      )}

      <Select
        label="Casilla del registro que cuenta como consentimiento"
        placeholder="Ninguna (solo el opt-in del perfil)"
        data={booleanProps.map((p) => ({
          value: p.name,
          label: `${p.name} — ${stripHtml(p.label || "").slice(0, 90)}`,
        }))}
        value={value}
        onChange={setValue}
        clearable
        nothingFoundMessage="Esta organización no tiene campos de tipo booleano"
      />

      <Group justify="flex-end">
        <Button loading={saving} onClick={save}>
          Guardar
        </Button>
      </Group>
    </Stack>
  );
}
