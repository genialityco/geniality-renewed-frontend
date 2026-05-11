import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import {
  Table,
  Loader,
  Text,
  Group,
  Button,
  Badge,
  ActionIcon,
  Menu,
  Stack,
  Pagination,
  Paper,
  Image,
  Box,
} from "@mantine/core";
import {
  IconDots,
  IconDownload,
  IconChevronDown,
  IconChevronUp,
  IconFileText,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

import { useOrganization } from "../context/OrganizationContext";
import {
  getActivitiesByEvent,
  generateTranscript,
  saveTranscriptionText,
} from "../services/activityService";
import { fetchSegmentsByActivityId } from "../services/transcriptSegmentsService";
import { fetchEventsByOrganizer } from "../services/eventService";

import type { Activity, Event } from "../services/types";

interface GroupedActivities {
  event: Event;
  activities: Activity[];
}

export default function ActivitiesManagement() {
  const { organization } = useOrganization();

  const [events, setEvents] = useState<Event[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [groupedActivitiesData, setGroupedActivitiesData] = useState<
    GroupedActivities[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(5);

  const [generatingTranscript, setGeneratingTranscript] = useState<
    string | null
  >(null);

  const [generatingEventTranscript, setGeneratingEventTranscript] = useState<
    string | null
  >(null);

  const [fillingEventText, setFillingEventText] = useState<string | null>(null);

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const normalizeResults = <T,>(response: any): T[] => {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.results)) return response.results;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.events)) return response.events;
    if (Array.isArray(response?.activities)) return response.activities;

    return [];
  };

  const normalizeId = (value: any): string | null => {
    if (!value) return null;

    if (typeof value === "string") {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }

    if (typeof value === "object") {
      if (value._id) {
        return normalizeId(value._id);
      }

      if (value.$oid) {
        return normalizeId(value.$oid);
      }

      if (typeof value.toString === "function") {
        const id = value.toString();

        if (id && id !== "[object Object]") {
          return id.trim();
        }
      }
    }

    return null;
  };

  const getDateTime = (date: string | number | Date | undefined) => {
    if (!date) return 0;

    const value = new Date(date).getTime();

    return Number.isNaN(value) ? 0 : value;
  };

  const formatDate = (date: string | number | Date | undefined) => {
    if (!date) return "—";

    try {
      return new Date(date).toLocaleDateString("es-ES");
    } catch {
      return "—";
    }
  };

  const getEventImage = (event: Event): string | null => {
    const eventAny = event as any;
    const styles = eventAny.styles || {};

    return (
      eventAny.picture ||
      styles.banner_image ||
      styles.event_image ||
      styles.image ||
      null
    );
  };

  const loadData = useCallback(async () => {
    if (!organization?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const eventsResponse = await fetchEventsByOrganizer(organization._id);
      const loadedEvents = normalizeResults<Event>(eventsResponse);

      const sortedEvents = [...loadedEvents].sort((a, b) => {
        const dateA = getDateTime(a.created_at || a.createdAt);
        const dateB = getDateTime(b.created_at || b.createdAt);

        return dateB - dateA;
      });

      const groupedResults = await Promise.all(
        sortedEvents.map(async (event) => {
          const eventId = normalizeId((event as any)._id);

          if (!eventId) {
            return {
              event,
              activities: [],
            };
          }

          try {
            const activitiesResponse = await getActivitiesByEvent(eventId);
            const eventActivities =
              normalizeResults<Activity>(activitiesResponse);

            const sortedActivities = [...eventActivities].sort((a, b) => {
              const dateA = getDateTime(a.created_at || a.createdAt);
              const dateB = getDateTime(b.created_at || b.createdAt);

              return dateB - dateA;
            });

            return {
              event,
              activities: sortedActivities,
            };
          } catch (error) {
            console.error(
              `Error cargando actividades del evento ${eventId}:`,
              error,
            );

            return {
              event,
              activities: [],
            };
          }
        }),
      );

      const allActivities = groupedResults.flatMap((group) => group.activities);

      setEvents(sortedEvents);
      setGroupedActivitiesData(groupedResults);
      setActivities(allActivities);
    } catch (error) {
      console.error("Error cargando eventos o actividades:", error);

      notifications.show({
        title: "Error",
        message: "No se pudieron cargar los eventos o actividades",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }, [organization?._id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const allGroupedActivities: GroupedActivities[] = useMemo(() => {
    return [...groupedActivitiesData].sort((a, b) => {
      const dateA = getDateTime(a.event.created_at || a.event.createdAt);
      const dateB = getDateTime(b.event.created_at || b.event.createdAt);

      return dateB - dateA;
    });
  }, [groupedActivitiesData]);

  const totalPages = Math.ceil(allGroupedActivities.length / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const groupedActivities = allGroupedActivities.slice(startIndex, endIndex);

  useEffect(() => {
    if (totalPages > 0 && page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page]);

  const activitiesWithTranscript = activities.filter(
    (activity) => activity.transcript_available,
  ).length;

  const totalActivities = activities.length;

  const eventsFullyTranscribed = allGroupedActivities.filter(
    (group) =>
      group.activities.length > 0 &&
      group.activities.every((activity) => activity.transcript_available),
  ).length;

  const totalEvents = allGroupedActivities.length;

  const saveActivityTranscriptText = async (activityId: string) => {
    const segments = await fetchSegmentsByActivityId(activityId);

    const combinedText = segments
      .sort((a, b) => a.startTime - b.startTime)
      .map((segment) => segment.text?.trim())
      .filter(Boolean)
      .join(" ");

    if (!combinedText) {
      return false;
    }

    await saveTranscriptionText(activityId, combinedText);
    return true;
  };

  const handleFillEventText = async (
    eventId: string,
    activityIds: string[],
  ) => {
    try {
      setFillingEventText(eventId);

      let successCount = 0;
      let emptyCount = 0;
      let errorCount = 0;

      for (const activityId of activityIds) {
        try {
          const saved = await saveActivityTranscriptText(activityId);

          if (saved) {
            successCount++;
          } else {
            emptyCount++;
          }
        } catch (error) {
          console.error(
            `Error rellenando texto de transcripción para ${activityId}:`,
            error,
          );

          errorCount++;
        }
      }

      notifications.show({
        title: "Texto rellenado",
        message: `${successCount} texto(s) guardado(s)${
          emptyCount > 0 ? `, ${emptyCount} sin segmentos` : ""
        }${errorCount > 0 ? `, ${errorCount} errores` : ""}`,
        color: errorCount > 0 ? "yellow" : "green",
      });

      await loadData();
    } finally {
      setFillingEventText(null);
    }
  };

  const handleGenerateTranscript = async (activityId: string) => {
    try {
      setGeneratingTranscript(activityId);

      const result = await generateTranscript(activityId, {
        use_gpu: true,
        generate_embeddings: true,
      });

      notifications.show({
        title: "Éxito",
        message: result.message || "Transcripción generada correctamente",
        color: "green",
      });

      try {
        await saveActivityTranscriptText(activityId);
      } catch (error) {
        console.error("Error guardando texto de transcripción:", error);
      }

      await loadData();
    } catch (error) {
      console.error("Error generando transcripción:", error);

      notifications.show({
        title: "Error",
        message: "No se pudo generar la transcripción",
        color: "red",
      });
    } finally {
      setGeneratingTranscript(null);
    }
  };

  const handleGenerateAllTranscripts = async (
    eventId: string,
    activityIds: string[],
  ) => {
    try {
      setGeneratingEventTranscript(eventId);

      let successCount = 0;
      let errorCount = 0;

      for (const activityId of activityIds) {
        try {
          await generateTranscript(activityId, {
            use_gpu: true,
            generate_embeddings: true,
          });

          successCount++;

          try {
            await saveActivityTranscriptText(activityId);
          } catch (error) {
            console.error(
              `Error guardando texto de transcripción para ${activityId}:`,
              error,
            );
          }
        } catch (error) {
          console.error(
            `Error generando transcripción para ${activityId}:`,
            error,
          );

          errorCount++;
        }
      }

      notifications.show({
        title: "Generación completada",
        message: `${successCount} transcripciones generadas${
          errorCount > 0 ? `, ${errorCount} errores` : ""
        }`,
        color: errorCount > 0 ? "yellow" : "green",
      });

      await loadData();
    } finally {
      setGeneratingEventTranscript(null);
    }
  };

  const toggleEventExpanded = (eventId: string) => {
    setExpandedEvents((current) => {
      const newExpanded = new Set(current);

      if (newExpanded.has(eventId)) {
        newExpanded.delete(eventId);
      } else {
        newExpanded.add(eventId);
      }

      return newExpanded;
    });
  };

  if (loading && events.length === 0 && activities.length === 0) {
    return (
      <Stack p="xl">
        <Group justify="center">
          <Loader />
          <Text>Cargando eventos y actividades...</Text>
        </Group>
      </Stack>
    );
  }

  return (
    <Stack p="xs" gap="md">
      <div>
        <Text size="lg" fw={600}>
          Actividades
        </Text>

        <Text size="sm" c="dimmed">
          Total: {activities.length} actividades
        </Text>
      </div>

      <Paper
        withBorder
        radius="md"
        p="md"
        style={{ backgroundColor: "#f0f4ff" }}
      >
        <Group justify="space-between" align="flex-start">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              📊 Estadísticas de Transcripción
            </Text>
          </div>

          <Group gap="lg" justify="flex-end">
            <div style={{ textAlign: "right" }}>
              <Text size="sm" fw={600} c="blue">
                {activitiesWithTranscript}/{totalActivities}
              </Text>

              <Text size="xs" c="dimmed">
                Actividades transcritas
              </Text>
            </div>

            <div style={{ textAlign: "right" }}>
              <Text size="sm" fw={600} c="green">
                {eventsFullyTranscribed}/{totalEvents}
              </Text>

              <Text size="xs" c="dimmed">
                Eventos transcritos completamente
              </Text>
            </div>
          </Group>
        </Group>
      </Paper>

      <Paper withBorder radius="md" shadow="sm" p={0}>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 50 }} />
              <Table.Th>Imagen</Table.Th>
              <Table.Th>Evento</Table.Th>
              <Table.Th>Fecha de Creación</Table.Th>
              <Table.Th>Actividades</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {groupedActivities.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6}>
                  <Text ta="center" c="dimmed">
                    No hay eventos disponibles.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              groupedActivities.map((group, index) => {
                const event = group.event;
                const normalizedEventId = normalizeId((event as any)._id);
                const eventId = normalizedEventId || `evento-${index}`;
                const isExpanded = expandedEvents.has(eventId);

                const eventName = event.name || "Sin nombre";
                const eventImage = getEventImage(event);

                const activitiesWithoutTranscript = group.activities.filter(
                  (activity) => !activity.transcript_available,
                );

                const allActivitiesHaveTranscript =
                  group.activities.length > 0 &&
                  group.activities.every(
                    (activity) => activity.transcript_available,
                  );

                return (
                  <Fragment key={eventId}>
                    <Table.Tr>
                      <Table.Td
                        style={{
                          textAlign: "center",
                          cursor:
                            group.activities.length > 0 ? "pointer" : "default",
                          padding: "8px",
                        }}
                        onClick={() => {
                          if (group.activities.length > 0) {
                            toggleEventExpanded(eventId);
                          }
                        }}
                      >
                        {group.activities.length > 0 ? (
                          isExpanded ? (
                            <IconChevronUp size={20} />
                          ) : (
                            <IconChevronDown size={20} />
                          )
                        ) : (
                          <Text c="dimmed" size="sm">
                            —
                          </Text>
                        )}
                      </Table.Td>

                      <Table.Td>
                        {eventImage ? (
                          <Image
                            src={eventImage}
                            alt={eventName}
                            height={48}
                            width={80}
                            style={{
                              objectFit: "cover",
                              borderRadius: 4,
                            }}
                          />
                        ) : (
                          <Text c="dimmed" size="sm">
                            —
                          </Text>
                        )}
                      </Table.Td>

                      <Table.Td>
                        <Text fw={500} lineClamp={1}>
                          {eventName}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        <Badge variant="outline" color="blue">
                          {formatDate(event.created_at || event.createdAt)}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Badge
                          color={group.activities.length > 0 ? "cyan" : "gray"}
                        >
                          {group.activities.length} actividad(es)
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        {activitiesWithoutTranscript.length > 0 ? (
                          <Button
                            size="xs"
                            leftSection={<IconDownload size={14} />}
                            onClick={() =>
                              handleGenerateAllTranscripts(
                                eventId,
                                activitiesWithoutTranscript.map(
                                  (activity) => activity._id,
                                ),
                              )
                            }
                            disabled={generatingEventTranscript === eventId}
                            loading={generatingEventTranscript === eventId}
                          >
                            Transcribir ({activitiesWithoutTranscript.length})
                          </Button>
                        ) : allActivitiesHaveTranscript ? (
                          <Button
                            size="xs"
                            variant="light"
                            color="green"
                            leftSection={<IconFileText size={14} />}
                            onClick={() =>
                              handleFillEventText(
                                eventId,
                                group.activities.map(
                                  (activity) => activity._id,
                                ),
                              )
                            }
                            disabled={fillingEventText === eventId}
                            loading={fillingEventText === eventId}
                          >
                            Rellenar texto
                          </Button>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>

                    {isExpanded && (
                      <Table.Tr>
                        <Table.Td
                          colSpan={6}
                          p={0}
                          style={{ backgroundColor: "#f8f9fa" }}
                        >
                          <Box p="md">
                            <Stack gap="md">
                              <Text fw={500} size="sm" c="dimmed">
                                Actividades del evento
                              </Text>

                              <Paper withBorder>
                                <Table>
                                  <Table.Thead>
                                    <Table.Tr>
                                      <Table.Th>Nombre</Table.Th>
                                      <Table.Th>Fecha de Creación</Table.Th>
                                      <Table.Th>Transcripción</Table.Th>
                                      <Table.Th>Acciones</Table.Th>
                                    </Table.Tr>
                                  </Table.Thead>

                                  <Table.Tbody>
                                    {group.activities.length === 0 ? (
                                      <Table.Tr>
                                        <Table.Td colSpan={4}>
                                          <Text
                                            ta="center"
                                            c="dimmed"
                                            size="sm"
                                          >
                                            Este evento no tiene actividades.
                                          </Text>
                                        </Table.Td>
                                      </Table.Tr>
                                    ) : (
                                      group.activities.map((activity) => (
                                        <Table.Tr key={activity._id}>
                                          <Table.Td>
                                            <Text size="sm" fw={500}>
                                              {activity.name}
                                            </Text>
                                          </Table.Td>

                                          <Table.Td>
                                            <Text size="sm">
                                              {formatDate(
                                                activity.created_at ||
                                                  activity.createdAt,
                                              )}
                                            </Text>
                                          </Table.Td>

                                          <Table.Td>
                                            <Badge
                                              color={
                                                activity.transcript_available
                                                  ? "green"
                                                  : "gray"
                                              }
                                              variant="light"
                                            >
                                              {activity.transcript_available
                                                ? "Sí"
                                                : "No"}
                                            </Badge>
                                          </Table.Td>

                                          <Table.Td>
                                            <Menu
                                              shadow="md"
                                              position="bottom-end"
                                            >
                                              <Menu.Target>
                                                <ActionIcon
                                                  variant="subtle"
                                                  color="gray"
                                                  size="sm"
                                                >
                                                  <IconDots size={16} />
                                                </ActionIcon>
                                              </Menu.Target>

                                              <Menu.Dropdown>
                                                <Menu.Item
                                                  leftSection={
                                                    <IconDownload size={14} />
                                                  }
                                                  onClick={() =>
                                                    handleGenerateTranscript(
                                                      activity._id,
                                                    )
                                                  }
                                                  disabled={
                                                    generatingTranscript ===
                                                    activity._id
                                                  }
                                                >
                                                  {generatingTranscript ===
                                                  activity._id
                                                    ? "Generando..."
                                                    : "Generar Transcripción"}
                                                </Menu.Item>

                                                {activity.transcript_available && (
                                                  <Menu.Item
                                                    leftSection={
                                                      <IconFileText size={14} />
                                                    }
                                                    onClick={() =>
                                                      handleFillEventText(
                                                        activity._id,
                                                        [activity._id],
                                                      )
                                                    }
                                                    disabled={
                                                      fillingEventText ===
                                                      activity._id
                                                    }
                                                  >
                                                    Rellenar texto
                                                  </Menu.Item>
                                                )}
                                              </Menu.Dropdown>
                                            </Menu>
                                          </Table.Td>
                                        </Table.Tr>
                                      ))
                                    )}
                                  </Table.Tbody>
                                </Table>
                              </Paper>
                            </Stack>
                          </Box>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination
            value={page}
            onChange={setPage}
            total={totalPages}
            size="sm"
          />
        </Group>
      )}
    </Stack>
  );
}
