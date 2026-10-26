// src/pages/admin/genon/TestTab.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  List,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { FaEye, FaPlay, FaWhatsapp } from "react-icons/fa6";
import {
  GenOnCourse,
  GenOnPreview,
  GenOnRegroupResult,
  GenOnRunResult,
  GenOnSimulation,
  GenOnTriggerPreview,
  GenOnTriggerKey,
  GenOnTriggerSimulation,
  SEGMENT_LABELS,
  TRIGGER_LABELS,
  apiError,
  applyGenOnStreakLab,
  applyGenOnStreakLabAll,
  fetchGenOnCourses,
  previewGenOnStep,
  previewGenOnTrigger,
  regroupGenOn,
  runGenOnNow,
  sendGenOnRealStep,
  sendGenOnRealTrigger,
  sendGenOnScheduledNow,
  sendGenOnTest,
  sendGenOnTriggerTest,
  simulateGenOn,
  simulateGenOnTriggers,
} from "../../../services/genonService";
import {
  ReminderTestUser,
  searchReminderTestUsers,
} from "../../../services/remindersService";
import type { GenOnTabProps } from "./GenOnAdminPage";

const formatDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })
    : "—";

const RESULT_LABELS: Record<string, string> = {
  planned: "Habría salido",
  sent: "Enviado",
  holdout: "Grupo de control",
  capped: "Frenado por tope",
  skipped: "Omitido",
  duplicate: "Ya enviado",
  error: "Error",
};

export default function TestTab({
  program,
  dirty,
  catalog,
}: GenOnTabProps & { dirty: boolean }) {
  const [courses, setCourses] = useState<GenOnCourse[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const course = courses.find((c) => c._id === eventId) || null;

  const [search, setSearch] = useState("");
  const [debounced] = useDebouncedValue(search, 350);
  const [options, setOptions] = useState<ReminderTestUser[]>([]);
  const [user, setUser] = useState<ReminderTestUser | null>(null);

  const [simulation, setSimulation] = useState<GenOnSimulation | null>(null);
  const [preview, setPreview] = useState<GenOnPreview | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [run, setRun] = useState<GenOnRunResult | null>(null);
  const [sendNow, setSendNow] = useState<GenOnRunResult | null>(null);
  const [regroup, setRegroup] = useState<GenOnRegroupResult | null>(null);
  const [confirmSendNow, setConfirmSendNow] = useState(false);
  // Envío real a la persona seleccionada (toque o disparador), pendiente de confirmar
  const [realSend, setRealSend] = useState<
    { kind: "step" | "trigger"; key: string; label: string } | null
  >(null);

  const doRealSend = () => {
    if (!realSend || !user || !eventId) return;
    const target = realSend;
    setRealSend(null);
    withBusy(`real-${target.key}`, async () => {
      const res =
        target.kind === "step"
          ? await sendGenOnRealStep(program._id, {
              userId: user.user_id,
              eventId,
              stepKey: target.key,
            })
          : await sendGenOnRealTrigger(program._id, {
              userId: user.user_id,
              eventId,
              key: target.key as GenOnTriggerKey,
            });
      notifications.show({
        color: "green",
        title: "Enviado a la persona",
        message:
          `${res.template} → ${res.phone || "su teléfono"}. Sus respuestas las atiende el chatbot con su inscripción real.` +
          (target.kind === "step"
            ? res.advanced
              ? " Su secuencia avanzó a este toque."
              : ` Su secuencia no cambió (está en ${SEGMENT_LABELS[res.segment] || res.segment}).`
            : ""),
        autoClose: 12000,
      });
    });
  };
  const [triggerSim, setTriggerSim] = useState<GenOnTriggerSimulation | null>(null);
  const [triggerPreview, setTriggerPreview] = useState<GenOnTriggerPreview | null>(null);

  useEffect(() => {
    fetchGenOnCourses(program._id)
      .then((list) => {
        setCourses(list);
        if (list.length) setEventId(list[0]._id);
      })
      .catch(() => setCourses([]));
  }, [program._id]);

  useEffect(() => {
    const term = debounced.trim();
    if (!course || term.length < 2 || term === `${user?.name} · ${user?.email}`) return;
    let cancelled = false;
    searchReminderTestUsers(course.organization_id, term)
      .then((list) => !cancelled && setOptions(list))
      .catch(() => !cancelled && setOptions([]));
    return () => {
      cancelled = true;
    };
  }, [debounced, course, user]);

  const userOptions = [
    ...(user ? [user] : []),
    ...options.filter((o) => o.user_id !== user?.user_id),
  ];

  const ready = Boolean(user && eventId);
  const steps = [
    ...(program.flows.abandon || []).map((s) => ({ ...s, segment: "abandon" as const })),
    ...(program.flows.inactive || []).map((s) => ({ ...s, segment: "inactive" as const })),
  ];

  const withBusy = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo", message: apiError(e, "") });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Stack gap="lg">
      {dirty && (
        <Alert color="orange" variant="light">
          Hay cambios sin guardar: las pruebas usan la configuración guardada
          del programa.
        </Alert>
      )}

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Probar con un inscrito real</Title>
          <Group align="flex-end" wrap="wrap">
            <Select
              label="Curso"
              data={courses.map((c) => ({ value: c._id, label: c.name }))}
              value={eventId}
              onChange={(v) => {
                setEventId(v);
                setSimulation(null);
                setPreview(null);
                setTriggerSim(null);
                setTriggerPreview(null);
              }}
              searchable
              w={320}
            />
            <Select
              label="Inscrito"
              placeholder="Nombre, correo, documento o teléfono"
              searchable
              clearable
              searchValue={search}
              onSearchChange={setSearch}
              filter={({ options }) => options}
              nothingFoundMessage={search.trim().length < 2 ? "Escribe al menos 2 caracteres" : "Sin resultados"}
              data={userOptions.map((u) => ({
                value: u.user_id,
                label: `${u.name} · ${u.email}`,
              }))}
              value={user?.user_id || null}
              onChange={(v) => {
                setUser(userOptions.find((u) => u.user_id === v) || null);
                setSimulation(null);
                setPreview(null);
                setTriggerSim(null);
                setTriggerPreview(null);
              }}
              w={360}
            />
            <Button
              leftSection={<FaPlay />}
              disabled={!ready}
              loading={busy === "simulate"}
              onClick={() =>
                withBusy("simulate", async () =>
                  setSimulation(await simulateGenOn(program._id, user!.user_id, eventId!))
                )
              }
            >
              Simular
            </Button>
          </Group>

          {simulation && <SimulationCard simulation={simulation} />}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Title order={4}>Toques</Title>
          <Text size="sm" c="dimmed">
            Vista previa con los datos reales del inscrito, o envíala a tu
            teléfono: los botones y el reto siguen funcionando en ese teléfono,
            pero no marcan actividades ni cuentan en las métricas. Para enviar,
            la plantilla debe estar aprobada en Meta.
          </Text>
          <TextInput
            label="Teléfono de prueba"
            placeholder="573001112233"
            value={phone}
            onChange={(e) => setPhone(e.currentTarget.value)}
            w={260}
          />
          <ScrollArea>
            <Table miw={700}>
              <Table.Tbody>
                {steps.map((s) => (
                  <Table.Tr key={`${s.segment}-${s.key}`}>
                    <Table.Td w={60}>
                      <Badge variant="light">{s.key}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{s.label}</Text>
                      <Text size="xs" c="dimmed">
                        {SEGMENT_LABELS[s.segment]} · día {s.day}
                        {s.enabled ? "" : " · desactivado"}
                      </Text>
                    </Table.Td>
                    <Table.Td w={330}>
                      <Group gap="xs" justify="flex-end">
                        <Button
                          size="compact-sm"
                          variant="light"
                          leftSection={<FaEye />}
                          disabled={!ready}
                          loading={busy === `preview-${s.key}`}
                          onClick={() =>
                            withBusy(`preview-${s.key}`, async () =>
                              setPreview(
                                await previewGenOnStep(program._id, {
                                  userId: user!.user_id,
                                  eventId: eventId!,
                                  stepKey: s.key,
                                })
                              )
                            )
                          }
                        >
                          Vista previa
                        </Button>
                        <Button
                          size="compact-sm"
                          leftSection={<FaWhatsapp />}
                          disabled={!ready || phone.replace(/\D/g, "").length < 10}
                          loading={busy === `send-${s.key}`}
                          onClick={() =>
                            withBusy(`send-${s.key}`, async () => {
                              const res = await sendGenOnTest(program._id, {
                                userId: user!.user_id,
                                eventId: eventId!,
                                stepKey: s.key,
                                to: phone,
                              });
                              notifications.show({
                                color: "green",
                                title: "Enviado",
                                message: `${res.template} → ${phone}`,
                              });
                            })
                          }
                        >
                          Enviar a mi teléfono
                        </Button>
                        <Button
                          size="compact-sm"
                          color="green"
                          variant="outline"
                          leftSection={<FaWhatsapp />}
                          disabled={!ready}
                          loading={busy === `real-${s.key}`}
                          onClick={() =>
                            setRealSend({ kind: "step", key: s.key, label: `${s.key} · ${s.label}` })
                          }
                        >
                          Enviar a la persona
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          {preview && <PreviewCard preview={preview} />}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-end">
            <div>
              <Title order={4}>Disparadores (segmento 3, examen, certificado)</Title>
              <Text size="sm" c="dimmed">
                Qué le dispararía hoy al inscrito, su racha y lo que tiene en
                cola. La vista previa y el envío usan sus datos reales; si hoy
                no se cumple el disparador, usan datos de ejemplo.
              </Text>
            </div>
            <Button
              leftSection={<FaPlay />}
              disabled={!ready}
              loading={busy === "triggers"}
              onClick={() =>
                withBusy("triggers", async () =>
                  setTriggerSim(await simulateGenOnTriggers(program._id, user!.user_id, eventId!))
                )
              }
            >
              Simular disparadores
            </Button>
          </Group>

          <Paper withBorder p="sm" radius="md">
            <Group justify="space-between" align="center" wrap="wrap">
              <div style={{ maxWidth: 560 }}>
                <Text fw={600} size="sm">
                  Probar la racha (solo organizaciones de prueba)
                </Text>
                <Text size="xs" c="dimmed">
                  "Estudió hoy" cuenta el día de hoy como día de estudio.
                  "Pasar al día siguiente" corre un día atrás todas sus fechas,
                  como si pasara un día: así se llega a los hitos (3, 7, 14, 30
                  días), se corta la racha (un día sin estudio) o queda en
                  riesgo (sin estudio hoy, solo antes de la hora del aviso).
                  Luego envía el mensaje de racha desde la tabla.
                </Text>
              </div>
              <Group gap="xs">
                <Button
                  variant="light"
                  disabled={!ready}
                  loading={busy === "streak-study"}
                  onClick={() =>
                    withBusy("streak-study", async () =>
                      setTriggerSim(
                        await applyGenOnStreakLab(program._id, user!.user_id, eventId!, "study")
                      )
                    )
                  }
                >
                  📚 Estudió hoy
                </Button>
                <Button
                  variant="light"
                  disabled={!ready}
                  loading={busy === "streak-next"}
                  onClick={() =>
                    withBusy("streak-next", async () =>
                      setTriggerSim(
                        await applyGenOnStreakLab(program._id, user!.user_id, eventId!, "next_day")
                      )
                    )
                  }
                >
                  ⏭️ Pasar al día siguiente
                </Button>
              </Group>
            </Group>
          </Paper>

          {triggerSim && <TriggerSimulationCard sim={triggerSim} />}

          <ScrollArea>
            <Table miw={700}>
              <Table.Tbody>
                {catalog.triggers.map((t) => (
                  <Table.Tr key={t.key}>
                    <Table.Td w={110}>
                      <Badge variant="light" color="teal">
                        {t.step}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{t.label}</Text>
                    </Table.Td>
                    <Table.Td w={330}>
                      <Group gap="xs" justify="flex-end">
                        <Button
                          size="compact-sm"
                          variant="light"
                          leftSection={<FaEye />}
                          disabled={!ready}
                          loading={busy === `tpreview-${t.key}`}
                          onClick={() =>
                            withBusy(`tpreview-${t.key}`, async () =>
                              setTriggerPreview(
                                await previewGenOnTrigger(program._id, {
                                  userId: user!.user_id,
                                  eventId: eventId!,
                                  key: t.key,
                                })
                              )
                            )
                          }
                        >
                          Vista previa
                        </Button>
                        <Button
                          size="compact-sm"
                          leftSection={<FaWhatsapp />}
                          disabled={!ready || phone.replace(/\D/g, "").length < 10}
                          loading={busy === `tsend-${t.key}`}
                          onClick={() =>
                            withBusy(`tsend-${t.key}`, async () => {
                              const res = await sendGenOnTriggerTest(program._id, {
                                userId: user!.user_id,
                                eventId: eventId!,
                                key: t.key,
                                to: phone,
                              });
                              notifications.show({
                                color: "green",
                                title: "Enviado",
                                message: `${res.template} → ${phone}${res.sample ? " (datos de ejemplo)" : ""}`,
                              });
                            })
                          }
                        >
                          Enviar a mi teléfono
                        </Button>
                        <Button
                          size="compact-sm"
                          color="green"
                          variant="outline"
                          leftSection={<FaWhatsapp />}
                          disabled={!ready}
                          loading={busy === `real-${t.key}`}
                          onClick={() =>
                            setRealSend({
                              kind: "trigger",
                              key: t.key,
                              label: TRIGGER_LABELS[t.key] || t.key,
                            })
                          }
                        >
                          Enviar a la persona
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          {triggerPreview && (
            <Card withBorder bg="gray.0" p="md">
              <Group gap="xs" mb="xs">
                <Badge color="teal">{triggerPreview.step}</Badge>
                <Text size="xs" c="dimmed">
                  plantilla {triggerPreview.template_key}
                  {triggerPreview.approved ? " · aprobada" : " · sin aprobar (no se puede enviar)"}
                  {triggerPreview.sample ? " · hoy no se cumple: datos de ejemplo" : ""}
                </Text>
              </Group>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {triggerPreview.text}
              </Text>
              {triggerPreview.buttons.length > 0 && (
                <List size="xs" mt="xs">
                  {triggerPreview.buttons.map((b) => (
                    <List.Item key={b}>{b}</List.Item>
                  ))}
                </List>
              )}
              {triggerPreview.missing.length > 0 && (
                <Text size="xs" c="red" mt="xs">
                  Faltan datos para: {triggerPreview.missing.join(", ")}.
                </Text>
              )}
            </Card>
          )}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={4}>Ejecutar ahora en simulación</Title>
              <Text size="sm" c="dimmed">
                Segmenta todos los cursos del programa y planea, sin enviar
                nada, todo lo programado hasta el final de hoy (cada mensaje
                queda registrado a la hora de su franja). Lo verás como
                "Simulado" en el historial de cada persona (Seguimiento) y en
                Recordatorios → Resultados. Hasta 500 por ejecución: si quedan
                más, vuelve a ejecutarlo. Tarda según el tamaño de los cursos.
              </Text>
            </div>
            <Button
              leftSection={<FaPlay />}
              disabled={program.mode === "live"}
              loading={busy === "run"}
              onClick={() => withBusy("run", async () => setRun(await runGenOnNow(program._id)))}
            >
              Ejecutar ahora
            </Button>
          </Group>
          {program.mode === "live" && (
            <Text size="xs" c="orange">
              Con el programa activo los envíos son reales y los hace el cron.
            </Text>
          )}
          {busy === "run" && <Loader size="sm" />}
          {run && <RunResult run={run} />}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={4}>Enviar ya lo programado</Title>
              <Text size="sm" c="dimmed">
                Con el programa activo, envía de verdad y ahora mismo el próximo
                mensaje programado de cada persona (secuencia o disparador), sin
                esperar su franja. Uno por persona por clic; el tope semanal, el
                grupo de control y el consentimiento siguen aplicando. Hasta 200
                por clic.
              </Text>
            </div>
            <Button
              color="green"
              leftSection={<FaWhatsapp />}
              disabled={program.mode !== "live" || dirty}
              loading={busy === "send-now"}
              onClick={() => setConfirmSendNow(true)}
            >
              Enviar ya
            </Button>
          </Group>
          {program.mode !== "live" && (
            <Text size="xs" c="dimmed">
              Solo con el programa activo. En simulación usa "Ejecutar ahora".
            </Text>
          )}
          {busy === "send-now" && <Loader size="sm" />}
          {sendNow && <RunResult run={sendNow} />}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div style={{ maxWidth: 620 }}>
              <Title order={4}>Pasar el tiempo (todos)</Title>
              <Text size="sm" c="dimmed">
                Como el laboratorio de rachas, pero para todos los inscritos del
                programa (solo organizaciones de prueba). "Todos estudiaron hoy"
                cuenta hoy como día de estudio a quien haya terminado alguna
                actividad. "Pasar al día siguiente" corre un día atrás las fechas
                de todos y los vuelve a segmentar: el día nuevo cuenta para las
                rachas y para los flujos. Luego usa "Enviar ya" para mandar lo
                que toque.
              </Text>
            </div>
            <Group gap="xs">
              {(["study", "next_day"] as const).map((action) => (
                <Button
                  key={action}
                  variant="light"
                  disabled={dirty}
                  loading={busy === `streak-all-${action}`}
                  onClick={() =>
                    withBusy(`streak-all-${action}`, async () => {
                      const res = await applyGenOnStreakLabAll(program._id, action);
                      const skipped = res.results.filter((r) => !r.ok);
                      notifications.show({
                        color: skipped.length ? "yellow" : "green",
                        title:
                          action === "study"
                            ? `Estudiaron hoy: ${res.results.length - skipped.length} de ${res.results.length}`
                            : `Pasó un día para ${res.results.length} persona(s)`,
                        message:
                          skipped.map((r) => `${r.name}: ${r.reason}`).join(" · ") ||
                          'Usa "Enviar ya" para mandar lo que toque.',
                        autoClose: 10000,
                      });
                    })
                  }
                >
                  {action === "study" ? "📚 Todos estudiaron hoy" : "⏭️ Pasar al día siguiente"}
                </Button>
              ))}
            </Group>
          </Group>
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={4}>Actualizar grupos</Title>
              <Text size="sm" c="dimmed">
                Segmenta ya a todos los inscritos sin esperar al día siguiente:
                quien cambió de grupo (p. ej. terminó una actividad y pasó de
                abandono a activos) deja su secuencia anterior y empieza la del
                grupo nuevo. No envía nada ni cambia franjas; vale también con
                el programa activo.
              </Text>
            </div>
            <Button
              variant="light"
              leftSection={<FaPlay />}
              disabled={dirty}
              loading={busy === "regroup"}
              onClick={() =>
                withBusy("regroup", async () => {
                  const res = await regroupGenOn(program._id);
                  setRegroup(res);
                  notifications.show({
                    color: "green",
                    title: "Grupos actualizados",
                    message: res.changed.length
                      ? `${res.changed.length} persona(s) cambiaron de grupo.`
                      : "Nadie cambió de grupo.",
                  });
                })
              }
            >
              Actualizar grupos
            </Button>
          </Group>
          {regroup && (
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                Por grupo:{" "}
                {Object.entries(regroup.counts)
                  .map(([k, v]) => `${SEGMENT_LABELS[k as keyof typeof SEGMENT_LABELS] || k}: ${v}`)
                  .join(" · ") || "—"}
              </Text>
              {regroup.changed.map((c) => (
                <Text key={`${c.event_id}-${c.user_id}`} size="sm">
                  <b>{c.name}</b>: {c.from ? SEGMENT_LABELS[c.from] || c.from : "nuevo"} →{" "}
                  {SEGMENT_LABELS[c.to] || c.to}
                </Text>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>

      <Modal
        opened={Boolean(realSend)}
        onClose={() => setRealSend(null)}
        title="Enviar a la persona"
      >
        <Stack>
          <Text size="sm">
            Se envía <b>{realSend?.label}</b> de verdad al WhatsApp de{" "}
            <b>{user?.name || user?.email || "la persona seleccionada"}</b>, con su
            inscripción real: los botones, el reto y las respuestas del chatbot
            usan sus datos y quedan en su historial.
          </Text>
          <Alert color="orange" variant="light">
            No aplica el tope semanal ni el grupo de control. Si es un toque de
            su segmento actual, su secuencia avanza a él. Si el reto se aprueba,
            la actividad queda completada. No se puede deshacer.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRealSend(null)}>
              Cancelar
            </Button>
            <Button color="green" onClick={doRealSend}>
              Enviar
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={confirmSendNow}
        onClose={() => setConfirmSendNow(false)}
        title="Enviar ya lo programado"
      >
        <Stack>
          <Alert color="orange" variant="light">
            Se envían mensajes reales por WhatsApp a todas las personas con un
            mensaje programado, sin esperar su hora. No se puede deshacer.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmSendNow(false)}>
              Cancelar
            </Button>
            <Button
              color="green"
              onClick={() => {
                setConfirmSendNow(false);
                withBusy("send-now", async () =>
                  setSendNow(await sendGenOnScheduledNow(program._id))
                );
              }}
            >
              Enviar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function SimulationCard({ simulation: s }: { simulation: GenOnSimulation }) {
  return (
    <Card withBorder bg="gray.0" p="md">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <div>
          <Text size="xs" c="dimmed">Segmento hoy</Text>
          <Text fw={600}>{SEGMENT_LABELS[s.segment]}</Text>
          {s.holdout && <Badge color="grape" variant="light">Grupo de control: no recibe mensajes</Badge>}
        </div>
        <div>
          <Text size="xs" c="dimmed">Próximo toque</Text>
          <Text fw={600}>
            {s.next_step.next_step_key
              ? `${s.next_step.next_step_key} · ${formatDateTime(s.next_step.next_step_at)}`
              : "Ninguno"}
          </Text>
          <Text size="xs" c="dimmed">Franja {s.slot}</Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">Contacto</Text>
          <Group gap={4}>
            <Badge color={s.contact.has_phone ? "gray" : "red"} variant="outline">
              {s.contact.has_phone ? "Con teléfono" : "Sin teléfono"}
            </Badge>
            <Badge color={s.contact.consent ? "teal" : "orange"} variant="light">
              {s.contact.consent ? "Acepta WhatsApp" : "Sin consentimiento"}
            </Badge>
          </Group>
        </div>
        <div>
          <Text size="xs" c="dimmed">Avance</Text>
          <Text>
            {s.progress} % · {s.completed_activities} actividades completadas
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">Última actividad / inscripción</Text>
          <Text size="sm">
            {formatDateTime(s.last_activity_at)} / {formatDateTime(s.enrolled_at)}
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">Actividad del reto</Text>
          <Text size="sm">{s.challenge_activity || "Ninguna habilitada con preguntas suficientes"}</Text>
        </div>
      </SimpleGrid>
      {s.enrollment && (
        <Text size="xs" c="dimmed" mt="sm">
          Estado guardado: {SEGMENT_LABELS[s.enrollment.segment]} · último toque{" "}
          {s.enrollment.last_step_key || "—"}
          {s.enrollment.paused ? " · en pausa" : ""}
          {s.enrollment.exited ? ` · salió (${s.enrollment.exit_reason})` : ""}
          {s.enrollment.last_error ? ` · ${s.enrollment.last_error}` : ""}
        </Text>
      )}
    </Card>
  );
}

function PreviewCard({ preview: p }: { preview: GenOnPreview }) {
  if (p.skipped) {
    return (
      <Alert color="yellow" variant="light" title={`Toque ${p.step}`}>
        {p.reason}
      </Alert>
    );
  }
  return (
    <Card withBorder bg="gray.0" p="md">
      <Group gap="xs" mb="xs">
        <Badge>{p.step}</Badge>
        <Text size="xs" c="dimmed">
          Variante {String.fromCharCode(65 + (p.variant || 0))} · plantilla {p.template_key}
          {p.approved ? " · aprobada" : " · sin aprobar (no se puede enviar)"}
        </Text>
      </Group>
      <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
        {p.text}
      </Text>
      {p.buttons && p.buttons.length > 0 && (
        <List size="xs" mt="xs">
          {p.buttons.map((b) => (
            <List.Item key={b}>{b}</List.Item>
          ))}
        </List>
      )}
      {p.missing && p.missing.length > 0 && (
        <Text size="xs" c="red" mt="xs">
          Faltan datos para: {p.missing.join(", ")} (este toque se omitiría).
        </Text>
      )}
    </Card>
  );
}

function RunResult({ run }: { run: GenOnRunResult }) {
  return (
    <Stack gap="sm">
      {run.segmentation && (
        <Group gap="lg">
          <Text size="sm">
            <b>{run.segmentation.courses}</b> cursos segmentados:
          </Text>
          {Object.entries(run.segmentation.counts).map(([seg, n]) => (
            <Text key={seg} size="sm">
              {SEGMENT_LABELS[seg as keyof typeof SEGMENT_LABELS] || seg}: <b>{n}</b>
            </Text>
          ))}
        </Group>
      )}
      {run.detected && Object.keys(run.detected).length > 0 && (
        <Group gap="lg">
          <Text size="sm">Disparadores encolados:</Text>
          {Object.entries(run.detected).map(([k, n]) => (
            <Text key={k} size="sm">
              {TRIGGER_LABELS[k as keyof typeof TRIGGER_LABELS] || k}: <b>{n}</b>
            </Text>
          ))}
        </Group>
      )}
      <Group gap="lg">
        {Object.entries(run.by_result).map(([r, n]) => (
          <Text key={r} size="sm">
            {RESULT_LABELS[r] || r}: <b>{n}</b>
          </Text>
        ))}
        {!Object.keys(run.by_result).length && (
          <Text size="sm" c="dimmed">
            Ningún toque tocaba en este momento (salen en su franja horaria).
          </Text>
        )}
      </Group>
      {run.outcomes.length > 0 && (
        <ScrollArea h={300}>
          <Table striped miw={600}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Segmento</Table.Th>
                <Table.Th>Toque</Table.Th>
                <Table.Th>Resultado</Table.Th>
                <Table.Th>Motivo</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {run.outcomes.map((o) => (
                <Table.Tr key={o.enrollment_id}>
                  <Table.Td>{SEGMENT_LABELS[o.segment] || o.segment}</Table.Td>
                  <Table.Td>{o.step || "—"}</Table.Td>
                  <Table.Td>{RESULT_LABELS[o.result] || o.result}</Table.Td>
                  <Table.Td>
                    <Text size="xs">{o.reason || ""}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}
    </Stack>
  );
}

function TriggerSimulationCard({ sim }: { sim: GenOnTriggerSimulation }) {
  const s = sim.streak;
  return (
    <Card withBorder bg="gray.0" p="md">
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <div>
          <Text size="xs" c="dimmed">Segmento hoy</Text>
          <Text fw={600}>{SEGMENT_LABELS[sim.segment]}</Text>
          <Text size="xs" c="dimmed">
            {sim.weekly_activities} actividad(es) en los últimos 7 días
          </Text>
        </div>
        <div>
          <Text size="xs" c="dimmed">Racha</Text>
          <Text fw={600}>
            🔥 {s?.current ?? 0} día(s){s?.activeToday ? " · estudió hoy" : ""}
          </Text>
          <Text size="xs" c="dimmed">
            Hasta ayer: {s?.throughYesterday ?? 0} día(s) (cuenta para hitos y riesgo)
          </Text>
          {s?.broken && (
            <Text size="xs" c="orange">
              Se cortó: venía de {s.broken.count} días (último {s.broken.lastDay})
            </Text>
          )}
        </div>
        <div>
          <Text size="xs" c="dimmed">En cola</Text>
          {sim.queue.length ? (
            sim.queue.map((q) => (
              <Text key={`${q.key}-${q.due_at}`} size="xs">
                {TRIGGER_LABELS[q.key]} · {new Date(q.due_at).toLocaleString("es-CO")}
              </Text>
            ))
          ) : (
            <Text size="sm">Nada</Text>
          )}
        </div>
      </SimpleGrid>
      <Text size="xs" c="dimmed" mt="sm" mb={4}>
        Disparadores diarios que cumpliría hoy:
      </Text>
      {sim.candidates.length ? (
        <Group gap="xs">
          {sim.candidates.map((c) => (
            <Badge key={c.key} color={c.already_sent ? "gray" : "teal"} variant="light">
              {TRIGGER_LABELS[c.key]}
              {c.already_sent ? " (ya enviado)" : ""}
            </Badge>
          ))}
        </Group>
      ) : (
        <Text size="sm">Ninguno (el módulo terminado y el reto del video se detectan al completar una actividad).</Text>
      )}
    </Card>
  );
}
