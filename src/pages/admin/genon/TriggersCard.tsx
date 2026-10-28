// src/pages/admin/genon/TriggersCard.tsx
import {
  ActionIcon,
  Badge,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { FaArrowDown, FaArrowUp } from "react-icons/fa6";
import {
  GenOnTriggerKey,
  GenOnTriggersConfig,
  TRIGGER_LABELS,
} from "../../../services/genonService";
import type { GenOnTabProps } from "./GenOnAdminPage";
import { TemplateStatusBadge } from "./TemplatesTab";
import { TemplatePreview, templateOptionRenderer } from "./TemplatePreview";
import { VariablesHint } from "./FlowsTab";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/**
 * Segmento 3 (activos) y mensajes que aplican a todos: no siguen un
 * calendario, se disparan por lo que la persona hace en el curso.
 */
export default function TriggersCard({ program, patch, templates, catalog }: GenOnTabProps) {
  const cfg = program.triggers;
  if (!cfg) return null;

  const set = <K extends keyof GenOnTriggersConfig>(
    key: K,
    changes: Partial<GenOnTriggersConfig[K]>
  ) =>
    patch({
      triggers: {
        ...cfg,
        [key]: Array.isArray(cfg[key]) ? changes : { ...(cfg[key] as object), ...changes },
      } as GenOnTriggersConfig,
    });

  const move = (i: number, delta: number) => {
    const next = [...cfg.priority];
    const [item] = next.splice(i, 1);
    next.splice(i + delta, 0, item);
    patch({ triggers: { ...cfg, priority: next } });
  };

  const templateSelect = (label: string, value: string, onChange: (v: string) => void) => {
    const t = templates.find((x) => x.key === value);
    return (
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Select
          label={label}
          data={templates.map((x) => ({ value: x.key, label: x.label }))}
          value={value || null}
          onChange={(v) => v && onChange(v)}
          renderOption={templateOptionRenderer(templates)}
          searchable
          allowDeselect={false}
          style={{ flex: 1 }}
        />
        {t && (
          <Group gap={4} wrap="nowrap" style={{ paddingBottom: 6 }}>
            <TemplateStatusBadge template={t} />
            <TemplatePreview template={t} />
          </Group>
        )}
      </Group>
    );
  };

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="lg">
        <div>
          <Title order={4}>Segmento 3, examen y certificado</Title>
          <Text size="sm" c="dimmed">
            Mensajes por disparador: el módulo terminado y el reto del video se
            detectan cada 15 minutos; la racha, la comparación semanal, el
            examen y el certificado, una vez al día. Salen en la franja de la
            persona y comparten el tope semanal del programa.
          </Text>
        </div>

        <Stack gap={4}>
          <Text fw={600} size="sm">
            Prioridad si se disparan varios en la semana
          </Text>
          <Text size="xs" c="dimmed">
            Se envía primero el de más arriba; el tope semanal corta el resto.
          </Text>
          {cfg.priority.map((key: GenOnTriggerKey, i) => (
            <Group key={key} gap="xs">
              <Badge variant="light" w={28}>
                {i + 1}
              </Badge>
              <Text size="sm" w={280}>
                {TRIGGER_LABELS[key]}
              </Text>
              <ActionIcon size="sm" variant="subtle" disabled={i === 0} onClick={() => move(i, -1)}>
                <FaArrowUp />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="subtle"
                disabled={i === cfg.priority.length - 1}
                onClick={() => move(i, 1)}
              >
                <FaArrowDown />
              </ActionIcon>
            </Group>
          ))}
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Section
            title="3.1 Acompañamiento: terminó un módulo"
            enabled={cfg.module_completed.enabled}
            onToggle={(enabled) => set("module_completed", { enabled })}
          >
            {templateSelect("Plantilla", cfg.module_completed.template_key, (v) =>
              set("module_completed", { template_key: v })
            )}
          </Section>

          <Section
            title="3.2 Comparación social semanal"
            enabled={cfg.weekly_social.enabled}
            onToggle={(enabled) => set("weekly_social", { enabled })}
          >
            <Select
              label="Día de envío"
              data={WEEKDAYS.map((d, i) => ({ value: String(i), label: d }))}
              value={String(cfg.weekly_social.weekday)}
              onChange={(v) => set("weekly_social", { weekday: Number(v) })}
              allowDeselect={false}
            />
            {templateSelect(
              "Por encima de la mitad de su cohorte (aprobación)",
              cfg.weekly_social.above_template_key,
              (v) => set("weekly_social", { above_template_key: v })
            )}
            {templateSelect(
              "Por debajo (se compara con su propia semana)",
              cfg.weekly_social.below_template_key,
              (v) => set("weekly_social", { below_template_key: v })
            )}
            <Text size="xs" c="dimmed">
              Solo con una cohorte de activos del tamaño del umbral social y
              si completó algo en la semana.
            </Text>
          </Section>

          <Section
            title="3.3 Reto del video"
            enabled={cfg.video_challenge.enabled}
            onToggle={(enabled) => set("video_challenge", { enabled })}
          >
            <Text size="xs" c="dimmed">
              Al terminar la actividad anterior a un video marcado como
              saltable (en "Cursos y retos"). Si acierta, el video queda como
              visto.
            </Text>
            {templateSelect("Plantilla", cfg.video_challenge.template_key, (v) =>
              set("video_challenge", { template_key: v })
            )}
            <NumberInput
              label="Preguntas"
              min={1}
              max={5}
              value={cfg.video_challenge.num_questions}
              onChange={(v) => set("video_challenge", { num_questions: Number(v) || 1 })}
            />
            <Textarea
              label="Si acierta"
              autosize
              value={cfg.video_challenge.pass_text}
              onChange={(e) => set("video_challenge", { pass_text: e.currentTarget.value })}
            />
            <Textarea
              label="Si no acierta"
              autosize
              value={cfg.video_challenge.fail_text}
              onChange={(e) => set("video_challenge", { fail_text: e.currentTarget.value })}
            />
          </Section>

          <Section
            title="3.4 Racha académica"
            enabled={cfg.streak.enabled}
            onToggle={(enabled) => set("streak", { enabled })}
          >
            <Text size="xs" c="dimmed">
              Días consecutivos (hora local) con una actividad completada o un
              reto superado, en cualquiera de los cursos del programa: la racha
              es de la persona y sus mensajes salen una sola vez aunque esté en
              varios cursos. Un reto superado recupera la racha cortada dentro
              de la ventana de recuperación.
            </Text>
            <TagsInput
              label="Hitos de reconocimiento (días)"
              value={cfg.streak.milestones.map(String)}
              onChange={(v) =>
                set("streak", {
                  milestones: v.map(Number).filter((n) => Number.isInteger(n) && n > 0),
                })
              }
            />
            {templateSelect("Reconocimiento", cfg.streak.milestone_template_key, (v) =>
              set("streak", { milestone_template_key: v })
            )}
            <Switch
              label="Protector de racha"
              description="Un día con varias actividades gana un protector: el siguiente día sin estudio se cubre solo y la racha no se corta (el día cubierto no suma). Con un protector guardado no sale el aviso de racha en riesgo."
              checked={cfg.streak.shield_enabled}
              onChange={(e) => set("streak", { shield_enabled: e.currentTarget.checked })}
            />
            {cfg.streak.shield_enabled && (
              <Group grow>
                <NumberInput
                  label="Actividades en un día para ganarlo"
                  min={2}
                  value={cfg.streak.shield_min_activities}
                  onChange={(v) => set("streak", { shield_min_activities: Math.max(2, Number(v) || 2) })}
                />
                <NumberInput
                  label="Protectores guardados (máximo)"
                  min={1}
                  value={cfg.streak.shield_max}
                  onChange={(v) => set("streak", { shield_max: Math.max(1, Number(v) || 1) })}
                />
              </Group>
            )}
            <Switch
              label="Botón de examen en los mensajes de racha"
              description="Muestra “Evaluar mis conocimientos” en la ventana de actividad completada de quienes tienen racha. Apagado, esa ventana solo muestra la racha."
              checked={cfg.streak.practice_button}
              onChange={(e) => set("streak", { practice_button: e.currentTarget.checked })}
            />
            <Switch
              label="Aviso de racha en riesgo (máx. una vez por semana)"
              checked={cfg.streak.risk_enabled}
              onChange={(e) => set("streak", { risk_enabled: e.currentTarget.checked })}
            />
            {cfg.streak.risk_enabled && (
              <Group grow>
                <TextInput
                  label="Hora"
                  value={cfg.streak.risk_time}
                  onChange={(e) => set("streak", { risk_time: e.currentTarget.value })}
                />
                <NumberInput
                  label="Desde una racha de (días)"
                  min={1}
                  value={cfg.streak.risk_min}
                  onChange={(v) => set("streak", { risk_min: Number(v) || 1 })}
                />
              </Group>
            )}
            {cfg.streak.risk_enabled &&
              templateSelect("Racha en riesgo", cfg.streak.risk_template_key, (v) =>
                set("streak", { risk_template_key: v })
              )}
            <Switch
              label="Ofrecer recuperar la racha al día siguiente de cortarse"
              checked={cfg.streak.recovery_enabled}
              onChange={(e) => set("streak", { recovery_enabled: e.currentTarget.checked })}
            />
            {cfg.streak.recovery_enabled && (
              <Group grow>
                <NumberInput
                  label="Racha mínima cortada (días)"
                  min={1}
                  value={cfg.streak.recovery_min}
                  onChange={(v) => set("streak", { recovery_min: Number(v) || 1 })}
                />
                <NumberInput
                  label="Ventana de recuperación (días sin estudio)"
                  min={1}
                  value={cfg.streak.recovery_window_days}
                  onChange={(v) => set("streak", { recovery_window_days: Number(v) || 1 })}
                />
              </Group>
            )}
            {cfg.streak.recovery_enabled &&
              templateSelect("Recuperación", cfg.streak.recovery_template_key, (v) =>
                set("streak", { recovery_template_key: v })
              )}
          </Section>

          <Section title="Reto de repaso (racha)">
            <Text size="xs" c="dimmed">
              Lo usan "Hacer un reto" (si no hay actividad pendiente habilitada)
              y "Recuperar mi racha": preguntas sobre lo último que estudió. No
              cambia el avance.
            </Text>
            <Textarea
              label="Si aprueba"
              autosize
              value={cfg.review_challenge.pass_text}
              onChange={(e) => set("review_challenge", { pass_text: e.currentTarget.value })}
            />
            <Textarea
              label="Si no aprueba"
              autosize
              value={cfg.review_challenge.fail_text}
              onChange={(e) => set("review_challenge", { fail_text: e.currentTarget.value })}
            />
          </Section>

          <Section
            title="Recordatorio de examen (todos los segmentos)"
            enabled={cfg.exam_reminder.enabled}
            onToggle={(enabled) => set("exam_reminder", { enabled })}
          >
            <NumberInput
              label="Días después de terminar las actividades del módulo"
              min={0}
              value={cfg.exam_reminder.days_after}
              onChange={(v) => set("exam_reminder", { days_after: Number(v) || 0 })}
            />
            <Switch
              label="También el examen general al terminar todo el curso"
              checked={cfg.exam_reminder.include_final}
              onChange={(e) => set("exam_reminder", { include_final: e.currentTarget.checked })}
            />
            {templateSelect("Plantilla", cfg.exam_reminder.template_key, (v) =>
              set("exam_reminder", { template_key: v })
            )}
          </Section>

          <Section
            title="Certificado listo (egresados)"
            enabled={cfg.certificate.enabled}
            onToggle={(enabled) => set("certificate", { enabled })}
          >
            <Text size="xs" c="dimmed">
              Una sola vez, a quien terminó el curso, cumple las reglas del
              certificado del curso y aún no lo ha generado.
            </Text>
            {templateSelect("Plantilla", cfg.certificate.template_key, (v) =>
              set("certificate", { template_key: v })
            )}
          </Section>
        </SimpleGrid>

        <VariablesHint catalog={catalog} />
      </Stack>
    </Card>
  );
}

function Section({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Card withBorder radius="sm" p="sm" bg={enabled === false ? "gray.0" : undefined}>
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={600} size="sm">
            {title}
          </Text>
          {onToggle && (
            <Switch
              checked={Boolean(enabled)}
              onChange={(e) => onToggle(e.currentTarget.checked)}
              label={enabled ? "Activo" : "Apagado"}
            />
          )}
        </Group>
        {enabled !== false && children}
      </Stack>
    </Card>
  );
}
