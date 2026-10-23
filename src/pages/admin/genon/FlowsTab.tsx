// src/pages/admin/genon/FlowsTab.tsx
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from "react-icons/fa6";
import {
  GenOnFlowSegment,
  GenOnReply,
  GenOnStep,
  GenOnVariant,
  SEGMENT_LABELS,
} from "../../../services/genonService";
import type { GenOnTabProps } from "./GenOnAdminPage";
import { TemplateStatusBadge } from "./TemplatesTab";
import { TemplatePreview, templateOptionRenderer } from "./TemplatePreview";
import TriggersCard from "./TriggersCard";

const EFFECT_LABELS = {
  none: "Solo responde",
  support_case: "Abre un caso de soporte",
  feedback: "Pide un comentario y detiene la secuencia",
  opt_out: "Da de baja de WhatsApp",
};

/** Variables disponibles, para copiar en los textos. */
export function VariablesHint({ catalog }: Pick<GenOnTabProps, "catalog">) {
  return (
    <Group gap={4}>
      {catalog.variables.map((v) => (
        <Tooltip key={v.key} label={`${v.label} (ej. ${v.example})`}>
          <Badge variant="outline" size="xs" style={{ textTransform: "none" }}>
            {`{{${v.key}}}`}
          </Badge>
        </Tooltip>
      ))}
    </Group>
  );
}

export default function FlowsTab(props: GenOnTabProps) {
  const { program, patch, catalog } = props;
  const rules = program.segments;

  const setRules = (seg: keyof typeof rules, changes: Record<string, unknown>) =>
    patch({ segments: { ...rules, [seg]: { ...rules[seg], ...changes } } });

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Reglas de los segmentos</Title>
          <Text size="sm" c="dimmed">
            Se evalúan a diario con el avance y la última actividad de cada
            inscrito. Al cambiar de segmento, su secuencia empieza de cero.
          </Text>
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            <Stack gap="xs">
              <Text fw={600} size="sm">
                {SEGMENT_LABELS.abandon}
              </Text>
              <Select
                label="Entra si"
                data={[
                  { value: "no_activity", label: "No ha completado ninguna actividad" },
                  { value: "max_progress", label: "Su avance es menor o igual a…" },
                ]}
                value={rules.abandon.rule}
                onChange={(v) => setRules("abandon", { rule: v })}
                allowDeselect={false}
              />
              {rules.abandon.rule === "max_progress" && (
                <NumberInput
                  label="Avance máximo"
                  suffix=" %"
                  value={rules.abandon.max_progress}
                  onChange={(v) => setRules("abandon", { max_progress: Number(v) || 0 })}
                />
              )}
              <NumberInput
                label="Días mínimos desde la inscripción"
                value={rules.abandon.min_days_enrolled}
                onChange={(v) => setRules("abandon", { min_days_enrolled: Number(v) || 0 })}
              />
            </Stack>
            <Stack gap="xs">
              <Text fw={600} size="sm">
                {SEGMENT_LABELS.inactive}
              </Text>
              <NumberInput
                label="Avance mayor a"
                suffix=" %"
                value={rules.inactive.min_progress}
                onChange={(v) => setRules("inactive", { min_progress: Number(v) || 0 })}
              />
              <NumberInput
                label="Días sin actividad (más de)"
                value={rules.inactive.min_days_inactive}
                onChange={(v) => setRules("inactive", { min_days_inactive: Number(v) || 0 })}
              />
            </Stack>
            <Stack gap="xs">
              <Text fw={600} size="sm">
                {SEGMENT_LABELS.active}
              </Text>
              <Text size="sm" c="dimmed">
                Con actividad en los últimos {rules.inactive.min_days_inactive}{" "}
                días. Sus mensajes (módulo terminado, comparación semanal,
                racha) llegan en la fase 2.
              </Text>
            </Stack>
          </SimpleGrid>
        </Stack>
      </Card>

      {(["abandon", "inactive"] as GenOnFlowSegment[]).map((segment) => (
        <FlowEditor key={segment} segment={segment} {...props} />
      ))}

      <TriggersCard {...props} />

      <RepliesEditor {...props} />

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Reto de conocimiento</Title>
          <Text size="sm" c="dimmed">
            Usa el banco de preguntas de los simulacros (opción única de 2–3
            opciones y verdadero/falso) de las actividades habilitadas en
            "Cursos y retos". Cada respuesta fallada trae el enlace al minuto
            del video donde se explica.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <NumberInput
              label="Preguntas por reto"
              min={1}
              max={10}
              value={program.challenge.num_questions}
              onChange={(v) =>
                patch({ challenge: { ...program.challenge, num_questions: Number(v) || 1 } })
              }
            />
            <NumberInput
              label="Aciertos para aprobar"
              suffix=" %"
              min={1}
              max={100}
              value={program.challenge.pass_percent}
              onChange={(v) =>
                patch({ challenge: { ...program.challenge, pass_percent: Number(v) || 100 } })
              }
            />
            <NumberInput
              label="Días para reintentar"
              min={0}
              value={program.challenge.retry_after_days}
              onChange={(v) =>
                patch({ challenge: { ...program.challenge, retry_after_days: Number(v) || 0 } })
              }
            />
          </SimpleGrid>
          {(
            [
              ["intro_text", "Inicio del reto"],
              ["pass_text", "Si aprueba (marca la actividad)"],
              ["fail_text", "Si no aprueba"],
              ["unavailable_text", "Sin reto disponible"],
              ["retry_wait_text", "Reintento antes de tiempo"],
            ] as const
          ).map(([key, label]) => (
            <Textarea
              key={key}
              label={label}
              autosize
              minRows={2}
              value={program.challenge[key]}
              onChange={(e) =>
                patch({ challenge: { ...program.challenge, [key]: e.currentTarget.value } })
              }
            />
          ))}
          <VariablesHint catalog={catalog} />
        </Stack>
      </Card>
    </Stack>
  );
}

function FlowEditor({
  segment,
  program,
  patch,
  catalog,
  templates,
}: GenOnTabProps & { segment: GenOnFlowSegment }) {
  const steps = program.flows[segment] || [];
  const setSteps = (next: GenOnStep[]) =>
    patch({ flows: { ...program.flows, [segment]: next } });
  const setStep = (i: number, changes: Partial<GenOnStep>) =>
    setSteps(steps.map((s, j) => (j === i ? { ...s, ...changes } : s)));
  const move = (i: number, delta: number) => {
    const next = [...steps];
    const [item] = next.splice(i, 1);
    next.splice(i + delta, 0, item);
    setSteps(next);
  };
  const addStep = () => {
    const prefix = segment === "abandon" ? "1" : "2";
    const lastDay = Math.max(0, ...steps.map((s) => s.day));
    setSteps([
      ...steps,
      {
        key: `${prefix}.${steps.length + 1}`,
        label: "Nuevo toque",
        day: lastDay + 3,
        mechanic: "message",
        variants: [{ template_key: templates[0]?.key || "", conditions: [] }],
        enabled: true,
      },
    ]);
  };

  const templateOptions = templates.map((t) => ({ value: t.key, label: t.label }));

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={4}>Flujo: {SEGMENT_LABELS[segment]}</Title>
            <Text size="sm" c="dimmed">
              El día se cuenta desde la entrada al segmento. Los toques salen
              en orden de día; un cierre deja la secuencia en pausa.
            </Text>
          </div>
          <Button variant="light" leftSection={<FaPlus />} onClick={addStep}>
            Agregar toque
          </Button>
        </Group>

        {steps.map((step, i) => (
          <Card key={`${step.key}-${i}`} withBorder radius="sm" p="sm" bg={step.enabled ? undefined : "gray.0"}>
            <Stack gap="xs">
              <Group justify="space-between" align="flex-end" wrap="wrap">
                <Group align="flex-end" gap="xs" wrap="wrap">
                  <TextInput
                    label="Clave"
                    w={70}
                    value={step.key}
                    onChange={(e) => setStep(i, { key: e.currentTarget.value })}
                  />
                  <TextInput
                    label="Nombre"
                    w={220}
                    value={step.label}
                    onChange={(e) => setStep(i, { label: e.currentTarget.value })}
                  />
                  <NumberInput
                    label="Día"
                    w={80}
                    min={0}
                    value={step.day}
                    onChange={(v) => setStep(i, { day: Number(v) || 0 })}
                  />
                  <Select
                    label="Mecánica"
                    w={220}
                    data={catalog.mechanics.map((m) => ({ value: m.key, label: m.label }))}
                    value={step.mechanic}
                    onChange={(v) => v && setStep(i, { mechanic: v as GenOnStep["mechanic"] })}
                    allowDeselect={false}
                  />
                  <Switch
                    label="Activo"
                    checked={step.enabled}
                    onChange={(e) => setStep(i, { enabled: e.currentTarget.checked })}
                    mb={8}
                  />
                </Group>
                <Group gap={4}>
                  <ActionIcon variant="subtle" disabled={i === 0} onClick={() => move(i, -1)}>
                    <FaArrowUp />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    disabled={i === steps.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <FaArrowDown />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => setSteps(steps.filter((_, j) => j !== i))}
                  >
                    <FaTrash />
                  </ActionIcon>
                </Group>
              </Group>

              <VariantsEditor
                variants={step.variants}
                onChange={(variants) => setStep(i, { variants })}
                templateOptions={templateOptions}
                templates={templates}
                catalog={catalog}
                socialMin={program.social_min}
              />
            </Stack>
          </Card>
        ))}
        {!steps.length && (
          <Text size="sm" c="dimmed">
            Este segmento no tiene toques: no recibe mensajes.
          </Text>
        )}
      </Stack>
    </Card>
  );
}

function VariantsEditor({
  variants,
  onChange,
  templateOptions,
  templates,
  catalog,
  socialMin,
}: {
  variants: GenOnVariant[];
  onChange: (v: GenOnVariant[]) => void;
  templateOptions: { value: string; label: string }[];
  templates: GenOnTabProps["templates"];
  catalog: GenOnTabProps["catalog"];
  socialMin: number;
}) {
  const setVariant = (i: number, changes: Partial<GenOnVariant>) =>
    onChange(variants.map((v, j) => (j === i ? { ...v, ...changes } : v)));

  return (
    <Stack gap={6} pl="sm" style={{ borderLeft: "2px solid var(--mantine-color-gray-3)" }}>
      <Text size="xs" c="dimmed">
        Entre las variantes cuyas condiciones se cumplen, a cada persona se le
        asigna una al azar y se reparten por igual; la conserva mientras siga
        cumpliendo. Si ninguna se cumple, el toque se omite.
      </Text>
      {variants.map((variant, i) => {
        const template = templates.find((t) => t.key === variant.template_key);
        return (
          <Stack key={i} gap={4}>
            <Group gap="xs" align="flex-end" wrap="wrap">
              <Text size="xs" fw={600} w={70}>
                Variante {String.fromCharCode(65 + i)}
              </Text>
              <Select
                size="xs"
                w={300}
                placeholder="Plantilla"
                data={templateOptions}
                value={variant.template_key || null}
                onChange={(v) => setVariant(i, { template_key: v || "" })}
                renderOption={templateOptionRenderer(templates)}
                searchable
              />
              {template && <TemplateStatusBadge template={template} />}
              <TemplatePreview template={template} />
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() =>
                  setVariant(i, {
                    conditions: [
                      ...variant.conditions,
                      { metric: "n_egresados", min: socialMin },
                    ],
                  })
                }
              >
                + condición
              </Button>
              {variants.length > 1 && (
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() => onChange(variants.filter((_, j) => j !== i))}
                >
                  <FaTrash />
                </ActionIcon>
              )}
            </Group>
            {variant.conditions.map((c, k) => (
              <Group key={k} gap="xs" pl={78}>
                <Select
                  size="xs"
                  w={260}
                  data={catalog.metrics.map((m) => ({ value: m.key, label: m.label }))}
                  value={c.metric}
                  onChange={(v) =>
                    v &&
                    setVariant(i, {
                      conditions: variant.conditions.map((x, j) =>
                        j === k ? { ...x, metric: v as typeof c.metric } : x
                      ),
                    })
                  }
                  allowDeselect={false}
                />
                <Text size="xs">≥</Text>
                <NumberInput
                  size="xs"
                  w={90}
                  value={c.min}
                  onChange={(v) =>
                    setVariant(i, {
                      conditions: variant.conditions.map((x, j) =>
                        j === k ? { ...x, min: Number(v) || 0 } : x
                      ),
                    })
                  }
                />
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="red"
                  onClick={() =>
                    setVariant(i, {
                      conditions: variant.conditions.filter((_, j) => j !== k),
                    })
                  }
                >
                  <FaTrash />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        );
      })}
      <Button
        size="compact-xs"
        variant="subtle"
        w="fit-content"
        onClick={() =>
          onChange([...variants, { template_key: templateOptions[0]?.value || "", conditions: [] }])
        }
      >
        + variante
      </Button>
    </Stack>
  );
}

function RepliesEditor({ program, patch, catalog }: GenOnTabProps) {
  const replies = program.replies || [];
  const setReplies = (next: GenOnReply[]) => patch({ replies: next });
  const setReply = (i: number, changes: Partial<GenOnReply>) =>
    setReplies(replies.map((r, j) => (j === i ? { ...r, ...changes } : r)));
  const actionOptions = [
    { value: "challenge", label: "Empezar el reto" },
    ...replies.map((r) => ({ value: `reply:${r.key}`, label: `Responder: ${r.label}` })),
  ];

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={4}>Respuestas de la conversación</Title>
            <Text size="sm" c="dimmed">
              Lo que se contesta al tocar un botón (de una plantilla o de otra
              respuesta). Son mensajes dentro de la conversación: no necesitan
              aprobación de Meta. "AYUDA" usa la respuesta con clave help y un
              comentario recibido, feedback_thanks.
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<FaPlus />}
            onClick={() =>
              setReplies([
                ...replies,
                {
                  key: `respuesta_${replies.length + 1}`,
                  label: "Nueva respuesta",
                  text: "",
                  buttons: [],
                  effect: "none",
                },
              ])
            }
          >
            Agregar respuesta
          </Button>
        </Group>
        <VariablesHint catalog={catalog} />
        {replies.map((reply, i) => (
          <Card key={i} withBorder radius="sm" p="sm">
            <Stack gap="xs">
              <Group align="flex-end" gap="xs" wrap="wrap">
                <TextInput
                  label="Clave"
                  w={150}
                  value={reply.key}
                  onChange={(e) =>
                    setReply(i, { key: e.currentTarget.value.replace(/[^a-z0-9_]/gi, "_") })
                  }
                />
                <TextInput
                  label="Nombre"
                  w={220}
                  value={reply.label}
                  onChange={(e) => setReply(i, { label: e.currentTarget.value })}
                />
                <Select
                  label="Además"
                  w={300}
                  data={Object.entries(EFFECT_LABELS).map(([value, label]) => ({ value, label }))}
                  value={reply.effect}
                  onChange={(v) => v && setReply(i, { effect: v as GenOnReply["effect"] })}
                  allowDeselect={false}
                />
                <ActionIcon
                  variant="subtle"
                  color="red"
                  mb={4}
                  onClick={() => setReplies(replies.filter((_, j) => j !== i))}
                >
                  <FaTrash />
                </ActionIcon>
              </Group>
              <Textarea
                autosize
                minRows={2}
                value={reply.text}
                onChange={(e) => setReply(i, { text: e.currentTarget.value })}
              />
              {reply.buttons.map((b, k) => (
                <Group key={k} gap="xs">
                  <TextInput
                    size="xs"
                    w={180}
                    placeholder="Texto del botón (máx. 20)"
                    maxLength={20}
                    value={b.title}
                    onChange={(e) =>
                      setReply(i, {
                        buttons: reply.buttons.map((x, j) =>
                          j === k ? { ...x, title: e.currentTarget.value } : x
                        ),
                      })
                    }
                  />
                  <Select
                    size="xs"
                    w={280}
                    data={actionOptions}
                    value={b.action}
                    onChange={(v) =>
                      v &&
                      setReply(i, {
                        buttons: reply.buttons.map((x, j) => (j === k ? { ...x, action: v } : x)),
                      })
                    }
                    allowDeselect={false}
                  />
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="red"
                    onClick={() =>
                      setReply(i, { buttons: reply.buttons.filter((_, j) => j !== k) })
                    }
                  >
                    <FaTrash />
                  </ActionIcon>
                </Group>
              ))}
              {reply.buttons.length < 3 && (
                <Button
                  size="compact-xs"
                  variant="subtle"
                  w="fit-content"
                  onClick={() =>
                    setReply(i, {
                      buttons: [...reply.buttons, { title: "", action: "challenge" }],
                    })
                  }
                >
                  + botón
                </Button>
              )}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Card>
  );
}
