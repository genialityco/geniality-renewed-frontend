// src/pages/admin/genon/ProgramTab.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Chip,
  Group,
  Modal,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { fetchEventsByOrganizer } from "../../../services/eventService";
import {
  GenOnMode,
  MODE_LABELS,
  SEGMENT_LABELS,
  apiError,
  reassignGenOn,
} from "../../../services/genonService";
import type { GenOnTabProps } from "./GenOnAdminPage";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const SLOT_RE = /^([01]?\d|2[0-3]):[0-5]\d$/;

export default function ProgramTab({
  program,
  patch,
  organizations,
  dirty,
}: GenOnTabProps & { dirty: boolean }) {
  const [events, setEvents] = useState<{ value: string; label: string }[]>([]);
  const [confirmLive, setConfirmLive] = useState(false);
  const [confirmReassign, setConfirmReassign] = useState(false);
  const [reassigning, setReassigning] = useState(false);

  const reassign = async () => {
    setReassigning(true);
    try {
      const r = await reassignGenOn(program._id);
      const slots = Object.entries(r.by_slot)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([slot, n]) => `${slot}: ${n}`)
        .join(" · ");
      notifications.show({
        color: "green",
        title: "Reasignado",
        message: `${r.people} personas (${r.enrollments} inscripciones) · ${slots || "sin inscritos"}. Variantes borradas en ${r.variants_cleared} inscripciones.`,
        autoClose: 10000,
      });
      setConfirmReassign(false);
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo reasignar", message: apiError(e, "") });
    } finally {
      setReassigning(false);
    }
  };

  // Cursos de las organizaciones elegidas
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      program.organization_ids.map((id) =>
        fetchEventsByOrganizer(id).catch(() => [])
      )
    ).then((lists) => {
      if (cancelled) return;
      const orgName = (id: string) =>
        organizations.find((o) => o._id === id)?.name || "";
      setEvents(
        lists.flatMap((list, i) =>
          list.map((e: any) => ({
            value: e._id,
            label:
              program.organization_ids.length > 1
                ? `${e.name} · ${orgName(program.organization_ids[i])}`
                : e.name,
          }))
        )
      );
    });
    return () => {
      cancelled = true;
    };
  }, [program.organization_ids, organizations]);

  const setMode = (mode: GenOnMode) => {
    if (mode === "live" && program.mode !== "live") {
      setConfirmLive(true);
      return;
    }
    patch({ mode });
  };

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>General</Title>
          <TextInput
            label="Nombre"
            value={program.name}
            onChange={(e) => patch({ name: e.currentTarget.value })}
            maw={420}
          />
          <div>
            <Text size="sm" fw={500} mb={4}>
              Modo
            </Text>
            <SegmentedControl
              value={program.mode}
              onChange={(v) => setMode(v as GenOnMode)}
              data={(Object.keys(MODE_LABELS) as GenOnMode[]).map((m) => ({
                value: m,
                label: MODE_LABELS[m],
              }))}
            />
            <Text size="xs" c="dimmed" mt={4}>
              En simulación el motor segmenta y programa los toques, pero no
              envía nada: los verás como "planeados" en Seguimiento y en
              Recordatorios → Resultados. Requiere GENON_CRON_ENABLED=true en
              el servidor (o "Ejecutar ahora" en Pruebas).
            </Text>
          </div>
          <MultiSelect
            label="Organizaciones"
            description="Solo puedes elegir organizaciones que administras. En ellas dejan de salir los recordatorios anteriores mientras el programa esté activo."
            data={organizations.map((o) => ({ value: o._id, label: o.name }))}
            value={program.organization_ids}
            onChange={(ids) =>
              patch({
                organization_ids: ids,
                event_ids: program.event_ids.filter((e) =>
                  events.some((x) => x.value === e)
                ),
              })
            }
            searchable
          />
          <MultiSelect
            label="Cursos"
            description="Vacío = todos los cursos con inscritos de esas organizaciones."
            placeholder="Todos los cursos"
            data={events}
            value={program.event_ids}
            onChange={(ids) =>
              patch({
                event_ids: ids,
                // El curso de entrada tiene que seguir en el programa
                entry_event_id:
                  ids.length && program.entry_event_id && !ids.includes(program.entry_event_id)
                    ? null
                    : program.entry_event_id ?? null,
              })
            }
            searchable
            clearable
          />
          <Select
            label="Curso para quien aún no abre ninguno"
            description={`Al registrarse, una persona entra al programa solo cuando abre un curso. Si eliges uno aquí, los miembros de su organización que aún no han abierto ningún curso del programa entran a ese: "${SEGMENT_LABELS.waiting}" los primeros ${program.segments.abandon.min_days_enrolled} días desde que se unieron a la organización y luego "${SEGMENT_LABELS.abandon}". Ojo: incluye a los miembros antiguos que nunca empezaron. Al abrir un curso siguen con su inscripción normal.`}
            placeholder="Nadie (solo quien ya abrió un curso)"
            data={program.event_ids.length ? events.filter((e) => program.event_ids.includes(e.value)) : events}
            value={program.entry_event_id || null}
            onChange={(v) => patch({ entry_event_id: v || null })}
            searchable
            clearable
            maw={520}
          />
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Horario y frecuencia</Title>
          <TagsInput
            label="Franjas de envío (HH:mm)"
            description="A cada persona le toca una al azar y la conserva; así se compara cuál responde mejor."
            value={program.send_slots}
            onChange={(slots) => patch({ send_slots: slots.filter((s) => SLOT_RE.test(s)) })}
            maw={420}
          />
          <Group gap="sm" align="center">
            <Button
              variant="light"
              size="xs"
              disabled={dirty}
              onClick={() => setConfirmReassign(true)}
            >
              Reasignar horarios y variantes
            </Button>
            <Text size="xs" c="dimmed">
              {dirty
                ? "Guarda los cambios antes de reasignar."
                : "Reparte de nuevo a todos por igual entre las franjas guardadas y vuelve a sortear las variantes de los mensajes."}
            </Text>
          </Group>
          <div>
            <Text size="sm" fw={500} mb={4}>
              Días sin envíos
            </Text>
            <Chip.Group
              multiple
              value={program.blocked_weekdays.map(String)}
              onChange={(v) => patch({ blocked_weekdays: v.map(Number) })}
            >
              <Group gap="xs">
                {WEEKDAYS.map((d, i) => (
                  <Chip key={d} value={String(i)} size="xs">
                    {d}
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            <Text size="xs" c="dimmed" mt={4}>
              Lo que cae en uno de estos días pasa al siguiente día permitido.
            </Text>
          </div>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <NumberInput
              label="Tope semanal por persona"
              description="Mensajes iniciados por Gen.ON en 7 días"
              min={1}
              value={program.weekly_cap}
              onChange={(v) => patch({ weekly_cap: Number(v) || 1 })}
            />
            <NumberInput
              label="Umbral del dato social"
              description="Mínimo de personas para mostrar una cifra"
              min={0}
              value={program.social_min}
              onChange={(v) => patch({ social_min: Number(v) || 0 })}
            />
            <NumberInput
              label="Minutos por actividad (por defecto)"
              description="Si no se configura ni hay video"
              min={1}
              value={program.default_activity_minutes}
              onChange={(v) => patch({ default_activity_minutes: Number(v) || 1 })}
            />
          </SimpleGrid>
          <TextInput
            label="Zona horaria"
            value={program.timezone}
            onChange={(e) => patch({ timezone: e.currentTarget.value })}
            maw={260}
          />
          <Switch
            label="Enlaces con acceso directo"
            description="Los enlaces de los mensajes y de los retos (también al minuto del video) entran con la sesión de la persona ya iniciada, sin pedir contraseña. Cada enlace vale 7 días. Nunca se generan para administradores. Quien reciba un mensaje reenviado también podrá entrar como esa persona."
            checked={Boolean(program.auto_login_links)}
            onChange={(e) => patch({ auto_login_links: e.currentTarget.checked })}
          />
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Grupo de control</Title>
          <Text size="sm" c="dimmed">
            Porcentaje de cada segmento que no recibe mensajes, para saber si
            el efecto es de Gen.ON. La asignación es estable por persona.
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            {(["abandon", "inactive", "active"] as const).map((s) => (
              <NumberInput
                key={s}
                label={SEGMENT_LABELS[s]}
                suffix=" %"
                min={0}
                max={100}
                value={program.holdout_percent?.[s] ?? 0}
                onChange={(v) =>
                  patch({
                    holdout_percent: { ...program.holdout_percent, [s]: Number(v) || 0 },
                  })
                }
              />
            ))}
          </SimpleGrid>
        </Stack>
      </Card>

      <Modal
        opened={confirmReassign}
        onClose={() => setConfirmReassign(false)}
        title="Reasignar horarios y variantes"
      >
        <Stack>
          <Text size="sm">
            A todos los inscritos del programa se les asigna de nuevo una franja
            ({program.send_slots.join(", ") || "sin franjas"}), repartidos por
            igual, y se recalcula la hora de su próximo mensaje. Las variantes
            asignadas se borran y se vuelven a repartir en el próximo envío de
            cada toque.
          </Text>
          <Alert color="orange" variant="light">
            No envía nada, pero cambia a qué hora y con qué texto recibe cada
            persona sus próximos mensajes. Si estás comparando franjas o
            variantes en Resultados, la comparación vuelve a empezar desde aquí.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmReassign(false)}>
              Cancelar
            </Button>
            <Button loading={reassigning} onClick={reassign}>
              Reasignar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={confirmLive} onClose={() => setConfirmLive(false)} title="Activar el programa">
        <Stack>
          <Alert color="orange" variant="light">
            Al guardar, el programa envía mensajes reales por WhatsApp a los
            inscritos de estas organizaciones (con el cron activo), y ahí dejan
            de salir los recordatorios anteriores.
          </Alert>
          <Text size="sm">
            Lo que se haya avanzado en simulación se borra: las secuencias
            empiezan de cero. Antes de activarlo, revisa que las plantillas del
            flujo estén aprobadas en Meta y prueba el flujo con tu teléfono.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmLive(false)}>
              Cancelar
            </Button>
            <Button
              color="green"
              onClick={() => {
                patch({ mode: "live" });
                setConfirmLive(false);
              }}
            >
              Activar (guardar después)
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
