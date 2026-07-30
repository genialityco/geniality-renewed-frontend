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
import { getActivitiesByEvent } from "../../../services/activityService";
import { getQuizzesByEventId } from "../../../services/QuizService";
import { toastSaved, toastError } from "../../../utils/toast";

interface Props {
  eventId: string;
}

/**
 * Reglas de desbloqueo del certificado (por defecto bloqueado).
 * El admin puede exigir un número de actividades completadas y/o un número de
 * exámenes aprobados, con un mensaje personalizado cuando está bloqueado.
 */
export default function CertificateRulesConfig({ eventId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [requireActivities, setRequireActivities] = useState(false);
  const [activities, setActivities] = useState<number | string>(0);
  const [requireExams, setRequireExams] = useState(false);
  const [exams, setExams] = useState<number | string>(0);
  const [message, setMessage] = useState("");
  const [maxActivities, setMaxActivities] = useState(0);
  const [maxExams, setMaxExams] = useState(0);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ev, activitiesList, quizzesList] = await Promise.all([
          fetchEventById(eventId),
          getActivitiesByEvent(eventId),
          getQuizzesByEventId(eventId),
        ]);
        if (cancelled) return;

        const activitiesCount = activitiesList?.length ?? 0;
        // Solo cuentan exámenes habilitados para el alumno.
        const examsCount = (quizzesList ?? []).filter(
          (q) => q.enabled !== false
        ).length;

        setMaxActivities(activitiesCount);
        setMaxExams(examsCount);

        setEnabled(!!ev.certificate_gating_enabled);
        if (ev.certificate_required_activities != null) {
          setRequireActivities(true);
          setActivities(clamp(Number(ev.certificate_required_activities), 0, activitiesCount));
        }
        if (ev.certificate_required_exams != null) {
          setRequireExams(true);
          setExams(clamp(Number(ev.certificate_required_exams), 0, examsCount));
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
      const activitiesValue = clamp(Number(activities) || 0, 0, maxActivities);
      const examsValue = clamp(Number(exams) || 0, 0, maxExams);

      await updateEvent(eventId, {
        certificate_gating_enabled: enabled,
        certificate_required_activities:
          enabled && requireActivities ? activitiesValue : null,
        certificate_required_exams:
          enabled && requireExams ? examsValue : null,
        certificate_locked_message: message,
      });

      if (enabled && requireActivities) {
        setActivities(activitiesValue);
      }
      if (enabled && requireExams) {
        setExams(examsValue);
      }

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
        Por defecto el certificado se mantiene bloqueado. Activa reglas para
        definir los requisitos de avance del curso y/o exámenes aprobados antes
        de generar el certificado.
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
                  description={`Rango permitido: 0 a ${maxActivities}`}
                  min={0}
                  max={maxActivities}
                  clampBehavior="strict"
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
                  description={`Rango permitido: 0 a ${maxExams}`}
                  min={0}
                  max={maxExams}
                  clampBehavior="strict"
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
