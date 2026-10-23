// src/pages/admin/genon/CoursesTab.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Card,
  Checkbox,
  Group,
  Loader,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  GenOnCourse,
  GenOnCourseConfig,
  GenOnCourseDetail,
  apiError,
  fetchGenOnCourseDetail,
  fetchGenOnCourses,
} from "../../../services/genonService";
import type { GenOnTabProps } from "./GenOnAdminPage";

const emptyConfig = (): GenOnCourseConfig => ({
  challenge_activity_ids: [],
  activity_minutes: {},
  skippable_activity_ids: [],
});

export default function CoursesTab({ program, patch }: GenOnTabProps) {
  const [courses, setCourses] = useState<GenOnCourse[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GenOnCourseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGenOnCourses(program._id)
      .then((list) => {
        setCourses(list);
        if (list.length && !eventId) setEventId(list[0]._id);
      })
      .catch((e) => setError(apiError(e, "No se pudieron cargar los cursos")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program._id]);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetchGenOnCourseDetail(program._id, eventId)
      .then(setDetail)
      .catch((e) => setError(apiError(e, "No se pudo cargar el curso")))
      .finally(() => setLoading(false));
  }, [program._id, eventId]);

  const config: GenOnCourseConfig =
    (eventId && program.courses?.[eventId]) || emptyConfig();
  const setConfig = (changes: Partial<GenOnCourseConfig>) =>
    eventId &&
    patch({
      courses: { ...program.courses, [eventId]: { ...emptyConfig(), ...config, ...changes } },
    });

  const toggleChallenge = (activityId: string, enabled: boolean) =>
    setConfig({
      challenge_activity_ids: enabled
        ? [...new Set([...config.challenge_activity_ids, activityId])]
        : config.challenge_activity_ids.filter((id) => id !== activityId),
    });

  const needed = program.challenge.num_questions;
  const videoNeeded = program.triggers?.video_challenge.num_questions || 1;

  const toggleSkippable = (activityId: string, enabled: boolean) =>
    setConfig({
      skippable_activity_ids: enabled
        ? [...new Set([...(config.skippable_activity_ids || []), activityId])]
        : (config.skippable_activity_ids || []).filter((id) => id !== activityId),
    });

  return (
    <Stack gap="lg">
      <Alert color="blue" variant="light">
        Un reto superado marca la actividad como terminada en GenCampus. Solo
        pueden completarse con reto las actividades que habilites aquí (nunca
        exámenes). Cada una necesita al menos {needed} preguntas de
        verdadero/falso, opción única o selección múltiple en su banco de
        preguntas; se generan y editan en Admin → Actividades.
        <br />
        Un video saltable permite el reto del video (fase 2): al terminar la
        actividad anterior, la persona puede responder {videoNeeded} pregunta(s)
        y, si acierta, el video queda como visto. No marques como saltables los
        videos con contenido evaluado o exigido para la certificación.
      </Alert>

      {error && (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      )}

      <Group align="flex-end">
        <Select
          label="Curso"
          placeholder={courses.length ? "Elige un curso" : "El programa aún no tiene cursos"}
          data={courses.map((c) => ({ value: c._id, label: c.name }))}
          value={eventId}
          onChange={setEventId}
          searchable
          w={420}
        />
        <Text size="xs" c="dimmed" mb={8}>
          Los cursos salen de la configuración guardada del programa.
        </Text>
      </Group>

      {loading ? (
        <Loader />
      ) : detail ? (
        <Card withBorder radius="md" p={0}>
          <ScrollArea>
            <Table striped highlightOnHover miw={900}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Actividad</Table.Th>
                  <Table.Th ta="right">Preguntas para reto</Table.Th>
                  <Table.Th>Tema</Table.Th>
                  <Table.Th ta="right">Video</Table.Th>
                  <Table.Th>Minutos estimados</Table.Th>
                  <Table.Th>Reto</Table.Th>
                  <Table.Th>Video saltable</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {detail.activities.map((a) => {
                  const enough = a.challenge_questions >= needed;
                  const enabled = config.challenge_activity_ids.includes(a.id);
                  return (
                    <Table.Tr key={a.id}>
                      <Table.Td>{a.order}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{a.name}</Text>
                        {a.module_name && (
                          <Text size="xs" c="dimmed">
                            {a.module_name}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" c={enough ? undefined : "red"}>
                          {a.challenge_questions}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">{a.topic || "—"}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        {a.video_minutes ? `${a.video_minutes} min` : "—"}
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          size="xs"
                          w={110}
                          min={1}
                          placeholder={String(a.video_minutes || program.default_activity_minutes)}
                          value={config.activity_minutes?.[a.id] ?? ""}
                          onChange={(v) => {
                            const minutes = { ...config.activity_minutes };
                            if (v === "" || !Number(v)) delete minutes[a.id];
                            else minutes[a.id] = Number(v);
                            setConfig({ activity_minutes: minutes });
                          }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Tooltip
                          label={`Necesita al menos ${needed} preguntas válidas`}
                          disabled={enough || enabled}
                        >
                          <div>
                            <Checkbox
                              checked={enabled}
                              disabled={!enough && !enabled}
                              onChange={(e) => toggleChallenge(a.id, e.currentTarget.checked)}
                              label="Habilitada"
                            />
                          </div>
                        </Tooltip>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip
                          label={`Necesita al menos ${videoNeeded} pregunta(s) válida(s)`}
                          disabled={a.challenge_questions >= videoNeeded || a.skippable}
                        >
                          <div>
                            <Checkbox
                              checked={(config.skippable_activity_ids || []).includes(a.id)}
                              disabled={
                                a.challenge_questions < videoNeeded &&
                                !(config.skippable_activity_ids || []).includes(a.id)
                              }
                              onChange={(e) => toggleSkippable(a.id, e.currentTarget.checked)}
                              label="Saltable"
                            />
                          </div>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      ) : null}
    </Stack>
  );
}
