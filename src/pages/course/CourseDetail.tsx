import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AppShell,
  Text,
  Loader,
  Container,
  Title,
  Accordion,
  UnstyledButton,
  Group,
  Drawer,
  Divider,
  Burger,
  Flex,
  ScrollArea,
  Progress,
  Image,
  Avatar,
  Stack,
  SimpleGrid,
  Button,
  Badge,
  Box,
  ThemeIcon,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  FaListUl,
  FaUsers,
  FaArrowLeft,
  FaPlay,
  FaCircleCheck,
} from "react-icons/fa6";
import { IconBook } from "@tabler/icons-react";

import { fetchEventById } from "../../services/eventService";
import { getModulesByEventId } from "../../services/moduleService";
import { getActivitiesByEvent } from "../../services/activityService";
import { Event, Module, Activity, Host } from "../../services/types";

import ActivityDetail from "../../components/ActivityDetail";

import { useUser } from "../../context/UserContext";
import {
  createOrUpdateCourseAttendee,
  CourseAttendeePayload,
} from "../../services/courseAttendeeService";
import { fetchHostsByEventId } from "../../services/hostsService";
import { getQuizByEventId, Quiz as QuizData } from "../../services/QuizService";
import { getUserAttempts } from "../../services/userQuizAttemptService";

// ─── Activity row item ────────────────────────────────────────────────────────
interface ActivityRowProps {
  activity: Activity;
  hosts: Host[];
  index: number;
  isSelected?: boolean;
  compact?: boolean;
  onClick: () => void;
}

function ActivityRow({
  activity,
  hosts,
  index,
  isSelected = false,
  compact = false,
  onClick,
}: ActivityRowProps) {
  const progress = activity.video_progress || 0;
  const isDone = progress === 100;
  const inProgress = progress > 0 && progress < 100;

  const activityHosts = hosts.filter((h) =>
    h.activities_ids?.includes(activity._id)
  );
  const hostName = activityHosts[0]?.name ?? null;

  if (compact) {
    // Usado en la navbar lateral
    return (
      <UnstyledButton
        onClick={onClick}
        style={{ width: "100%", borderRadius: 6 }}
      >
        <Box
          px="xs"
          py={6}
          style={{
            borderRadius: 6,
            backgroundColor: isSelected ? "#e7f5ff" : "transparent",
            transition: "background 0.15s",
          }}
        >
          <Group gap="xs" wrap="nowrap">
            <ThemeIcon
              size={22}
              radius="xl"
              color={isDone ? "green" : inProgress ? "yellow" : "gray"}
              variant={isDone ? "filled" : "light"}
            >
              {isDone ? (
                <FaCircleCheck size={11} />
              ) : (
                <FaPlay size={9} />
              )}
            </ThemeIcon>
            <Text size="xs" lineClamp={2} style={{ flex: 1, lineHeight: 1.3 }}>
              {activity.name}
            </Text>
          </Group>
          {inProgress && (
            <Progress value={progress} size={3} color="yellow" mt={4} mx={28} />
          )}
        </Box>
      </UnstyledButton>
    );
  }

  // Versión normal para el contenido principal
  return (
    <Box
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 12px",
        borderRadius: 8,
        cursor: "pointer",
        border: `1px solid ${isSelected ? "#74c0fc" : "#e9ecef"}`,
        backgroundColor: isSelected ? "#e7f5ff" : "#fff",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {/* Número / ícono de estado */}
      <Box
        style={{
          width: 30,
          height: 30,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDone
            ? "#2f9e44"
            : inProgress
            ? "#f08c00"
            : "#e9ecef",
          color: isDone || inProgress ? "#fff" : "#868e96",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {isDone ? <FaCircleCheck size={13} /> : index + 1}
      </Box>

      <Box style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600} size="sm" lineClamp={2} style={{ lineHeight: 1.35 }}>
          {activity.name}
        </Text>
        {hostName && (
          <Text size="xs" c="dimmed" mt={2}>
            {hostName}
          </Text>
        )}
        {progress > 0 && (
          <Progress
            value={progress}
            size="xs"
            color={isDone ? "green" : "yellow"}
            mt={6}
          />
        )}
      </Box>

      <Badge
        size="xs"
        variant="light"
        color={isDone ? "green" : inProgress ? "yellow" : "gray"}
        style={{ flexShrink: 0, alignSelf: "center" }}
      >
        {isDone ? "Visto" : inProgress ? `${Math.round(progress)}%` : "Nuevo"}
      </Badge>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CourseDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [quiz, setQuiz] = useState<QuizData | null | undefined>(undefined);
  const [userAttemptsList, setUserAttemptsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [opened, { toggle, close }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 48em)");

  const [drawerChatOpen, setDrawerChatOpen] = useState(false);
  const [drawerForumOpen, setDrawerForumOpen] = useState(false);

  const { userId } = useUser();

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
          
          // Cargar hosts con manejo de errores
          try {
            const hostData = await fetchHostsByEventId(eventId);
            setHosts(hostData);
          } catch (error) {
            console.warn("No se pudieron cargar los hosts del evento:", error);
            setHosts([]); // Continuar sin hosts si falla
          }
          
          const quizData = await getQuizByEventId(eventId);
          setQuiz(quizData);
          if (quizData && userId) {
            const quizId = quizData._id || quizData.id;
            if (quizId) {
              try {
                const attempts = await getUserAttempts(quizId, userId);
                setUserAttemptsList(attempts);
              } catch {
                setUserAttemptsList([]);
              }
            }
          }
          const activityParam = searchParams.get("activity");
          if (activityParam) {
            const found = activitiesData.find((a) => a._id === activityParam);
            if (found) setSelectedActivity(found);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId, searchParams, userId]);

  useEffect(() => {
    if (!event || !userId) return;
    const enroll = async () => {
      try {
        const payload: CourseAttendeePayload = {
          user_id: userId,
          event_id: event._id.toString(),
        };
        await createOrUpdateCourseAttendee(payload);
      } catch (error) {
        console.error("Error inscribiendo al usuario en el curso:", error);
      }
    };
    enroll();
  }, [event, userId]);

  if (loading)
    return (
      <Flex justify="center" align="center" h="60vh">
        <Loader size="lg" />
      </Flex>
    );
  if (!event) return <Text>Curso no encontrado</Text>;

  const sortedActivities = [...activities].sort(
    (a, b) =>
      new Date(
        a.create_at || a.created_at || a.createdAt || 0
      ).getTime() -
      new Date(
        b.create_at || b.created_at || b.createdAt || 0
      ).getTime()
  );

  function getShareUrl(activity: Activity) {
    return `${window.location.origin}/organization/${organizationId}/course/${eventId}?activity=${activity._id}`;
  }

  const selectActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    if (activity._id) setSearchParams({ activity: activity._id });
    if (isMobile) close();
  };

  // ── Navbar: módulos con acordeón ──────────────────────────────────────────
  const renderNavbar = () => {
    const orderedModules = [...modules].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    return (
      <ScrollArea h="100%" type="auto">
        <Stack gap="xs" pb="md">
          {/* Módulos */}
          {modules.length > 0 && (
            <>
              <Group gap={6} px="xs" pt="xs">
                <IconBook size={14} color="#868e96" />
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Módulos
                </Text>
              </Group>
              <Accordion variant="filled" radius="md" chevronSize={14}>
                {orderedModules.map((module) => {
                  const modActivities = activities.filter(
                    (a) => a.module_id === module._id
                  );
                  const avgProgress =
                    modActivities.length > 0
                      ? modActivities.reduce(
                          (acc, a) => acc + (a.video_progress || 0),
                          0
                        ) / modActivities.length
                      : 0;
                  return (
                    <Accordion.Item value={module._id} key={module._id}>
                      <Accordion.Control py={6}>
                        <Group justify="space-between" gap="xs" wrap="nowrap">
                          <Text size="sm" lineClamp={1}>
                            {module.module_name}
                          </Text>
                          {avgProgress > 0 && (
                            <Badge
                              size="xs"
                              variant="light"
                              color={avgProgress === 100 ? "green" : "yellow"}
                            >
                              {Math.round(avgProgress)}%
                            </Badge>
                          )}
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel px={4}>
                        <Stack gap={2}>
                          {modActivities.map((act, i) => (
                            <ActivityRow
                              key={act._id}
                              activity={act}
                              hosts={hosts}
                              index={i}
                              isSelected={selectedActivity?._id === act._id}
                              compact
                              onClick={() => selectActivity(act)}
                            />
                          ))}
                          {modActivities.length === 0 && (
                            <Text size="xs" c="dimmed" px="xs">
                              Sin actividades
                            </Text>
                          )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            </>
          )}

          {/* Todas las actividades */}
          <Group gap={6} px="xs" pt={modules.length ? "xs" : "xs"}>
            <FaListUl size={12} color="#868e96" />
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Actividades
            </Text>
          </Group>
          <Stack gap={2} px={4}>
            {sortedActivities.map((act, i) => (
              <ActivityRow
                key={act._id}
                activity={act}
                hosts={hosts}
                index={i}
                isSelected={selectedActivity?._id === act._id}
                compact
                onClick={() => selectActivity(act)}
              />
            ))}
            {!sortedActivities.length && (
              <Text size="xs" c="dimmed" px="xs">
                No hay actividades
              </Text>
            )}
          </Stack>

          {/* Conferencistas */}
          {hosts.length > 0 && (
            <>
              <Group gap={6} px="xs" pt="xs">
                <FaUsers size={12} color="#868e96" />
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  Conferencistas
                </Text>
              </Group>
              <Stack gap={4} px={4}>
                {hosts.map((host) => (
                  <Group key={host._id} gap="xs" px="xs" py={4}>
                    <Avatar src={host.image} size={28} radius="xl" />
                    <Text size="xs" lineClamp={1}>
                      {host.name}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </>
          )}
        </Stack>
      </ScrollArea>
    );
  };

  // ── Main: módulos + actividades ───────────────────────────────────────────
  const renderModulesSection = () => {
    const orderedModules = [...modules].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );

    return (
      <Accordion variant="separated" multiple radius="md">
        {orderedModules.map((module) => {
          const modActivities = activities.filter(
            (a) => a.module_id === module._id
          );
          const avgProgress =
            modActivities.length > 0
              ? modActivities.reduce(
                  (acc, a) => acc + (a.video_progress || 0),
                  0
                ) / modActivities.length
              : 0;
          const color =
            avgProgress === 100
              ? "green"
              : avgProgress > 0
              ? "yellow"
              : "gray";

          return (
            <Accordion.Item value={module._id} key={module._id}>
              <Accordion.Control>
                <Group justify="space-between" gap="md" wrap="nowrap">
                  <Text fw={600} size="sm">
                    {module.module_name}
                  </Text>
                  <Group gap="xs" wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      {modActivities.length} actividades
                    </Text>
                    <Badge size="sm" variant="light" color={color}>
                      {avgProgress === 100
                        ? "Completado"
                        : avgProgress > 0
                        ? `${Math.round(avgProgress)}%`
                        : "Nuevo"}
                    </Badge>
                  </Group>
                </Group>
                <Progress
                  value={avgProgress}
                  size={3}
                  color={color}
                  mt={6}
                  radius="xl"
                />
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="xs">
                  {modActivities.length > 0 ? (
                    modActivities.map((act, i) => (
                      <ActivityRow
                        key={act._id}
                        activity={act}
                        hosts={hosts}
                        index={i}
                        isSelected={selectedActivity?._id === act._id}
                        onClick={() => selectActivity(act)}
                      />
                    ))
                  ) : (
                    <Text size="sm" c="dimmed">
                      Sin actividades en este módulo
                    </Text>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    );
  };

  const renderActivitiesSection = () => (
    <Stack gap="xs">
      {sortedActivities.map((act, i) => (
        <ActivityRow
          key={act._id}
          activity={act}
          hosts={hosts}
          index={i}
          isSelected={selectedActivity?._id === act._id}
          onClick={() => selectActivity(act)}
        />
      ))}
    </Stack>
  );

  // ── Main content ──────────────────────────────────────────────────────────
  const renderMainContent = () => {
    if (selectedActivity) {
      return (
        <ActivityDetail
          activity={selectedActivity}
          eventId={event._id}
          shareUrl={getShareUrl(selectedActivity)}
          activities={sortedActivities}
        />
      );
    }

    const qid = quiz?._id || quiz?.id;
    const attempted = userAttemptsList.some((a) => a.userId === userId);
    const completedCount = activities.filter(
      (a) => (a.video_progress || 0) === 100
    ).length;
    const overallProgress =
      activities.length > 0
        ? activities.reduce((acc, a) => acc + (a.video_progress || 0), 0) /
          activities.length
        : 0;

    const bannerSrc =
      event.styles?.banner_image ||
      event.picture ||
      event.styles?.event_image;

    return (
      <Stack gap="lg">
        {/* Banner del evento */}
        {bannerSrc && (
          <Box style={{ borderRadius: 12, overflow: "hidden" }}>
            <Image src={bannerSrc} fit="cover" mah={220} w="100%" />
          </Box>
        )}

        {/* Título + Quiz CTA */}
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Title order={3} lineClamp={2}>
              {event.name}
            </Title>
            <Group gap="md" mt={6}>
              <Text size="sm" c="dimmed">
                {modules.length > 0
                  ? `${modules.length} módulos · `
                  : ""}
                {activities.length} actividades
              </Text>
              {completedCount > 0 && (
                <Badge variant="light" color="green" size="sm">
                  {completedCount}/{activities.length} completadas
                </Badge>
              )}
            </Group>
          </Box>

          {quiz && qid && (
            attempted ? (
              <Button
                variant="light"
                color="teal"
                size="sm"
                onClick={() =>
                  navigate(
                    `/organization/${organizationId}/course/${eventId}/quiz/${qid}/result`
                  )
                }
              >
                Ver mis resultados
              </Button>
            ) : (
              <Button
                variant="filled"
                color="blue"
                size="sm"
                onClick={() =>
                  navigate(
                    `/organization/${organizationId}/course/${eventId}/quiz/${qid}`
                  )
                }
              >
                Realizar examen
              </Button>
            )
          )}
        </Group>

        {/* Barra de progreso general */}
        {overallProgress > 0 && (
          <Box>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">
                Progreso general
              </Text>
              <Text size="xs" fw={600}>
                {Math.round(overallProgress)}%
              </Text>
            </Group>
            <Progress value={overallProgress} size="sm" radius="xl" color="blue" />
          </Box>
        )}

        <Divider />

        {/* Módulos / Actividades */}
        <Box>
          <Text fw={700} size="md" mb="md">
            {modules.length > 0 ? "Módulos y actividades" : "Actividades"}
          </Text>
          {modules.length > 0
            ? renderModulesSection()
            : renderActivitiesSection()}
        </Box>

        {/* Conferencistas */}
        {hosts.length > 0 && (
          <>
            <Divider />
            <Box>
              <Text fw={700} size="md" mb="md">
                Conferencistas
              </Text>
              <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }} spacing="sm">
                {hosts.map((host) => (
                  <Stack key={host._id} align="center" gap={6}>
                    <Avatar
                      src={host.image}
                      alt={host.name}
                      size={isMobile ? 72 : 90}
                      radius="xl"
                    />
                    <Text
                      size="xs"
                      ta="center"
                      fw={500}
                      lineClamp={2}
                      style={{ lineHeight: 1.3 }}
                    >
                      {host.name}
                    </Text>
                    {host.profession && (
                      <Text size="xs" c="dimmed" ta="center" lineClamp={1}>
                        {host.profession}
                      </Text>
                    )}
                  </Stack>
                ))}
              </SimpleGrid>
            </Box>
          </>
        )}
      </Stack>
    );
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleBack = () => {
    if (searchParams.has("activity")) {
      setSearchParams({});
      setSelectedActivity(null);
    } else if (organizationId) {
      navigate(`/organization/${organizationId}`);
    }
  };

  const handleBackHome = () => navigate(`/organization/${organizationId}`);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell
      navbar={{
        width: { base: 280, sm: 300 },
        breakpoint: "sm",
        collapsed: { desktop: !opened, mobile: !opened },
      }}
      header={{ height: { base: 112, sm: 60 } }}
    >
      {/* HEADER */}
      <AppShell.Header
        style={{ borderBottom: "1px solid #e9ecef", backgroundColor: "#fff" }}
      >
        {isMobile ? (
          <Stack gap={0} style={{ height: "100%", padding: "8px 12px" }}>
            <Flex align="center" gap="xs">
              <Burger opened={opened} onClick={toggle} size="sm" />
              <img
                src={event.styles?.event_image}
                alt="Evento"
                onClick={handleBackHome}
                style={{
                  cursor: "pointer",
                  maxHeight: 44,
                  maxWidth: "100%",
                  objectFit: "contain",
                  flex: 1,
                }}
              />
            </Flex>
            <Flex align="center" gap="xs" pt={4}>
              <FaArrowLeft
                size={16}
                style={{ cursor: "pointer", flexShrink: 0, color: "#495057" }}
                onClick={handleBack}
              />
              <Title
                order={5}
                style={{
                  fontSize: "clamp(12px, 3vw, 15px)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#212529",
                }}
              >
                {event.name}
              </Title>
            </Flex>
          </Stack>
        ) : (
          <Flex
            align="center"
            gap="md"
            style={{ height: "100%", padding: "0 20px" }}
          >
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              onMouseEnter={() => !opened && toggle()}
            />
            <img
              src={event.styles?.event_image}
              alt="Evento"
              onClick={handleBackHome}
              style={{
                cursor: "pointer",
                maxHeight: 44,
                maxWidth: 130,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
            <Divider orientation="vertical" />
            <Flex align="center" gap="sm" style={{ flex: 1, minWidth: 0 }}>
              <FaArrowLeft
                size={16}
                style={{ cursor: "pointer", flexShrink: 0, color: "#495057" }}
                onClick={handleBack}
              />
              <Title
                order={5}
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "#212529",
                }}
              >
                {event.name}
              </Title>
            </Flex>
          </Flex>
        )}
      </AppShell.Header>

      {/* NAVBAR */}
      <AppShell.Navbar
        p="sm"
        style={{ borderRight: "1px solid #e9ecef" }}
        onMouseLeave={() => opened && close()}
      >
        {renderNavbar()}
      </AppShell.Navbar>

      {/* MAIN */}
      <AppShell.Main style={{ backgroundColor: "#f8f9fa" }}>
        <Container
          fluid
          px={{ base: "sm", sm: "md", md: "xl" }}
          py="md"
          maw={860}
        >
          {renderMainContent()}
        </Container>
      </AppShell.Main>

      <Drawer
        opened={drawerChatOpen}
        onClose={() => setDrawerChatOpen(false)}
        title="Chat del curso"
        padding="md"
        size="lg"
        position="right"
      >
        <Text>Componente o sección de chat en vivo...</Text>
      </Drawer>

      <Drawer
        opened={drawerForumOpen}
        onClose={() => setDrawerForumOpen(false)}
        title="Foro de discusión"
        padding="md"
        size="lg"
        position="right"
      >
        <Text>Sección de foro, Q&A o discusiones del curso...</Text>
      </Drawer>
    </AppShell>
  );
}
