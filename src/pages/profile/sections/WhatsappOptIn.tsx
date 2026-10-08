import { useEffect, useState } from "react";
import { Card, Group, Loader, Stack, Switch, Text } from "@mantine/core";
import { FaWhatsapp } from "react-icons/fa6";
import { useOrganization } from "../../../context/OrganizationContext";
import {
  WhatsappOptIn as OptInState,
  fetchWhatsappOptIn,
  saveWhatsappOptIn,
} from "../../../services/whatsappPracticeService";
import { toastError, toastSaved } from "../../../utils/toast";

/**
 * Consentimiento del estudiante para recibir simulacros de práctica y
 * seguimiento académico por WhatsApp en la organización actual.
 */
export default function WhatsappOptIn() {
  const { organization } = useOrganization();
  const organizationId = organization?._id;
  const [state, setState] = useState<OptInState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    setLoading(true);
    fetchWhatsappOptIn(organizationId)
      .then(setState)
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, [organizationId]);

  if (!organizationId) return null;

  const handleChange = async (optIn: boolean) => {
    setSaving(true);
    try {
      setState(await saveWhatsappOptIn(organizationId, optIn));
      toastSaved(
        optIn ? "WhatsApp activado" : "WhatsApp desactivado",
        optIn
          ? "Recibirás simulacros de práctica y seguimiento por WhatsApp."
          : "Ya no recibirás prácticas por WhatsApp."
      );
    } catch (error: any) {
      toastError("No se pudo guardar", error?.response?.data?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card withBorder radius="md" p="md" mt="lg">
      <Stack gap="xs">
        <Group gap="xs">
          <FaWhatsapp size={18} color="#25D366" />
          <Text fw={600}>Prácticas por WhatsApp</Text>
        </Group>
        {loading ? (
          <Loader size="sm" />
        ) : !state ? (
          <Text size="sm" c="dimmed">
            No se pudo cargar esta preferencia.
          </Text>
        ) : (
          <>
            <Switch
              checked={state.opt_in}
              disabled={saving || (!state.has_phone && !state.opt_in)}
              onChange={(e) => handleChange(e.currentTarget.checked)}
              label="Acepto recibir simulacros de práctica y seguimiento académico por WhatsApp"
            />
            <Text size="xs" c="dimmed">
              {state.has_phone
                ? `Se enviarán al número terminado en ${state.phone_masked?.slice(-4)}. Son solo práctica y no afectan tus notas. Puedes desactivarlo cuando quieras o responder "baja" en WhatsApp.`
                : "No tienes un número de teléfono registrado en esta organización. Pide a tu administrador que lo agregue para activar esta opción."}
            </Text>
          </>
        )}
      </Stack>
    </Card>
  );
}
