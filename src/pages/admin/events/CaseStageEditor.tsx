import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { FaPlus, FaTrash, FaVideo, FaXmark } from "react-icons/fa6";
import type {
  CaseExpectedItem,
  CaseOption,
  CaseResponseType,
  CaseStage,
} from "../../../services/clinicalCaseService";

// Id provisional para enlazar opciones y condiciones con pasos nuevos antes de guardar
export const tempId = () => Math.random().toString(16).slice(2, 10);

const RESPONSE_TYPES: { value: CaseResponseType; label: string }[] = [
  { value: "open", label: "Pregunta abierta" },
  { value: "single_choice", label: "Opción única" },
  { value: "multiple_choice", label: "Opción múltiple" },
];

export const emptyStage = (followup = false): CaseStage => ({
  title: followup ? "Nuevo control" : "Nueva etapa",
  ...(followup ? { time_label: "" } : {}),
  reveal: "",
  question: "",
  response_type: "open",
  options: [],
  expected: [{ id: tempId(), text: "", category: "action", critical: true, rationale: "" }],
  common_errors: [],
  max_turns: 4,
});

function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

interface Props {
  stage: CaseStage;
  index: number;
  onChange: (patch: Partial<CaseStage>) => void;
  onRemove: () => void;
  canRemove: boolean;
  /** Control del seguimiento a largo plazo: momento y pasos condicionales */
  followup?: boolean;
  /** Pasos anteriores que pueden condicionar un paso de este control */
  conditionOptions?: { value: string; label: string }[];
}

/** Editor de una etapa (parte aguda) o de un control (seguimiento). */
export default function CaseStageEditor({
  stage,
  index,
  onChange,
  onRemove,
  canRemove,
  followup = false,
  conditionOptions = [],
}: Props) {
  const options = stage.options || [];
  const hasConditional = stage.expected.some((i) => i.only_if_missed);

  const setItem = (i: number, patch: Partial<CaseExpectedItem>) =>
    onChange({
      expected: stage.expected.map((it, k) => (k === i ? { ...it, ...patch } : it)),
    });
  const setOption = (o: number, patch: Partial<CaseOption>) =>
    onChange({ options: options.map((op, k) => (k === o ? { ...op, ...patch } : op)) });

  // Al pasar a selección sin opciones: una por cada paso esperado + un distractor
  const changeResponseType = (type: CaseResponseType) => {
    const expected = stage.expected.map((it) => (it.id ? it : { ...it, id: tempId() }));
    const next =
      type === "open" || options.length
        ? options
        : [
            ...expected.map((it) => ({
              text: it.text,
              item_id: it.id as string,
              unsafe: false,
              why_not: "",
            })),
            { text: "", item_id: null, unsafe: false, why_not: "" },
          ];
    onChange({ response_type: type, expected, options: next });
  };

  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between">
          <Text fw={600}>
            {followup ? `Control ${index + 1}` : `Etapa ${index + 1}`}
            {followup && stage.time_label ? ` · ${stage.time_label}` : ""}
          </Text>
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label="Eliminar etapa"
            disabled={!canRemove}
            onClick={onRemove}
          >
            <FaTrash size={13} />
          </ActionIcon>
        </Group>
        <Group grow align="flex-start">
          {followup && (
            <TextInput
              label="Momento del control"
              placeholder="Ej: 6 meses después"
              value={stage.time_label || ""}
              onChange={(e) => onChange({ time_label: e.currentTarget.value })}
            />
          )}
          <TextInput
            label="Título interno (no lo ve el estudiante)"
            value={stage.title}
            onChange={(e) => onChange({ title: e.currentTarget.value })}
          />
          <NumberInput
            label="Turnos máximos"
            min={2}
            max={10}
            value={stage.max_turns}
            onChange={(v) => onChange({ max_turns: Number(v) || 4 })}
            style={{ maxWidth: 160 }}
          />
        </Group>
        <Textarea
          label={followup ? "Evolución del paciente en este control" : "Información que se revela en esta etapa"}
          autosize
          minRows={2}
          value={stage.reveal}
          onChange={(e) => onChange({ reveal: e.currentTarget.value })}
        />
        <TextInput
          label="Pregunta de la etapa"
          value={stage.question}
          onChange={(e) => onChange({ question: e.currentTarget.value })}
        />
        <Select
          label="Tipo de respuesta"
          description={
            hasConditional
              ? "Con pasos condicionales la etapa es abierta"
              : "Abierta para razonar con sus palabras; selección cuando hay alternativas plausibles"
          }
          data={RESPONSE_TYPES}
          value={hasConditional ? "open" : stage.response_type || "open"}
          allowDeselect={false}
          disabled={hasConditional}
          onChange={(v) => changeResponseType((v as CaseResponseType) || "open")}
          maw={320}
        />

        {!hasConditional && stage.response_type && stage.response_type !== "open" && (
          <Paper withBorder p="xs" radius="md" bg="gray.0">
            <Stack gap={6}>
              <Text size="sm" fw={500}>
                Opciones
              </Text>
              <Text size="xs" c="dimmed">
                Enlaza cada opción correcta con su paso esperado; las demás son distractores. Se
                necesitan al menos 3 opciones y un distractor, si no la etapa queda como pregunta
                abierta.
              </Text>
              {options.map((op, o) => (
                <Group key={op.id || o} gap="xs" align="flex-start" wrap="nowrap">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <TextInput
                      placeholder="Texto de la opción"
                      value={op.text}
                      onChange={(e) => setOption(o, { text: e.currentTarget.value })}
                    />
                    {!op.item_id && (
                      <TextInput
                        size="xs"
                        placeholder="Por qué no es adecuada (guía al tutor)"
                        value={op.why_not}
                        onChange={(e) => setOption(o, { why_not: e.currentTarget.value })}
                      />
                    )}
                  </Stack>
                  <Select
                    w={200}
                    data={[
                      { value: "distractor", label: "Distractor" },
                      ...stage.expected
                        .filter((it) => it.id)
                        .map((it) => ({
                          value: it.id as string,
                          label: `✓ ${it.text || "(paso sin texto)"}`,
                        })),
                    ]}
                    value={op.item_id || "distractor"}
                    allowDeselect={false}
                    onChange={(v) =>
                      setOption(o, {
                        item_id: !v || v === "distractor" ? null : v,
                        ...(v && v !== "distractor" ? { unsafe: false } : {}),
                      })
                    }
                  />
                  {!op.item_id && (
                    <Checkbox
                      mt={8}
                      label="Riesgosa"
                      checked={op.unsafe}
                      onChange={(e) => setOption(o, { unsafe: e.currentTarget.checked })}
                    />
                  )}
                  <ActionIcon
                    mt={4}
                    variant="subtle"
                    color="red"
                    aria-label="Quitar opción"
                    onClick={() => onChange({ options: options.filter((_, k) => k !== o) })}
                  >
                    <FaTrash size={12} />
                  </ActionIcon>
                </Group>
              ))}
              <Button
                size="xs"
                variant="light"
                leftSection={<FaPlus size={11} />}
                style={{ alignSelf: "flex-start" }}
                onClick={() =>
                  onChange({
                    options: [...options, { text: "", item_id: null, unsafe: false, why_not: "" }],
                  })
                }
              >
                Agregar opción
              </Button>
            </Stack>
          </Paper>
        )}

        <Text size="sm" fw={500}>
          Pasos esperados
        </Text>
        {stage.expected.map((item, i) => (
          <Paper key={item.id || i} withBorder p="xs" radius="sm">
            <Group gap="xs" align="flex-start" wrap="nowrap">
              <Stack gap={4} style={{ flex: 1 }}>
                <TextInput
                  placeholder="Ej: Solicitar gases arteriales y cetonemia"
                  value={item.text}
                  onChange={(e) => setItem(i, { text: e.currentTarget.value })}
                />
                <TextInput
                  size="xs"
                  placeholder="Por qué (se muestra al final y guía al tutor)"
                  value={item.rationale}
                  onChange={(e) => setItem(i, { rationale: e.currentTarget.value })}
                />
                <TextInput
                  size="xs"
                  placeholder={
                    followup
                      ? "Si se omite, en el siguiente control… (ej. refiere visión borrosa)"
                      : "Si se omite, consecuencia en el seguimiento a largo plazo (opcional)"
                  }
                  value={item.if_missed || ""}
                  onChange={(e) => setItem(i, { if_missed: e.currentTarget.value })}
                />
                {followup && (
                  <Select
                    size="xs"
                    placeholder="Siempre se espera"
                    description="Paso condicional: solo se espera si antes se omitió…"
                    data={conditionOptions}
                    value={item.only_if_missed || null}
                    onChange={(v) => setItem(i, { only_if_missed: v || null })}
                    clearable
                    searchable
                  />
                )}
                {item.resources?.length ? (
                  <Group gap={4}>
                    {item.resources.map((r, j) => (
                      <Badge
                        key={j}
                        size="sm"
                        variant="light"
                        color="cyan"
                        leftSection={<FaVideo size={9} />}
                        rightSection={
                          <ActionIcon
                            size="xs"
                            variant="transparent"
                            color="cyan"
                            aria-label="Quitar recurso"
                            onClick={() =>
                              setItem(i, {
                                resources: item.resources!.filter((_, k) => k !== j),
                              })
                            }
                          >
                            <FaXmark size={9} />
                          </ActionIcon>
                        }
                      >
                        {r.activity_name} · {formatTime(r.start_time)}
                      </Badge>
                    ))}
                  </Group>
                ) : (
                  <Text size="xs" c="dimmed">
                    Sin video asociado
                  </Text>
                )}
              </Stack>
              <Stack gap={6} w={140}>
                <Select
                  data={[
                    { value: "diagnosis", label: "Diagnóstico" },
                    { value: "action", label: "Acción" },
                  ]}
                  value={item.category}
                  allowDeselect={false}
                  onChange={(v) =>
                    setItem(i, { category: (v as "diagnosis" | "action") || "action" })
                  }
                />
                <Checkbox
                  label="Indispensable"
                  checked={item.critical}
                  onChange={(e) => setItem(i, { critical: e.currentTarget.checked })}
                />
              </Stack>
              <ActionIcon
                mt={4}
                variant="subtle"
                color="red"
                aria-label="Quitar paso"
                onClick={() => onChange({ expected: stage.expected.filter((_, j) => j !== i) })}
              >
                <FaTrash size={12} />
              </ActionIcon>
            </Group>
          </Paper>
        ))}
        <Button
          size="xs"
          variant="light"
          leftSection={<FaPlus size={11} />}
          style={{ alignSelf: "flex-start" }}
          onClick={() =>
            onChange({
              expected: [
                ...stage.expected,
                { id: tempId(), text: "", category: "action", critical: false, rationale: "" },
              ],
            })
          }
        >
          Agregar paso
        </Button>
        <Textarea
          label="Errores frecuentes (uno por línea)"
          autosize
          minRows={2}
          value={stage.common_errors.join("\n")}
          onChange={(e) => onChange({ common_errors: e.currentTarget.value.split("\n") })}
        />
      </Stack>
    </Paper>
  );
}
