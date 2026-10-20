import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
} from "@mantine/core";
import {
  CaseAdminSession,
  CaseItemStatus,
  reviewClinicalCaseSession,
} from "../../../services/clinicalCaseService";
import { toastError, toastSaved } from "../../../utils/toast";

interface Props {
  organizationId: string;
  session: CaseAdminSession;
  onSaved: (updated: CaseAdminSession) => void;
}

const STATUS_OPTIONS = [
  { value: "covered", label: "Lo planteó" },
  { value: "partial", label: "A medias" },
  { value: "missing", label: "No" },
];

const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${v}%`);

/**
 * Revisión docente de un intento: corrige al evaluador (estado de cada paso,
 * riesgos e imprecisiones mal detectados). La nota se recalcula y cada cambio
 * queda como dato de calibración de la IA.
 */
export default function CaseReviewPanel({ organizationId, session, onSaved }: Props) {
  const key = (s: number, id: string) => `${s}:${id}`;
  const initial = useMemo(() => {
    const map: Record<string, CaseItemStatus> = {};
    session.stages?.forEach((p, s) =>
      p.items.forEach((it) => {
        if (it.active !== false) map[key(s, it.item_id)] = it.status;
      })
    );
    return map;
  }, [session]);

  const [statuses, setStatuses] = useState(initial);
  const [dismissUnsafe, setDismissUnsafe] = useState<string[]>([]);
  const [dismissUnnecessary, setDismissUnnecessary] = useState<string[]>([]);
  const [note, setNote] = useState(session.review?.note || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatuses(initial);
    setDismissUnsafe([]);
    setDismissUnnecessary([]);
    setNote(session.review?.note || "");
  }, [initial, session.review?.note]);

  const unsafe = [...new Set((session.stages || []).flatMap((p) => p.unsafe || []))];
  const unnecessary = [...new Set((session.stages || []).flatMap((p) => p.unnecessary || []))];
  const changed =
    Object.keys(statuses).some((k) => statuses[k] !== initial[k]) ||
    dismissUnsafe.length > 0 ||
    dismissUnnecessary.length > 0 ||
    note !== (session.review?.note || "");

  const save = async () => {
    setSaving(true);
    try {
      const items = Object.entries(statuses).map(([k, status]) => {
        const [stage, item_id] = k.split(":");
        return { stage: Number(stage), item_id, status };
      });
      const updated = await reviewClinicalCaseSession(organizationId, session._id, {
        items,
        dismiss_unsafe: dismissUnsafe,
        dismiss_unnecessary: dismissUnnecessary,
        note,
      });
      toastSaved(
        "Revisión guardada",
        `Nota recalculada: ${pct(updated.scores?.overall)}. Los cambios quedan para calibrar la IA.`
      );
      onSaved(updated);
    } catch (error: any) {
      toastError(
        "No se pudo guardar la revisión",
        error?.response?.data?.message || error?.message || "Error inesperado"
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = (list: string[], value: string, checked: boolean) =>
    checked ? [...list, value] : list.filter((v) => v !== value);

  return (
    <Paper withBorder p="sm" radius="md" bg="yellow.0">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={600}>Revisión docente</Text>
          {session.review && (
            <Badge color="teal" variant="light">
              Revisado por {session.review.reviewer_name || "docente"} ·{" "}
              {new Date(session.review.reviewed_at).toLocaleDateString()}
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          Corrige lo que el evaluador hizo mal. La nota del estudiante se recalcula y cada cambio se
          guarda para medir y mejorar la precisión de la IA. Entre comillas, la frase del estudiante
          con la que la IA justificó el crédito.
        </Text>

        {session.case_snapshot.stages.map((stage, s) => {
          const progress = session.stages?.[s];
          if (!progress) return null;
          const items = stage.expected.filter((it) =>
            progress.items.some((p) => p.item_id === it.id && p.active !== false)
          );
          return (
            <Stack key={s} gap={6}>
              <Text size="sm" fw={600}>
                {session.part === "followup" ? "Control" : "Etapa"} {s + 1}
                {stage.time_label ? ` · ${stage.time_label}` : ""}: {stage.title}
              </Text>
              {items.map((it) => {
                const p = progress.items.find((x) => x.item_id === it.id);
                const k = key(s, it.id as string);
                return (
                  <Group key={k} justify="space-between" wrap="nowrap" align="flex-start">
                    <div style={{ minWidth: 0 }}>
                      <Text size="sm">
                        {it.text}
                        {it.critical && (
                          <Badge size="xs" ml={6} color="red" variant="light">
                            Indispensable
                          </Badge>
                        )}
                        {p?.reviewed && (
                          <Badge size="xs" ml={6} color="teal" variant="outline">
                            Revisado
                          </Badge>
                        )}
                      </Text>
                      {p?.evidence && (
                        <Text size="xs" c="dimmed" fs="italic">
                          «{p.evidence}»
                        </Text>
                      )}
                    </div>
                    <SegmentedControl
                      size="xs"
                      data={STATUS_OPTIONS}
                      value={statuses[k] || "missing"}
                      onChange={(v) => setStatuses({ ...statuses, [k]: v as CaseItemStatus })}
                    />
                  </Group>
                );
              })}
            </Stack>
          );
        })}

        {unsafe.length > 0 && (
          <Alert color="red" variant="light" title="Decisiones de riesgo detectadas">
            <Stack gap={4}>
              {unsafe.map((t) => (
                <Checkbox
                  key={t}
                  label={`${t} — descartar (no era riesgoso)`}
                  checked={dismissUnsafe.includes(t)}
                  onChange={(e) =>
                    setDismissUnsafe(toggle(dismissUnsafe, t, e.currentTarget.checked))
                  }
                />
              ))}
            </Stack>
          </Alert>
        )}
        {unnecessary.length > 0 && (
          <Alert color="orange" variant="light" title="Propuestas sin indicación detectadas">
            <Stack gap={4}>
              {unnecessary.map((t) => (
                <Checkbox
                  key={t}
                  label={`${t} — descartar (sí estaba indicado)`}
                  checked={dismissUnnecessary.includes(t)}
                  onChange={(e) =>
                    setDismissUnnecessary(toggle(dismissUnnecessary, t, e.currentTarget.checked))
                  }
                />
              ))}
            </Stack>
          </Alert>
        )}

        <Textarea
          label="Nota para el estudiante (opcional)"
          autosize
          minRows={2}
          value={note}
          onChange={(e) => setNote(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button onClick={save} loading={saving} disabled={!changed && !!session.review}>
            {session.review ? "Actualizar revisión" : "Confirmar revisión"}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
