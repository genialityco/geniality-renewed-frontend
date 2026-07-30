import { useEffect, useState } from "react";
import {
  Paper,
  Stack,
  Switch,
  NumberInput,
  Textarea,
  Button,
  Text,
  Divider,
  Loader,
  Group,
  Alert,
} from "@mantine/core";
import { fetchEventById, updateEvent } from "../../../services/eventService";
import { toastSaved, toastError } from "../../../utils/toast";

interface Props {
  eventId: string;
}

/**
 * Reglas de desbloqueo del certificado (por defecto sin reglas).
 * El admin puede exigir un número de actividades completadas y/o un número de
 * exámenes aprobados, con un mensaje personalizado cuando está bloqueado.
 */
export default function CertificateRulesConfig({ eventId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [requireActivities, setRequireActivities] = useState(false);
  const [activities, setActivities] = useState<number | string>(1);
  const [requireExams, setRequireExams] = useState(false);
  const [exams, setExams] = useState<number | string>(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ev = await fetchEventById(eventId);
        if (cancelled) return;
        setEnabled(!!ev.certificate_gating_enabled);
        if (ev.certificate_required_activities != null) {
          setRequireActivities(true);
          setActivities(ev.certificate_required_activities);
        }
        if (ev.certificate_required_exams != null) {
          setRequireExams(true);
          setExams(ev.certificate_required_exams);
        }
        setMessage(ev.certificate_locked_message || "");
      } catch (e) {
        console.error("Error cargando reglas del certificado:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateEvent(eventId, {
        certificate_gating_enabled: enabled,
        certificate_required_activities:
          enabled && requireActivities ? Number(activities) : null,
        certificate_required_exams:
          enabled && requireExams ? Number(exams) : null,
        certificate_locked_message: message,
      });
      toastSaved("Reglas del certificado guardadas");
    } catch (e: any) {
      toastError(
        "No se pudieron guardar las reglas",
        e?.response?.data?.message || e?.message,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Group mt="sm">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Cargando reglas…
        </Text>
      </Group>
    );
  }

  return (
    <Paper withBorder radius="md" p="md" mt="md">
      <Text fw={600} size="sm" mb={4}>
        Reglas de desbloqueo del certificado
      </Text>
      <Text size="xs" c="dimmed" mb="md">
        Por defecto no hay reglas: el certificado se genera según el flujo del
        examen. Activa reglas para exigir avance del curso y/o exámenes
        aprobados antes de generar el certificado.
      </Text>

      <Divider mb="md" />

      <Stack gap="md">
        <Switch
          label="Aplicar reglas de desbloqueo del certificado"
          checked={enabled}
          onChange={(e) => setEnabled(e.currentTarget.checked)}
        />

        {enabled && (
          <>
            <div>
              <Switch
                label="Requerir actividades completadas"
                description="Número mínimo de actividades que el alumno debe completar."
                checked={requireActivities}
                onChange={(e) => setRequireActivities(e.currentTarget.checked)}
                mb="xs"
              />
              {requireActivities && (
                <NumberInput
                  label="Actividades mínimas"
                  min={1}
                  value={activities}
                  onChange={setActivities}
                  w={220}
                />
              )}
            </div>

            <div>
              <Switch
                label="Requerir exámenes aprobados"
                description="Número mínimo de exámenes (general o de módulo) que el alumno debe aprobar."
                checked={requireExams}
                onChange={(e) => setRequireExams(e.currentTarget.checked)}
                mb="xs"
              />
              {requireExams && (
                <NumberInput
                  label="Exámenes aprobados mínimos"
                  min={1}
                  value={exams}
                  onChange={setExams}
                  w={220}
                />
              )}
            </div>

            <Textarea
              label="Mensaje cuando el certificado está bloqueado"
              placeholder="Ej: Completa todas las actividades y aprueba los exámenes para generar tu certificado."
              autosize
              minRows={2}
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
            />

            {!requireActivities && !requireExams && (
              <Alert color="yellow" variant="light">
                Activaste las reglas pero no configuraste ningún requisito: el
                certificado quedará desbloqueado.
              </Alert>
            )}
          </>
        )}
      </Stack>

      <Divider my="md" />

      <Button size="sm" loading={saving} onClick={handleSave}>
        Guardar reglas
      </Button>
    </Paper>
  );
}
