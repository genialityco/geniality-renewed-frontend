import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AppShell,
  Text,
  Loader,
  Container,
  Title,
  Accordion,
  Card,
  Group,
  Divider,
  Flex,
  ScrollArea,
  Progress,
  Avatar,
  Stack,
  Box,
  SimpleGrid,
} from "@mantine/core";
import {
  FaBookOpen,
  FaArrowLeft,
  FaRegCircleQuestion,
  FaCircleCheck,
} from "react-icons/fa6";

import { fetchEventById } from "../../services/eventService";
import { getModulesByEventId } from "../../services/moduleService";
import { getActivitiesByEvent } from "../../services/activityService";
import { Event, Module, Activity, Host } from "../../services/types";
import QuizDrawer from "../../components/QuizDrawer";
import ActivityDetail from "../../components/ActivityDetail";
import { useUser } from "../../context/UserContext";
import {
  createOrUpdateCourseAttendee,
  CourseAttendeePayload,
} from "../../services/courseAttendeeService";
import { fetchHostsByEventId } from "../../services/hostsService";

// ========== COMPONENTE: Mini Card Horizontal ==========
interface ActivityMiniCardProps {
  activity: Activity;
  host?: Host;
  onClick: () => void;
}

function ActivityMiniCard({ activity, host, onClick }: ActivityMiniCardProps) {
  const progress = activity.video_progress || 0;
  const isComplete = progress === 100;

  return (
    <Card
      shadow="sm"
      radius="lg"
      withBorder
      p="sm"
      style={{
        cursor: "pointer",
        minWidth: 160,
        maxWidth: 160,
        position: "relative",
        background: "white",
      }}
      onClick={onClick}
    >
      {isComplete && (
        <Box
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "#2f9e44",
            borderRadius: "50%",
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FaCircleCheck size={12} color="white" />
        </Box>
      )}

      <Stack align="center" gap="xs">
        <Avatar src={host?.image} alt={host?.name} size={56} radius="xl" />
        <Box style={{ textAlign: "center", width: "100%" }}>
          <Text size="xs" fw={700} lineClamp={2} mb={2}>
            {activity.name}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {host?.name || "Sin speaker"}
          </Text>
        </Box>
      </Stack>
    </Card>
  );
}

// ========== COMPONENTE: Fila de Progreso ==========
interface ActivityProgressRowProps {
  title: string;
  progress: number;
  onClick: () => void;
  leftIcon?: React.ReactNode;
}

function ActivityProgressRow({
  title,
  progress,
  onClick,
  leftIcon,
}: ActivityProgressRowProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const statusLabel =
    clampedProgress === 0
      ? "Sin ver (0%)"
      : `Sin ver (${Math.round(clampedProgress)}%)`;

  // Gradiente de rojo a azul según el progreso
  const getProgressColor = () => {
    if (clampedProgress === 0) return "#fa5252";
    if (clampedProgress < 30) return "#fd7e14";
    if (clampedProgress < 70) return "#fab005";
    return "#228be6";
  };

  return (
    <Box
      onClick={onClick}
      style={{
        cursor: "pointer",
        padding: "8px 0",
        borderBottom: "1px solid #e9ecef",
      }}
    >
      <Group justify="space-between" mb={4}>
        <Group gap={6}>
          {leftIcon}
          <Text size="xs" fw={500}>
            {title}
          </Text>
        </Group>
        <Text size="xs" c="dimmed">
          {statusLabel}
        </Text>
      </Group>
      <Progress
        value={clampedProgress}
        size="sm"
        radius="xl"
        color={getProgressColor()}
        styles={{
          root: { background: "#e9ecef" },
        }}
      />
    </Box>
  );
}

// ========== COMPONENTE PRINCIPAL ==========
export default function CourseDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );

  const [drawerQuestionnaireOpen, setDrawerQuestionnaireOpen] = useState(false);
  const [quizContext, setQuizContext] = useState({
    transcript: "",
    activityId: "",
  });

  const { userId } = useUser();

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (eventId) {
          const eventData = await fetchEventById(eventId);
          setEvent(eventData);

          const modulesData = await getModulesByEventId(eventId);
          setModules(modulesData);

          const activitiesData = await getActivitiesByEvent(eventId);
          setActivities(activitiesData);

          const hostData = await fetchHostsByEventId(eventId);
          setHosts(hostData);

          const activityParam = searchParams.get("activity");
          if (activityParam) {
            const foundActivity = activitiesData.find(
              (act) => act._id === activityParam
            );
            if (foundActivity) {
              setSelectedActivity(foundActivity);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, searchParams]);

  // Inscribir usuario
  useEffect(() => {
    if (!event || !userId) return;

    const enrollInCourse = async () => {
      try {
        const payloadCourse: CourseAttendeePayload = {
          user_id: userId,
          event_id: event._id.toString(),
        };
        await createOrUpdateCourseAttendee(payloadCourse);
      } catch (error) {
        console.error("Error inscribiendo:", error);
      }
    };

    enrollInCourse();
  }, [event, userId]);

  if (loading) return <Loader />;
  if (!event) return <Text>Curso no encontrado</Text>;

  // Utilidades
  const clampPercent = (val: number) => Math.min(Math.max(val, 0), 100);

  const handleActivitySelection = (activity: Activity) => {
    setSelectedActivity(activity);
    if (activity?._id) {
      setSearchParams({ activity: activity._id });
    }
  };

  const handleStartQuestionnaire = () => {
    if (selectedActivity) {
      setQuizContext({
        transcript: selectedActivity.description || "",
        activityId: selectedActivity._id || "",
      });
    }
    setDrawerQuestionnaireOpen(true);
  };

  const handleStartQuestionnaireFromModule = (moduleId: string) => {
    setQuizContext({
      transcript: `Cuestionario del módulo ${moduleId}`,
      activityId: moduleId,
    });
    setDrawerQuestionnaireOpen(true);
  };

  const handleBack = () => {
    if (searchParams.has("activity")) {
      setSearchParams({});
      setSelectedActivity(null);
    } else if (organizationId) {
      window.location.href = `${window.location.origin}/organization/${organizationId}`;
    } else {
      window.location.href = `${window.location.origin}/organization`;
    }
  };

  const handleBackHome = () => {
    navigate(`/organization/${organizationId}`);
  };

  function getShareUrl(activity: Activity) {
    return `${window.location.origin}/organization/${organizationId}/course/${eventId}?activity=${activity._id}`;
  }

  // Ordenar datos
  const orderedModules = [...modules].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );
  const sortedActivities = [...activities].sort(
    (a, b) =>
      new Date(a.created_at || 0).getTime() -
      new Date(b.created_at || 0).getTime()
  );

  // Si hay actividad seleccionada, mostrar detalle
  if (selectedActivity) {
    return (
      <AppShell>
        {/* HEADER */}
        <AppShell.Header
          style={{
            borderBottom: "none",
            height: 80,
          }}
        >
          <Container size="lg" h="100%">
            <Flex align="center" h="100%" gap="lg">
              <FaArrowLeft
                size={22}
                style={{ cursor: "pointer" }}
                onClick={handleBack}
              />
              <Avatar
                src={event.styles.menu_image}
                alt="Logo"
                size={100}
                radius="md"
                style={{ cursor: "pointer" }}
                onClick={handleBackHome}
                styles={{
                  image: {
                    objectFit: "contain",
                  },
                }}
              />
              <Box style={{ flex: 1 }}>
                <Text
                  size="md"
                  fw={700}
                  tt="uppercase"
                  style={{ lineHeight: 1.3 }}
                >
                  {event.name}
                </Text>
              </Box>
            </Flex>
          </Container>
        </AppShell.Header>

        <AppShell.Main>
          <Container size="lg" py="md">
            <ActivityDetail
              activity={selectedActivity}
              eventId={event._id}
              onStartQuestionnaire={handleStartQuestionnaire}
              shareUrl={getShareUrl(selectedActivity)}
              activities={sortedActivities}
            />
          </Container>

          {/* Footer */}
          <Box
            style={{
              cursor: "pointer",
              height: 195,
              display: "flex",
              alignItems: "center",
            }}
            onClick={handleBackHome}
          >
            <img
              src={event.styles.banner_footer}
              alt="Logo"
              style={{
                height: "100%",
                width: "auto",
                objectFit: "contain",
              }}
            />
          </Box>

          <QuizDrawer
            opened={drawerQuestionnaireOpen}
            onClose={() => setDrawerQuestionnaireOpen(false)}
            transcript={quizContext.transcript}
            activityId={quizContext.activityId}
          />
        </AppShell.Main>
      </AppShell>
    );
  }

  // Vista principal: sin actividad seleccionada
  return (
    <AppShell>
      {/* HEADER MINT */}
      <AppShell.Header
        style={{
          borderBottom: "none",
          height: 80,
        }}
      >
        <Container size="lg" h="100%">
          <Flex align="center" h="100%" gap="lg">
            <FaArrowLeft
              size={22}
              style={{ cursor: "pointer" }}
              onClick={handleBack}
            />
            <Avatar
              src={event.styles.menu_image}
              alt="Logo"
              size={100}
              radius="md"
              style={{ cursor: "pointer" }}
              onClick={handleBackHome}
              styles={{
                image: {
                  objectFit: "contain",
                },
              }}
            />
            <Box style={{ flex: 1 }}>
              <Text
                size="md"
                fw={700}
                tt="uppercase"
                style={{ lineHeight: 1.3 }}
              >
                {event.name}
              </Text>
            </Box>
          </Flex>
        </Container>
      </AppShell.Header>

      {/* MAIN CONTENT */}
      <AppShell.Main style={{ background: "#f8f9fa" }}>
        <Container size="lg" py="lg">
          <Text fw={500} size="sm" mb={2}>
            Bienvenido(a) al curso{" "}
            <Text span fw={700}>
              {event.name}
            </Text>
            .
          </Text>
          <Text size="xs" c="dimmed" mb="lg">
            Selecciona una actividad para ver detalles
          </Text>

          <Title order={5} mb="md">
            Módulos y actividades
          </Title>

          {/* MÓDULOS CON ACORDEÓN */}
          {orderedModules.length === 0 ? (
            <Stack gap="xs">
              {sortedActivities.length === 0 ? (
                <Text size="sm" c="dimmed">
                  No hay actividades
                </Text>
              ) : (
                sortedActivities.map((act) => (
                  <ActivityProgressRow
                    key={act._id}
                    title={act.name}
                    progress={clampPercent(act.video_progress || 0)}
                    onClick={() => handleActivitySelection(act)}
                  />
                ))
              )}
            </Stack>
          ) : (
            <Accordion
              variant="filled"
              radius="md"
              styles={{
                item: {
                  background: "transparent",
                  marginBottom: 8,
                },
                control: {
                  background: "#bff6de",
                  borderRadius: 6,
                  padding: "12px 16px",
                  fontSize: "0.875rem",
                  "&:hover": {
                    background: "#a8edd0",
                  },
                },
                content: {
                  paddingTop: 12,
                  paddingBottom: 12,
                  background: "white",
                  borderRadius: "0 0 6px 6px",
                },
                chevron: {
                  color: "#000",
                },
              }}
            >
              {orderedModules.map((module) => {
                const moduleActivities = sortedActivities.filter(
                  (a) =>
                    String((a as any).module_id ?? "") === String(module._id)
                );

                const total = moduleActivities.length;
                const avgProgress =
                  total > 0
                    ? moduleActivities.reduce(
                        (acc, a) => acc + clampPercent(a.video_progress || 0),
                        0
                      ) / total
                    : 0;

                const pct = Math.round(clampPercent(avgProgress));
                const statusLabel =
                  pct === 100 ? `Progreso (${pct}%)` : `Sin progreso (${pct}%)`;
                const statusColor = pct === 100 ? "#228be6" : "#fa5252";

                return (
                  <Accordion.Item key={module._id} value={module._id}>
                    <Accordion.Control>
                      <Group justify="space-between" wrap="nowrap">
                        <Text fw={700} size="xs" tt="uppercase">
                          {module.module_name}
                        </Text>
                        <Text fw={700} size="xs" c={statusColor}>
                          {statusLabel}
                        </Text>
                      </Group>
                    </Accordion.Control>

                    <Accordion.Panel>
                      {/* Scroll horizontal de cards */}
                      {moduleActivities.length > 0 ? (
                        <ScrollArea type="auto" scrollbarSize={6} mb="md">
                          <Group wrap="nowrap" gap="sm" pb="xs">
                            {moduleActivities.map((act) => {
                              const host = hosts.find((h) =>
                                h.activities_ids?.includes(act._id)
                              );
                              return (
                                <ActivityMiniCard
                                  key={act._id}
                                  activity={act}
                                  host={host}
                                  onClick={() => handleActivitySelection(act)}
                                />
                              );
                            })}
                          </Group>
                        </ScrollArea>
                      ) : (
                        <Text size="xs" c="dimmed" mb="md">
                          Sin actividades en este módulo
                        </Text>
                      )}

                      {/* Lista con progress bars */}
                      <Stack gap={0}>
                        {moduleActivities.map((act) => (
                          <ActivityProgressRow
                            key={act._id}
                            title={act.name}
                            progress={clampPercent(act.video_progress || 0)}
                            onClick={() => handleActivitySelection(act)}
                          />
                        ))}

                        {/* Fila de preguntas */}
                        <ActivityProgressRow
                          title="PREGUNTAS 4"
                          progress={0}
                          onClick={() =>
                            handleStartQuestionnaireFromModule(module._id)
                          }
                          leftIcon={<FaRegCircleQuestion size={16} />}
                        />
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}

          <Divider my="lg" />

          {/* SPEAKERS */}
          <Title order={5} mb="md">
            Speakers
          </Title>

          {hosts.length === 0 ? (
            <Text size="xs" c="dimmed">
              No hay conferencistas asignados.
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 6 }} spacing="sm">
              {hosts.map((host) => (
                <Card
                  key={host._id}
                  withBorder
                  radius="md"
                  shadow="sm"
                  p="xs"
                  style={{ cursor: "pointer" }}
                >
                  <Group wrap="nowrap" gap="xs">
                    <Avatar
                      src={host.image}
                      alt={host.name}
                      size={36}
                      radius="xl"
                    />
                    <Box style={{ minWidth: 0, flex: 1 }}>
                      <Group gap={4} wrap="nowrap" mb={2}>
                        <Box
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: "#2f9e44",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <FaBookOpen size={7} color="white" />
                        </Box>
                        <Text fw={700} size="xs" lineClamp={1}>
                          {host.name}
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {(host as any).title || "Conferencista"}
                      </Text>
                    </Box>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Container>

        {/* FOOTER MINT */}
        <Box
          style={{
            cursor: "pointer",
            height: 195,
            display: "flex",
            alignItems: "center",
          }}
          onClick={handleBackHome}
        >
          <img
            src={event.styles.banner_footer}
            alt="Logo"
            style={{
              height: "100%",
              width: "auto",
              objectFit: "contain",
            }}
          />
        </Box>

        <QuizDrawer
          opened={drawerQuestionnaireOpen}
          onClose={() => setDrawerQuestionnaireOpen(false)}
          transcript={quizContext.transcript}
          activityId={quizContext.activityId}
        />
      </AppShell.Main>
    </AppShell>
  );
}
