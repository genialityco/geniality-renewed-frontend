// src/pages/admin/genon/PersonHistoryDrawer.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Drawer,
  Group,
  Loader,
  Modal,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  Timeline,
} from "@mantine/core";
import {
  FaBookOpen,
  FaCertificate,
  FaCommentDots,
  FaFire,
  FaPaperPlane,
  FaPuzzlePiece,
  FaLink,
  FaTrash,
} from "react-icons/fa6";
import { notifications } from "@mantine/notifications";
import {
  GenOnHistory,
  GenOnHistoryItem,
  GenOnStreakHistory,
  SEGMENT_LABELS,
  apiError,
  clearGenOnHistory,
  createGenOnAccessLink,
  fetchGenOnHistory,
} from "../../../services/genonService";

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
    : "—";

const KIND_LABELS: Record<string, string> = {
  genon: "Gen.ON",
  inactivity_reminder: "Recordatorio de inactividad",
  weekly_report: "Reporte semanal",
  course_ranking: "Ranking del curso",
  practice_invite: "Invitación a simulacro",
  practice_review: "Repaso",
};

const STATUS: Record<string, { label: string; color: string }> = {
  sent: { label: "Enviado", color: "blue" },
  fallback_email: { label: "Enviado por correo", color: "blue" },
  planned: { label: "Simulado (no se envió)", color: "gray" },
  holdout: { label: "Grupo de control (no se envió)", color: "grape" },
  capped: { label: "Tope semanal (no se envió)", color: "yellow" },
  failed: { label: "Falló", color: "red" },
  pending: { label: "Enviándose", color: "gray" },
};

const CHALLENGE_KIND: Record<string, string> = {
  advance: "Reto de avance",
  review: "Reto de repaso",
  video: "Reto del video",
};

type Filter = "all" | "messages" | "progress" | "streaks";

/** Día YYYY-MM-DD de la zona del programa, sin correrlo por la zona del navegador */
const formatDay = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-CO", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
};

const MEDAL_COLORS: Record<string, string> = {
  bronze: "orange",
  silver: "gray",
  gold: "yellow",
  diamond: "cyan",
};

const COVERED_BY: Record<string, string> = {
  challenge: "reto de recuperación",
  shield: "protector",
};

/** Rachas de la persona: la actual y las que perdió, con sus días cubiertos. */
function StreakHistoryView({ history }: { history: GenOnStreakHistory | null }) {
  if (!history) {
    return (
      <Text size="sm" c="dimmed">
        Este programa no tiene la racha activada.
      </Text>
    );
  }
  return (
    <Stack gap="sm">
      <Group gap={6}>
        <Badge color="orange" variant="light">
          🔥 Actual: {history.current} días
        </Badge>
        <Badge variant="light">Mejor: {history.best} días</Badge>
        <Badge color="blue" variant="light">
          🛡️ Protectores: {history.shields}
        </Badge>
        <Badge color="gray" variant="light">
          {history.runs.length} {history.runs.length === 1 ? "racha" : "rachas"}
        </Badge>
      </Group>
      {history.runs.length ? (
        <Timeline bulletSize={22} lineWidth={2}>
          {history.runs.map((run) => (
            <Timeline.Item
              key={run.start}
              bullet={<FaFire size={11} />}
              color={run.status === "live" ? "orange" : "gray"}
              title={
                <Group justify="space-between" gap="xs" wrap="nowrap">
                  <Text size="sm" fw={500}>
                    {run.days} {run.days === 1 ? "día" : "días"}
                    {run.status === "live" ? " · en curso" : ""}
                  </Text>
                  <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                    {run.start === run.end
                      ? formatDay(run.start)
                      : `${formatDay(run.start)} → ${formatDay(run.end)}`}
                  </Text>
                </Group>
              }
            >
              <Stack gap={4}>
                <Group gap={6}>
                  {run.medal && (
                    <Badge color={MEDAL_COLORS[run.medal.tier] || "gray"} variant="light" size="sm">
                      Medalla de {run.medal.name}
                    </Badge>
                  )}
                  {run.status === "lost" && run.lost_on && (
                    <Badge color="red" variant="light" size="sm">
                      Se perdió el {formatDay(run.lost_on)}
                    </Badge>
                  )}
                </Group>
                {run.covered.length > 0 && (
                  <Text size="xs" c="dimmed">
                    Días sin estudio que no la cortaron:{" "}
                    {run.covered
                      .map((c) => `${formatDay(c.day)} (${COVERED_BY[c.by] || c.by})`)
                      .join(", ")}
                  </Text>
                )}
              </Stack>
            </Timeline.Item>
          ))}
        </Timeline>
      ) : (
        <Text size="sm" c="dimmed">
          Aún no ha tenido rachas.
        </Text>
      )}
      <Text size="xs" c="dimmed">
        Se cuentan los días con actividades terminadas o retos superados en cualquier curso del
        programa, desde el {formatDay(history.since)}.
      </Text>
    </Stack>
  );
}

const isProgress = (i: GenOnHistoryItem) =>
  i.type === "activity_progress" || i.type === "course_progress" || i.type === "course_completed";

function MessageItem({ item }: { item: Extract<GenOnHistoryItem, { type: "message" }> }) {
  const status = STATUS[item.status] || { label: item.status, color: "gray" };
  const steps = [
    item.delivered_at && `entregado ${formatDateTime(item.delivered_at)}`,
    item.read_at && `leído ${formatDateTime(item.read_at)}`,
    item.clicked_at && `clic ${formatDateTime(item.clicked_at)}`,
  ].filter(Boolean);
  return (
    <Stack gap={4}>
      <Group gap={6}>
        <Badge color={status.color} variant="light" size="sm">
          {status.label}
        </Badge>
        {item.progress !== null && (
          <Badge variant="outline" size="sm">
            Avance al enviar: {item.progress} %
            {item.completed_activities !== null ? ` · ${item.completed_activities} actividades` : ""}
          </Badge>
        )}
      </Group>
      {item.text && (
        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
          {item.text}
        </Text>
      )}
      {item.template && (
        <Text size="xs" c="dimmed">
          Plantilla {item.template}
        </Text>
      )}
      {steps.length > 0 && (
        <Text size="xs" c="dimmed">
          {steps.join(" · ")}
        </Text>
      )}
      {item.replied_at && (
        <Text size="xs">
          Respondió {formatDateTime(item.replied_at)}: <i>“{item.reply_text}”</i>
        </Text>
      )}
      {item.opted_out_at && (
        <Text size="xs" c="red">
          Pidió no recibir más mensajes ({formatDateTime(item.opted_out_at)})
        </Text>
      )}
      {item.error && (
        <Text size="xs" c="orange">
          {item.error}
        </Text>
      )}
    </Stack>
  );
}

function itemView(item: GenOnHistoryItem) {
  switch (item.type) {
    case "message":
      return {
        icon: <FaPaperPlane size={11} />,
        color: "blue",
        title: `${KIND_LABELS[item.kind] || item.kind}${item.step ? ` · ${item.step}` : ""}`,
        body: <MessageItem item={item} />,
      };
    case "activity_progress":
      return {
        icon: <FaBookOpen size={11} />,
        color: item.to >= 100 ? "green" : "teal",
        title: item.to >= 100 ? `Terminó ${item.activity_name}` : `Avanzó en ${item.activity_name}`,
        body: (
          <Text size="xs" c="dimmed">
            {item.from} % → {item.to} %
          </Text>
        ),
      };
    case "course_progress":
      return {
        icon: <FaBookOpen size={11} />,
        color: "teal",
        title: "Avance del curso",
        body: (
          <Text size="xs" c="dimmed">
            {item.from} % → {item.to} %
          </Text>
        ),
      };
    case "course_completed":
      return {
        icon: <FaCertificate size={11} />,
        color: "green",
        title: "Terminó el curso",
        body: null,
      };
    case "challenge":
      return {
        icon: <FaPuzzlePiece size={11} />,
        color: item.passed ? "green" : "orange",
        title: `${CHALLENGE_KIND[item.kind] || "Reto"}: ${item.activity_name}`,
        body: (
          <Text size="xs" c="dimmed">
            {item.passed ? "Superado" : "No superado"} · {item.correct} de {item.total}
          </Text>
        ),
      };
    case "feedback":
      return {
        icon: <FaCommentDots size={11} />,
        color: "orange",
        title: item.feedback_type === "support" ? "Pidió soporte" : "Comentario",
        body: <Text size="sm">{item.text}</Text>,
      };
  }
}

/** Historial de una persona: mensajes, avance, retos y lo que escribió. */
export default function PersonHistoryDrawer({
  programId,
  enrollmentId,
  onClose,
  onCleared,
}: {
  programId: string;
  enrollmentId: string | null;
  onClose: () => void;
  /** Tras borrar el historial (la inscripción se recrea con otro id) */
  onCleared?: () => void;
}) {
  const [data, setData] = useState<GenOnHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [linking, setLinking] = useState(false);

  const copyAccessLink = async () => {
    if (!enrollmentId) return;
    setLinking(true);
    try {
      const r = await createGenOnAccessLink(programId, enrollmentId);
      await navigator.clipboard.writeText(r.url);
      notifications.show({
        color: "green",
        title: "Enlace copiado",
        message: `Entra como ${data?.name || "esta persona"} a su actividad pendiente (vale ${r.expires_days} días). Ábrelo en una ventana de incógnito para no cerrar tu sesión de admin.`,
        autoClose: 10000,
      });
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo crear el enlace", message: apiError(e, "") });
    } finally {
      setLinking(false);
    }
  };

  const clear = async () => {
    if (!enrollmentId) return;
    setClearing(true);
    try {
      const r = await clearGenOnHistory(programId, enrollmentId);
      const next = r.enrollment
        ? ` Queda en ${SEGMENT_LABELS[r.enrollment.segment] || r.enrollment.segment}` +
          (r.enrollment.next_step_key
            ? `, próximo toque ${r.enrollment.next_step_key} · ${formatDateTime(r.enrollment.next_step_at)}.`
            : ".")
        : "";
      notifications.show({
        color: "green",
        title: "Historial borrado",
        message: `${r.messages_deleted} mensajes y ${r.feedback_deleted} comentarios borrados.${next}`,
        autoClose: 10000,
      });
      setConfirmClear(false);
      onCleared?.();
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo borrar", message: apiError(e, "") });
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    if (!enrollmentId) return;
    setData(null);
    setError(null);
    fetchGenOnHistory(programId, enrollmentId)
      .then(setData)
      .catch((e) => setError(apiError(e, "No se pudo cargar el historial")));
  }, [programId, enrollmentId]);

  const items = (data?.items || []).filter((i) =>
    filter === "all" ? true : filter === "messages" ? i.type === "message" : isProgress(i)
  );

  return (
    <Drawer
      opened={Boolean(enrollmentId)}
      onClose={onClose}
      position="right"
      size="lg"
      title={data ? data.name : "Historial"}
    >
      {error && <Alert color="red">{error}</Alert>}
      {!data && !error && <Loader />}
      {data && (
        <Stack gap="md">
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              {data.email}
              {data.phone ? ` · ${data.phone}` : ""}
            </Text>
            <Text size="sm">{data.course}</Text>
            <Group gap={6}>
              <Badge variant="light">{SEGMENT_LABELS[data.segment] || data.segment}</Badge>
              {data.holdout && (
                <Badge color="grape" variant="light">
                  Grupo de control
                </Badge>
              )}
              {data.exited && (
                <Badge color="red" variant="light">
                  Salió
                </Badge>
              )}
              {data.paused && !data.exited && (
                <Badge color="gray" variant="light">
                  En pausa
                </Badge>
              )}
              {data.streak?.current ? (
                <Badge color="orange" variant="light">
                  🔥 {data.streak.current} días
                </Badge>
              ) : null}
            </Group>
            <Group gap="xs" align="center">
              <Progress value={data.progress} w={200} />
              <Text size="xs">
                {data.progress} % · {data.completed_activities} de {data.total_activities} actividades
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              Próximo toque: {data.next_step_key || "—"}
              {data.next_step_at ? ` · ${formatDateTime(data.next_step_at)}` : ""}
              {data.slot ? ` · franja ${data.slot}` : ""}
            </Text>
          </Stack>

          <Group>
            <Button
              size="xs"
              variant="light"
              leftSection={<FaLink />}
              loading={linking}
              onClick={copyAccessLink}
            >
              Copiar enlace de acceso
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              leftSection={<FaTrash />}
              onClick={() => setConfirmClear(true)}
            >
              Borrar historial
            </Button>
          </Group>

          <SegmentedControl
            size="xs"
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
            data={[
              { value: "all", label: "Todo" },
              { value: "messages", label: "Mensajes" },
              { value: "progress", label: "Avance" },
              { value: "streaks", label: "Rachas" },
            ]}
          />

          {filter === "streaks" && <StreakHistoryView history={data.streak_history ?? null} />}

          {filter !== "streaks" && data.progress_since && (
            <Text size="xs" c="dimmed">
              El avance se registra desde el {formatDateTime(data.progress_since)}; antes
              solo se conoce el avance actual.
            </Text>
          )}

          {filter === "streaks" ? null : items.length ? (
            <Timeline bulletSize={22} lineWidth={2}>
              {items.map((item, i) => {
                const view = itemView(item);
                return (
                  <Timeline.Item
                    key={i}
                    bullet={view.icon}
                    color={view.color}
                    title={
                      <Group justify="space-between" gap="xs" wrap="nowrap">
                        <Text size="sm" fw={500}>
                          {view.title}
                        </Text>
                        <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                          {formatDateTime(item.at)}
                        </Text>
                      </Group>
                    }
                  >
                    {view.body}
                  </Timeline.Item>
                );
              })}
            </Timeline>
          ) : (
            <Text size="sm" c="dimmed">
              Sin registros todavía.
            </Text>
          )}
        </Stack>
      )}

      <Modal
        opened={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Borrar historial"
      >
        <Stack>
          <Text size="sm">
            Se borran los mensajes de Gen.ON de este programa a {data?.name || "esta persona"},
            sus comentarios, retos, racha y en qué toque va. Luego se vuelve a
            segmentar y su secuencia empieza de cero (el tope semanal también se
            libera).
          </Text>
          <Alert color="orange" variant="light">
            Su avance real en el curso no se borra. Los mensajes borrados dejan
            de contar en Recordatorios → Resultados. No se puede deshacer.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmClear(false)}>
              Cancelar
            </Button>
            <Button color="red" loading={clearing} onClick={clear}>
              Borrar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Drawer>
  );
}
