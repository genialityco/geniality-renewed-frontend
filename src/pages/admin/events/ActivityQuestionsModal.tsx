// src/pages/admin/events/ActivityQuestionsModal.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  List,
  Loader,
  Modal,
  MultiSelect,
  NumberInput,
  Paper,
  Radio,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  FaArrowDown,
  FaArrowUp,
  FaCircleCheck,
  FaDownload,
  FaPencil,
  FaPlus,
  FaRegCircle,
  FaTrash,
  FaWandMagicSparkles,
  FaXmark,
} from "react-icons/fa6";
import { Activity } from "../../../services/types";
import {
  ActivityQuestion,
  ActivityQuestionDifficulty,
  ActivityQuestionInput,
  ActivityQuestionType,
  BLANK,
  QuestionOption,
  QuestionPair,
  createActivityQuestion,
  deleteActivityQuestion,
  deleteAllActivityQuestions,
  fetchActivityQuestions,
  generateActivityQuestions,
  updateActivityQuestion,
} from "../../../services/activityQuestionService";
import { toastError, toastSaved, toastDeleted, toastInfo } from "../../../utils/toast";

interface Props {
  organizationId?: string;
  activity: Activity | null;
  onClose: () => void;
  /** Notifica el nuevo conteo para el badge de la tarjeta de la actividad */
  onCountChange?: (activityId: string, count: { total: number; enabled: number }) => void;
}

// ─── Catálogos ─────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ActivityQuestionType, string> = {
  open: "Abierta",
  single_choice: "Opción única",
  multiple_choice: "Selección múltiple",
  true_false: "Verdadero / Falso",
  fill_blank: "Completar",
  ordering: "Ordenar",
  matching: "Relacionar",
};
const TYPE_COLOR: Record<ActivityQuestionType, string> = {
  open: "indigo",
  single_choice: "cyan",
  multiple_choice: "teal",
  true_false: "yellow",
  fill_blank: "pink",
  ordering: "orange",
  matching: "lime",
};
const TYPE_OPTIONS = (Object.keys(TYPE_LABEL) as ActivityQuestionType[]).map(
  (value) => ({ value, label: TYPE_LABEL[value] })
);
const DEFAULT_GENERATE_TYPES: ActivityQuestionType[] = [
  "open",
  "single_choice",
  "multiple_choice",
  "true_false",
];

const DIFFICULTY_LABEL: Record<ActivityQuestionDifficulty, string> = {
  basic: "Básica",
  intermediate: "Intermedia",
  advanced: "Avanzada",
};
const DIFFICULTY_COLOR: Record<ActivityQuestionDifficulty, string> = {
  basic: "green",
  intermediate: "blue",
  advanced: "grape",
};
const DIFFICULTY_OPTIONS = (
  Object.keys(DIFFICULTY_LABEL) as ActivityQuestionDifficulty[]
).map((value) => ({ value, label: DIFFICULTY_LABEL[value] }));

// ─── Helpers ───────────────────────────────────────────────────────────────

const errorMessage = (error: any, fallback?: string) =>
  error?.response?.data?.message || fallback;

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** 75 → "1:15", 3725 → "1:02:05" */
function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** "1:15" / "1:02:05" → segundos; null si está vacío; undefined si es inválido. */
function parseTime(text: string): number | null | undefined {
  const value = text.trim();
  if (!value) return null;
  const match = value.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  return Number(match[1] || 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const out = [...list];
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

// Saltos de línea de Windows para que el .txt se vea bien en Notepad
const CRLF = "\r\n";

/** Texto plano con las preguntas y sus respuestas (descarga provisional). */
function questionsToText(activityName: string, questions: ActivityQuestion[]): string {
  const out = [
    `PREGUNTAS: ${activityName}`,
    `Total: ${questions.length} · Generado: ${new Date().toLocaleString()}`,
    "",
  ];
  questions.forEach((q, i) => {
    const type = q.type || "open";
    const meta = [
      TYPE_LABEL[type],
      DIFFICULTY_LABEL[q.difficulty],
      q.topic,
      q.start_time !== null ? `min ${formatTime(q.start_time)}` : "",
      q.enabled ? "" : "DESACTIVADA",
    ].filter(Boolean);
    out.push("=".repeat(70));
    out.push(`${i + 1}. [${meta.join(" | ")}]`);
    out.push(q.question);
    out.push("");
    switch (type) {
      case "single_choice":
      case "multiple_choice":
      case "true_false":
        q.options.forEach((o, idx) =>
          out.push(`  ${o.correct ? "(x)" : "( )"} ${String.fromCharCode(97 + idx)}) ${o.text}`)
        );
        out.push("", `RESPUESTA: ${q.answer}`);
        break;
      case "ordering":
        out.push("ORDEN CORRECTO:");
        q.options.forEach((o, idx) => out.push(`  ${idx + 1}. ${o.text}`));
        break;
      case "matching":
        out.push("PAREJAS CORRECTAS:");
        q.pairs.forEach((p) => out.push(`  - ${p.left} -> ${p.right}`));
        break;
      case "fill_blank":
        out.push(`RESPUESTA: ${q.answer}`);
        if (q.accepted_answers?.length) {
          out.push(`También válidas: ${q.accepted_answers.join(", ")}`);
        }
        break;
      default:
        out.push(`RESPUESTA: ${q.answer}`);
        if (q.key_points?.length) {
          out.push("PUNTOS CLAVE:");
          q.key_points.forEach((kp) => out.push(`  - ${kp}`));
        }
    }
    if (q.explanation) out.push("", `EXPLICACIÓN: ${q.explanation}`);
    out.push("");
  });
  return out.join(CRLF);
}

function downloadText(filename: string, text: string) {
  // BOM para que Notepad/Excel detecten UTF-8 (tildes y ñ)
  const blob = new Blob(["\ufeff" + text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Formulario ────────────────────────────────────────────────────────────

interface FormState {
  type: ActivityQuestionType;
  question: string;
  answer: string; // abierta / completar
  isTrue: boolean; // verdadero/falso
  options: QuestionOption[]; // opción única / múltiple
  items: string[]; // ordenar (en el orden correcto)
  pairs: QuestionPair[]; // relacionar
  acceptedAnswers: string;
  keyPoints: string;
  explanation: string;
  difficulty: ActivityQuestionDifficulty;
  topic: string;
  startTime: string;
}

const emptyOptions = (n: number): QuestionOption[] =>
  Array.from({ length: n }, () => ({ text: "", correct: false }));
const emptyPairs = (n: number): QuestionPair[] =>
  Array.from({ length: n }, () => ({ left: "", right: "" }));

const EMPTY_FORM: FormState = {
  type: "open",
  question: "",
  answer: "",
  isTrue: true,
  options: emptyOptions(4),
  items: ["", "", ""],
  pairs: emptyPairs(3),
  acceptedAnswers: "",
  keyPoints: "",
  explanation: "",
  difficulty: "intermediate",
  topic: "",
  startTime: "",
};

function toForm(q: ActivityQuestion): FormState {
  const type = q.type || "open";
  const isChoice = type === "single_choice" || type === "multiple_choice";
  return {
    ...EMPTY_FORM,
    type,
    question: q.question,
    answer: type === "open" || type === "fill_blank" ? q.answer : "",
    isTrue: type === "true_false" ? Boolean(q.options?.[0]?.correct) : true,
    options: isChoice && q.options?.length ? q.options : emptyOptions(4),
    items: type === "ordering" && q.options?.length ? q.options.map((o) => o.text) : ["", "", ""],
    pairs: type === "matching" && q.pairs?.length ? q.pairs : emptyPairs(3),
    acceptedAnswers: (q.accepted_answers || []).join("\n"),
    keyPoints: (q.key_points || []).join("\n"),
    explanation: q.explanation || "",
    difficulty: q.difficulty,
    topic: q.topic,
    startTime: formatTime(q.start_time),
  };
}

/** Valida en cliente (el backend vuelve a validar) y arma el payload. */
function toPayload(form: FormState): { data?: ActivityQuestionInput; error?: string } {
  const startTime = parseTime(form.startTime);
  if (startTime === undefined) return { error: "Minuto del video inválido (m:ss)" };
  if (!form.question.trim()) return { error: "Escribe el enunciado" };

  const data: ActivityQuestionInput = {
    type: form.type,
    question: form.question.trim(),
    explanation: form.explanation.trim(),
    key_points: lines(form.keyPoints),
    difficulty: form.difficulty,
    topic: form.topic.trim(),
    start_time: startTime,
  };

  switch (form.type) {
    case "open":
      if (!form.answer.trim()) return { error: "Escribe la respuesta modelo" };
      data.answer = form.answer.trim();
      break;
    case "single_choice":
    case "multiple_choice": {
      const options = form.options
        .map((o) => ({ ...o, text: o.text.trim() }))
        .filter((o) => o.text);
      const correct = options.filter((o) => o.correct).length;
      if (options.length < 3) return { error: "Agrega al menos 3 opciones" };
      if (form.type === "single_choice" && correct !== 1)
        return { error: "Marca exactamente 1 opción correcta" };
      if (form.type === "multiple_choice" && correct < 2)
        return { error: "Marca al menos 2 opciones correctas" };
      if (correct === options.length)
        return { error: "Debe haber al menos una opción incorrecta" };
      data.options = options;
      break;
    }
    case "true_false":
      data.answer = form.isTrue;
      break;
    case "fill_blank":
      if (form.question.split(BLANK).length - 1 !== 1)
        return { error: `El enunciado debe tener exactamente un espacio ${BLANK}` };
      if (!form.answer.trim()) return { error: "Escribe la respuesta del espacio" };
      data.answer = form.answer.trim();
      data.accepted_answers = lines(form.acceptedAnswers);
      break;
    case "ordering": {
      const items = form.items.map((t) => t.trim()).filter(Boolean);
      if (items.length < 3) return { error: "Agrega al menos 3 elementos" };
      data.options = items.map((text) => ({ text, correct: true }));
      break;
    }
    case "matching": {
      const pairs = form.pairs
        .map((p) => ({ left: p.left.trim(), right: p.right.trim() }))
        .filter((p) => p.left && p.right);
      if (pairs.length < 3) return { error: "Agrega al menos 3 parejas completas" };
      data.pairs = pairs;
      break;
    }
  }
  return { data };
}

function QuestionForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: FormState;
  saving: boolean;
  onSave: (data: ActivityQuestionInput) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setOption = (i: number, patch: Partial<QuestionOption>) =>
    set(
      "options",
      form.options.map((o, idx) => {
        if (idx === i) return { ...o, ...patch };
        // En opción única, marcar una desmarca las demás
        if (patch.correct && form.type === "single_choice") return { ...o, correct: false };
        return o;
      })
    );

  const handleSave = () => {
    const { data, error: err } = toPayload(form);
    setError(err || null);
    if (data) onSave(data);
  };

  const isChoice = form.type === "single_choice" || form.type === "multiple_choice";

  return (
    <Stack gap="xs">
      <Select
        label="Tipo de pregunta"
        data={TYPE_OPTIONS}
        value={form.type}
        onChange={(v) => v && set("type", v as ActivityQuestionType)}
        allowDeselect={false}
      />
      <Textarea
        label={
          form.type === "true_false"
            ? "Enunciado (afirmación)"
            : form.type === "ordering" || form.type === "matching"
              ? "Instrucción"
              : "Pregunta"
        }
        description={
          form.type === "fill_blank"
            ? `Marca el espacio a completar con ${BLANK}`
            : undefined
        }
        value={form.question}
        onChange={(e) => set("question", e.currentTarget.value)}
        autosize
        minRows={2}
        required
      />
      {form.type === "fill_blank" && !form.question.includes(BLANK) && (
        <Button
          size="compact-xs"
          variant="subtle"
          style={{ alignSelf: "flex-start" }}
          onClick={() => set("question", `${form.question.trimEnd()} ${BLANK}`.trim())}
        >
          Insertar espacio {BLANK}
        </Button>
      )}

      {/* --- Respuesta según el tipo --- */}
      {form.type === "open" && (
        <>
          <Textarea
            label="Respuesta modelo"
            value={form.answer}
            onChange={(e) => set("answer", e.currentTarget.value)}
            autosize
            minRows={3}
          />
          <Textarea
            label="Puntos clave (uno por línea)"
            value={form.keyPoints}
            onChange={(e) => set("keyPoints", e.currentTarget.value)}
            autosize
            minRows={2}
          />
        </>
      )}

      {isChoice && (
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Opciones{" "}
            <Text span size="xs" c="dimmed">
              ({form.type === "single_choice" ? "marca la correcta" : "marca todas las correctas"})
            </Text>
          </Text>
          {form.options.map((o, i) => (
            <Group key={i} gap="xs" wrap="nowrap">
              {form.type === "single_choice" ? (
                <Radio
                  checked={o.correct}
                  onChange={() => setOption(i, { correct: true })}
                  aria-label="Correcta"
                />
              ) : (
                <Checkbox
                  checked={o.correct}
                  onChange={(e) => setOption(i, { correct: e.currentTarget.checked })}
                  aria-label="Correcta"
                />
              )}
              <TextInput
                style={{ flex: 1 }}
                placeholder={`Opción ${i + 1}`}
                value={o.text}
                onChange={(e) => setOption(i, { text: e.currentTarget.value })}
              />
              <ActionIcon
                variant="subtle"
                color="red"
                disabled={form.options.length <= 3}
                onClick={() => set("options", form.options.filter((_, idx) => idx !== i))}
                title="Quitar opción"
              >
                <FaXmark size={14} />
              </ActionIcon>
            </Group>
          ))}
          {form.options.length < 6 && (
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<FaPlus size={10} />}
              style={{ alignSelf: "flex-start" }}
              onClick={() => set("options", [...form.options, { text: "", correct: false }])}
            >
              Agregar opción
            </Button>
          )}
        </Stack>
      )}

      {form.type === "true_false" && (
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            El enunciado es
          </Text>
          <SegmentedControl
            value={form.isTrue ? "true" : "false"}
            onChange={(v) => set("isTrue", v === "true")}
            data={[
              { value: "true", label: "Verdadero" },
              { value: "false", label: "Falso" },
            ]}
          />
        </Stack>
      )}

      {form.type === "fill_blank" && (
        <Group grow align="flex-start">
          <TextInput
            label="Respuesta del espacio"
            value={form.answer}
            onChange={(e) => set("answer", e.currentTarget.value)}
          />
          <Textarea
            label="Otras respuestas válidas (una por línea)"
            value={form.acceptedAnswers}
            onChange={(e) => set("acceptedAnswers", e.currentTarget.value)}
            autosize
            minRows={1}
          />
        </Group>
      )}

      {form.type === "ordering" && (
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Elementos{" "}
            <Text span size="xs" c="dimmed">
              (en el orden correcto; al estudiante se le muestran mezclados)
            </Text>
          </Text>
          {form.items.map((item, i) => (
            <Group key={i} gap="xs" wrap="nowrap">
              <Text size="sm" w={20} ta="right">
                {i + 1}.
              </Text>
              <TextInput
                style={{ flex: 1 }}
                value={item}
                onChange={(e) =>
                  set(
                    "items",
                    form.items.map((t, idx) => (idx === i ? e.currentTarget.value : t))
                  )
                }
              />
              <ActionIcon
                variant="subtle"
                disabled={i === 0}
                onClick={() => set("items", moveItem(form.items, i, i - 1))}
                title="Subir"
              >
                <FaArrowUp size={12} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                disabled={i === form.items.length - 1}
                onClick={() => set("items", moveItem(form.items, i, i + 1))}
                title="Bajar"
              >
                <FaArrowDown size={12} />
              </ActionIcon>
              <ActionIcon
                variant="subtle"
                color="red"
                disabled={form.items.length <= 3}
                onClick={() => set("items", form.items.filter((_, idx) => idx !== i))}
                title="Quitar"
              >
                <FaXmark size={14} />
              </ActionIcon>
            </Group>
          ))}
          {form.items.length < 8 && (
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<FaPlus size={10} />}
              style={{ alignSelf: "flex-start" }}
              onClick={() => set("items", [...form.items, ""])}
            >
              Agregar elemento
            </Button>
          )}
        </Stack>
      )}

      {form.type === "matching" && (
        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Parejas correctas{" "}
            <Text span size="xs" c="dimmed">
              (al estudiante se le muestra la columna derecha mezclada)
            </Text>
          </Text>
          {form.pairs.map((p, i) => (
            <Group key={i} gap="xs" wrap="nowrap">
              <TextInput
                style={{ flex: 1 }}
                placeholder="Concepto"
                value={p.left}
                onChange={(e) =>
                  set(
                    "pairs",
                    form.pairs.map((x, idx) =>
                      idx === i ? { ...x, left: e.currentTarget.value } : x
                    )
                  )
                }
              />
              <Text c="dimmed">→</Text>
              <TextInput
                style={{ flex: 1 }}
                placeholder="Corresponde a"
                value={p.right}
                onChange={(e) =>
                  set(
                    "pairs",
                    form.pairs.map((x, idx) =>
                      idx === i ? { ...x, right: e.currentTarget.value } : x
                    )
                  )
                }
              />
              <ActionIcon
                variant="subtle"
                color="red"
                disabled={form.pairs.length <= 3}
                onClick={() => set("pairs", form.pairs.filter((_, idx) => idx !== i))}
                title="Quitar pareja"
              >
                <FaXmark size={14} />
              </ActionIcon>
            </Group>
          ))}
          {form.pairs.length < 8 && (
            <Button
              size="compact-xs"
              variant="subtle"
              leftSection={<FaPlus size={10} />}
              style={{ alignSelf: "flex-start" }}
              onClick={() => set("pairs", [...form.pairs, { left: "", right: "" }])}
            >
              Agregar pareja
            </Button>
          )}
        </Stack>
      )}

      <Textarea
        label="Explicación (retroalimentación)"
        placeholder="Por qué la respuesta es correcta"
        value={form.explanation}
        onChange={(e) => set("explanation", e.currentTarget.value)}
        autosize
        minRows={2}
      />
      <Group grow>
        <Select
          label="Dificultad"
          data={DIFFICULTY_OPTIONS}
          value={form.difficulty}
          onChange={(v) => v && set("difficulty", v as ActivityQuestionDifficulty)}
          allowDeselect={false}
        />
        <TextInput
          label="Tema"
          value={form.topic}
          onChange={(e) => set("topic", e.currentTarget.value)}
        />
        <TextInput
          label="Minuto del video"
          placeholder="12:30"
          value={form.startTime}
          onChange={(e) => set("startTime", e.currentTarget.value)}
        />
      </Group>

      {error && (
        <Text size="sm" c="red">
          {error}
        </Text>
      )}
      <Group justify="flex-end">
        <Button variant="default" size="xs" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="xs" loading={saving} onClick={handleSave}>
          Guardar
        </Button>
      </Group>
    </Stack>
  );
}

// ─── Vista de la respuesta según el tipo ───────────────────────────────────

function Label({ children }: { children: string }) {
  return (
    <Text size="xs" fw={600} c="dimmed">
      {children}
    </Text>
  );
}

function QuestionAnswerView({ q }: { q: ActivityQuestion }) {
  const type = q.type || "open";
  return (
    <Stack gap="xs">
      {type === "open" && (
        <>
          <div>
            <Label>Respuesta modelo</Label>
            <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
              {q.answer || "—"}
            </Text>
          </div>
          {q.key_points?.length > 0 && (
            <div>
              <Label>Puntos clave</Label>
              <List size="sm" spacing={2}>
                {q.key_points.map((kp, idx) => (
                  <List.Item key={idx}>{kp}</List.Item>
                ))}
              </List>
            </div>
          )}
        </>
      )}

      {(type === "single_choice" || type === "multiple_choice" || type === "true_false") && (
        <div>
          <Label>Opciones</Label>
          <Stack gap={4} mt={4}>
            {q.options.map((o, idx) => (
              <Group key={idx} gap={8} wrap="nowrap">
                {o.correct ? (
                  <FaCircleCheck size={14} color="var(--mantine-color-green-6)" />
                ) : (
                  <FaRegCircle size={14} color="var(--mantine-color-gray-5)" />
                )}
                <Text size="sm" fw={o.correct ? 600 : 400}>
                  {o.text}
                </Text>
              </Group>
            ))}
          </Stack>
        </div>
      )}

      {type === "fill_blank" && (
        <div>
          <Label>Respuesta</Label>
          <Text size="sm" fw={600}>
            {q.answer}
          </Text>
          {q.accepted_answers?.length > 0 && (
            <Text size="xs" c="dimmed">
              También válidas: {q.accepted_answers.join(", ")}
            </Text>
          )}
        </div>
      )}

      {type === "ordering" && (
        <div>
          <Label>Orden correcto</Label>
          <List type="ordered" size="sm" spacing={2}>
            {q.options.map((o, idx) => (
              <List.Item key={idx}>{o.text}</List.Item>
            ))}
          </List>
        </div>
      )}

      {type === "matching" && (
        <div>
          <Label>Parejas correctas</Label>
          <Table withRowBorders={false} verticalSpacing={2} fz="sm">
            <Table.Tbody>
              {q.pairs.map((p, idx) => (
                <Table.Tr key={idx}>
                  <Table.Td fw={500}>{p.left}</Table.Td>
                  <Table.Td c="dimmed" w={24}>
                    →
                  </Table.Td>
                  <Table.Td>{p.right}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      )}

      {q.explanation && (
        <div>
          <Label>Explicación</Label>
          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {q.explanation}
          </Text>
        </div>
      )}
    </Stack>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────

export default function ActivityQuestionsModal({
  organizationId,
  activity,
  onClose,
  onCountChange,
}: Props) {
  const activityId = activity?._id;
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Generación
  const [numQuestions, setNumQuestions] = useState<number | string>(10);
  const [types, setTypes] = useState<string[]>(DEFAULT_GENERATE_TYPES);
  const [difficulty, setDifficulty] = useState<string>("mixed");
  const [instructions, setInstructions] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [generating, setGenerating] = useState(false);

  // Edición
  const [editingId, setEditingId] = useState<string | null>(null); // "new" = crear
  const [saving, setSaving] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const applyQuestions = useCallback(
    (list: ActivityQuestion[]) => {
      setQuestions(list);
      if (activityId) {
        onCountChange?.(activityId, {
          total: list.length,
          enabled: list.filter((q) => q.enabled).length,
        });
      }
    },
    [activityId, onCountChange]
  );

  useEffect(() => {
    if (!organizationId || !activityId) return;
    setLoading(true);
    setEditingId(null);
    setConfirmDeleteAll(false);
    setInstructions("");
    setTypeFilter(null);
    fetchActivityQuestions(organizationId, activityId)
      .then((list) => {
        setQuestions(list);
        setMode(list.length ? "append" : "replace");
      })
      .catch((error) =>
        toastError("Error", errorMessage(error, "No se pudieron cargar las preguntas"))
      )
      .finally(() => setLoading(false));
  }, [organizationId, activityId]);

  if (!activity) return null;

  const keptOnReplace = questions.filter((q) => q.source === "manual" || q.edited).length;
  const visible = typeFilter
    ? questions.filter((q) => (q.type || "open") === typeFilter)
    : questions;
  const typeCounts = questions.reduce<Record<string, number>>((acc, q) => {
    const t = q.type || "open";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const handleDownload = () => {
    const slug =
      activity.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "actividad";
    downloadText(`preguntas-${slug}.txt`, questionsToText(activity.name, visible));
  };

  const handleGenerate = async () => {
    if (!organizationId || !activityId) return;
    setGenerating(true);
    try {
      const res = await generateActivityQuestions(organizationId, activityId, {
        num_questions: Number(numQuestions) || 10,
        types: types as ActivityQuestionType[],
        difficulty: difficulty as ActivityQuestionDifficulty | "mixed",
        instructions: instructions.trim() || undefined,
        mode,
      });
      applyQuestions(res.questions);
      setMode("append");
      toastSaved(`${res.generated} preguntas generadas`, "Revísalas y ajústalas si hace falta.");
      if (res.truncated) {
        toastInfo(
          "Transcript muy largo",
          "Se usó solo la primera parte del transcript para generar las preguntas."
        );
      }
    } catch (error) {
      toastError("No se pudieron generar las preguntas", errorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async (data: ActivityQuestionInput) => {
    if (!organizationId || !activityId || !editingId) return;
    setSaving(true);
    try {
      if (editingId === "new") {
        const created = await createActivityQuestion(organizationId, activityId, data);
        applyQuestions([...questions, created]);
        toastSaved("Pregunta creada");
      } else {
        const updated = await updateActivityQuestion(
          organizationId,
          activityId,
          editingId,
          data
        );
        applyQuestions(questions.map((q) => (q._id === updated._id ? updated : q)));
        toastSaved("Pregunta actualizada");
      }
      setEditingId(null);
    } catch (error) {
      toastError("No se pudo guardar la pregunta", errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (q: ActivityQuestion, enabled: boolean) => {
    if (!organizationId || !activityId) return;
    try {
      const updated = await updateActivityQuestion(organizationId, activityId, q._id, {
        enabled,
      });
      applyQuestions(questions.map((x) => (x._id === updated._id ? updated : x)));
    } catch (error) {
      toastError("No se pudo actualizar la pregunta", errorMessage(error));
    }
  };

  const handleDelete = async (q: ActivityQuestion) => {
    if (!organizationId || !activityId) return;
    try {
      await deleteActivityQuestion(organizationId, activityId, q._id);
      applyQuestions(questions.filter((x) => x._id !== q._id));
      toastDeleted("Pregunta eliminada");
    } catch (error) {
      toastError("No se pudo eliminar la pregunta", errorMessage(error));
    }
  };

  const handleDeleteAll = async () => {
    if (!organizationId || !activityId) return;
    try {
      await deleteAllActivityQuestions(organizationId, activityId);
      applyQuestions([]);
      setConfirmDeleteAll(false);
      setMode("replace");
      toastDeleted("Preguntas eliminadas");
    } catch (error) {
      toastError("No se pudieron eliminar", errorMessage(error));
    }
  };

  return (
    <Modal
      opened={!!activity}
      onClose={generating ? () => undefined : onClose}
      title={`Preguntas con IA: ${activity.name}`}
      size="xl"
      centered
    >
      <Stack gap="md">
        {/* --------- GENERAR --------- */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              La IA crea preguntas con su respuesta a partir de la información
              del curso, el módulo, la descripción de la actividad, el
              transcript completo del video y los documentos de la actividad.
            </Text>
            {!activity.transcript_available && (
              <Alert color="yellow" variant="light">
                Esta actividad aún no tiene transcripción. Genera el transcript
                del video primero.
              </Alert>
            )}
            <MultiSelect
              label="Tipos de pregunta"
              description="Las preguntas se reparten entre los tipos elegidos"
              data={TYPE_OPTIONS}
              value={types}
              onChange={setTypes}
              error={types.length ? undefined : "Elige al menos un tipo"}
            />
            <Group grow align="flex-start">
              <NumberInput
                label="Número de preguntas"
                min={1}
                max={30}
                value={numQuestions}
                onChange={setNumQuestions}
              />
              <Select
                label="Dificultad"
                data={[{ value: "mixed", label: "Mixta" }, ...DIFFICULTY_OPTIONS]}
                value={difficulty}
                onChange={(v) => v && setDifficulty(v)}
                allowDeselect={false}
              />
            </Group>
            <Textarea
              label="Indicaciones para la IA (opcional)"
              placeholder="Ej: enfócate en casos clínicos y en la toma de decisiones"
              value={instructions}
              onChange={(e) => setInstructions(e.currentTarget.value)}
              autosize
              minRows={2}
            />
            {questions.length > 0 && (
              <Stack gap={4}>
                <SegmentedControl
                  value={mode}
                  onChange={(v) => setMode(v as "replace" | "append")}
                  data={[
                    { value: "append", label: "Agregar más preguntas" },
                    { value: "replace", label: "Reemplazar las generadas" },
                  ]}
                />
                {mode === "replace" && (
                  <Text size="xs" c="orange">
                    Se borrarán las preguntas generadas por IA sin editar
                    {keptOnReplace
                      ? ` (se conservan ${keptOnReplace} manuales o editadas).`
                      : "."}
                  </Text>
                )}
              </Stack>
            )}
            <Group justify="space-between" mt="xs">
              <Text size="xs" c="dimmed">
                {generating
                  ? "Analizando el contenido… con videos largos puede tardar hasta 1 minuto."
                  : ""}
              </Text>
              <Button
                leftSection={<FaWandMagicSparkles size={14} />}
                loading={generating}
                disabled={!activity.transcript_available || !types.length}
                onClick={handleGenerate}
              >
                Generar con IA
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* --------- LISTADO --------- */}
        <Group justify="space-between">
          <Group gap="xs">
            <Text fw={600}>
              Preguntas ({questions.filter((q) => q.enabled).length}/{questions.length} activas)
            </Text>
            {questions.length > 0 && (
              <Select
                size="xs"
                w={190}
                placeholder="Todos los tipos"
                clearable
                data={TYPE_OPTIONS.filter((o) => typeCounts[o.value]).map((o) => ({
                  value: o.value,
                  label: `${o.label} (${typeCounts[o.value]})`,
                }))}
                value={typeFilter}
                onChange={setTypeFilter}
              />
            )}
          </Group>
          <Group gap="xs">
            {visible.length > 0 && (
              <Button
                size="xs"
                variant="default"
                leftSection={<FaDownload size={12} />}
                onClick={handleDownload}
                title={typeFilter ? "Descarga solo las del tipo filtrado" : undefined}
              >
                Descargar .txt
              </Button>
            )}
            {questions.length > 0 &&
              (confirmDeleteAll ? (
                <>
                  <Text size="xs" c="red">
                    ¿Eliminar todas?
                  </Text>
                  <Button size="xs" variant="default" onClick={() => setConfirmDeleteAll(false)}>
                    No
                  </Button>
                  <Button size="xs" color="red" onClick={handleDeleteAll}>
                    Sí, eliminar
                  </Button>
                </>
              ) : (
                <Button
                  size="xs"
                  variant="subtle"
                  color="red"
                  onClick={() => setConfirmDeleteAll(true)}
                  disabled={generating}
                >
                  Eliminar todas
                </Button>
              ))}
            <Button
              size="xs"
              variant="light"
              leftSection={<FaPlus size={12} />}
              onClick={() => setEditingId("new")}
              disabled={generating || editingId === "new"}
            >
              Agregar pregunta
            </Button>
          </Group>
        </Group>

        {editingId === "new" && (
          <Paper withBorder p="md" radius="md">
            <QuestionForm
              initial={EMPTY_FORM}
              saving={saving}
              onSave={handleSave}
              onCancel={() => setEditingId(null)}
            />
          </Paper>
        )}

        {loading ? (
          <Loader mx="auto" />
        ) : visible.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="md">
            {questions.length
              ? "No hay preguntas de este tipo."
              : "Esta actividad aún no tiene preguntas."}
          </Text>
        ) : (
          <Accordion variant="separated" multiple>
            {visible.map((q) => {
              const type = q.type || "open";
              return (
                <Accordion.Item key={q._id} value={q._id} opacity={q.enabled ? 1 : 0.55}>
                  <Accordion.Control>
                    <Stack gap={4}>
                      <Text size="sm" fw={500}>
                        {questions.indexOf(q) + 1}. {q.question}
                      </Text>
                      <Group gap={6}>
                        <Badge size="xs" color={TYPE_COLOR[type]}>
                          {TYPE_LABEL[type]}
                        </Badge>
                        <Badge size="xs" variant="light" color={DIFFICULTY_COLOR[q.difficulty]}>
                          {DIFFICULTY_LABEL[q.difficulty]}
                        </Badge>
                        {q.topic && (
                          <Badge size="xs" variant="outline" color="gray">
                            {q.topic}
                          </Badge>
                        )}
                        {q.start_time !== null && (
                          <Badge size="xs" variant="light" color="teal">
                            ▶ {formatTime(q.start_time)}
                          </Badge>
                        )}
                        <Badge
                          size="xs"
                          variant="dot"
                          color={q.source === "ai" ? "violet" : "orange"}
                        >
                          {q.source === "manual" ? "Manual" : q.edited ? "IA (editada)" : "IA"}
                        </Badge>
                        {!q.enabled && (
                          <Badge size="xs" color="gray">
                            Desactivada
                          </Badge>
                        )}
                      </Group>
                    </Stack>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {editingId === q._id ? (
                      <QuestionForm
                        initial={toForm(q)}
                        saving={saving}
                        onSave={handleSave}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <Stack gap="xs">
                        <QuestionAnswerView q={q} />
                        <Group justify="space-between" mt="xs">
                          <Switch
                            size="sm"
                            label="Activa"
                            checked={q.enabled}
                            onChange={(e) => handleToggle(q, e.currentTarget.checked)}
                          />
                          <Group gap="xs">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              title="Editar"
                              onClick={() => setEditingId(q._id)}
                            >
                              <FaPencil size={14} />
                            </ActionIcon>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              title="Eliminar"
                              onClick={() => handleDelete(q)}
                            >
                              <FaTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Stack>
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        )}
      </Stack>
    </Modal>
  );
}
