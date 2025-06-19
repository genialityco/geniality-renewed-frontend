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
  Grid,
  Stack,
  useMantineTheme,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  FaBookOpen,
  FaListUl,
  FaUsers,
  FaUserCheck,
  FaArrowLeft,
} from "react-icons/fa6";

import { fetchEventById } from "../../services/eventService";
import { getModulesByEventId } from "../../services/moduleService";
import { getActivitiesByEvent } from "../../services/activityService";
import { Event, Module, Activity, Host } from "../../services/types";

import QuizDrawer from "../../components/QuizDrawer";
import ActivityDetail from "../../components/ActivityDetail";

// IMPORTACIONES PARA REGISTRO DE CURSO
import { useUser } from "../../context/UserContext";
import {
  createOrUpdateCourseAttendee,
  CourseAttendeePayload,
} from "../../services/courseAttendeeService";
import { fetchHostsByEventId } from "../../services/hostsService";

// Componente auxiliar para renderizar la tarjeta de actividad
interface ActivityCardProps {
  activity: Activity;
  hosts: Host[];
  onClick: () => void;
}

function ActivityCard({ activity, hosts, onClick }: ActivityCardProps) {
  const progress = activity.video_progress || 0;
  let statusLabel = "Sin ver";
  let statusColor = "gray";

  if (progress > 0 && progress < 100) {
    statusLabel = "Viendo";
    statusColor = "yellow";
  } else if (progress === 100) {
    statusLabel = "Visto completamente";
    statusColor = "green";
  }

  // Filtramos los hosts asignados a esta actividad
  const activityHosts = hosts.filter((host) =>
    host.activities_ids?.includes(activity._id)
  );

  return (
    <Card
      shadow="xs"
      p="md"
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Group align="center" p="md">
        {/* Mostrar avatar grande del primer host (si existe) */}
        {activityHosts.length > 0 ? (
          <Avatar
            src={activityHosts[0].image}
            alt={activityHosts[0].name}
            size={60}
            radius="xl"
          />
        ) : (
          <Avatar size={60} radius="xl" />
        )}
        <div style={{ flex: 1 }}>
          <Group p={8}>
            <FaBookOpen size={18} />
            <Text fw={600} size="md">
              {activity.name}
            </Text>
          </Group>
          {activityHosts.length > 0 ? (
            <Text fw={500} size="sm" mt={4}>
              {activityHosts[0].name}
            </Text>
          ) : (
            <Text fw={500} size="sm" mt={4}>
              Sin conferencista
            </Text>
          )}
        </div>
        <Group p="xs">
          <Text size="xs" c={statusColor}>
            {statusLabel} ({Math.round(progress)}%)
          </Text>
        </Group>
      </Group>
      <Progress value={progress} size="sm" color={statusColor} mt="xs" />
    </Card>
  );
}

export default function CourseDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const theme = useMantineTheme();
  const isSm = useMediaQuery(`(min-width: ${theme.breakpoints.sm})`);

  // Ajustes según ancho
  const titleMaxWidth = isSm ? 700 : 120;
  const titleFontSize = isSm ? theme.fontSizes.md : theme.fontSizes.sm;

  const [event, setEvent] = useState<Event | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  // Actividad seleccionada
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );

  // Control de apertura/colapso navbar
  const [opened, { toggle, close }] = useDisclosure(false);

  // Drawers de Chat y Foro
  const [drawerChatOpen, setDrawerChatOpen] = useState(false);
  const [drawerForumOpen, setDrawerForumOpen] = useState(false);

  // Drawer del Cuestionario
  const [drawerQuestionnaireOpen, setDrawerQuestionnaireOpen] = useState(false);

  // Obtener el userId desde el contexto
  const { userId } = useUser();

  // Cargar datos iniciales (Evento, Módulos, Actividades, Hosts)
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

          // Si viene una actividad en la URL (por compartir)
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

  // Efecto para registrar al usuario en el curso
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
        console.error("Error inscribiendo al usuario en el curso:", error);
      }
    };

    enrollInCourse();
  }, [event, userId]);

  if (loading) return <Loader />;
  if (!event) return <Text>Curso no encontrado</Text>;

  // Handler para iniciar el cuestionario (abrir el Drawer)
  const handleStartQuestionnaire = () => {
    setDrawerQuestionnaireOpen(true);
  };

  function getShareUrl(activity: Activity) {
    return `${window.location.origin}/course/${eventId}?activity=${activity._id}`;
  }

  // Función para renderizar las actividades en la barra lateral
  const renderActivities = () => {
    if (!activities.length) return <Text size="sm">No hay actividades</Text>;

    const handleActivitySelection = (activity: Activity) => {
      setSelectedActivity(activity);
      setSearchParams({ activity: activity._id });
    };

    // Ordenar actividades por created_at descendente (más recientes primero)
    const sortedActivities = [...activities].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
      <Grid>
        {sortedActivities.map((activity) => (
          <Grid.Col span={12} key={activity._id}>
            <ActivityCard
              activity={activity}
              hosts={hosts}
              onClick={() => handleActivitySelection(activity)}
            />
          </Grid.Col>
        ))}
      </Grid>
    );
  };

  // Función para renderizar módulos y sus actividades
  const renderModules = () => {
    if (!modules.length) return <Text size="sm">No hay módulos</Text>;

    const handleActivitySelection = (activity: Activity) => {
      setSelectedActivity(activity);
      setSearchParams({ activity: activity._id });
    };

    return (
      <Accordion variant="separated" multiple>
        {modules.map((module) => {
          const actividadesDelModulo = activities.filter(
            (activity) => activity.module_id === module._id
          );

          const totalActividades = actividadesDelModulo.length;
          const progresoModulo =
            totalActividades > 0
              ? actividadesDelModulo.reduce(
                  (acc, activity) => acc + (activity.video_progress || 0),
                  0
                ) / totalActividades
              : 0;

          let moduloStatus = "Sin progreso";
          let moduloColor = "gray";

          if (progresoModulo > 0 && progresoModulo < 100) {
            moduloStatus = "En progreso";
            moduloColor = "yellow";
          } else if (progresoModulo === 100) {
            moduloStatus = "Completado";
            moduloColor = "green";
          }

          return (
            <Accordion.Item value={module._id} key={module._id}>
              <Accordion.Control>
                <Group justify="space-between">
                  <Text>{module.module_name}</Text>
                  <Text size="xs" c={moduloColor}>
                    {moduloStatus} ({Math.round(progresoModulo)}%)
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Progress
                  value={progresoModulo}
                  size="sm"
                  color={moduloColor}
                  mt="xs"
                  mb="md"
                />
                {actividadesDelModulo.length > 0 ? (
                  actividadesDelModulo.map((activity) => (
                    <ActivityCard
                      key={activity._id}
                      activity={activity}
                      hosts={hosts}
                      onClick={() => handleActivitySelection(activity)}
                    />
                  ))
                ) : (
                  <Text size="sm" c="dimmed">
                    Sin actividades
                  </Text>
                )}
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    );
  };

  // Dentro de CourseDetail, después de renderModules y antes de renderMainContent

  // 1. Filtra los hosts que tienen al menos una activity_id que corresponde
  const renderAllHosts = () => {
    if (!hosts.length)
      return (
        <Text size="sm" c="dimmed">
          No hay conferencistas
        </Text>
      );

    // Build set of activity IDs
    const activityIds = new Set(activities.map((a) => a._id));
    // Keep only hosts que estén en alguna activity
    const activityHosts = hosts.filter((h) =>
      h.activities_ids?.some((id) => activityIds.has(id))
    );

    if (!activityHosts.length)
      return (
        <Text size="sm" c="dimmed">
          No hay conferencistas asignados
        </Text>
      );

    return (
      <div style={{ marginTop: 16 }}>
        <Text size="sm" fw={600} mb="xs">
          Conferencistas
        </Text>
        <Group p="md">
          {activityHosts.map((host) => (
            <Stack key={host._id} align="center" p={2}>
              <Avatar src={host.image} alt={host.name} size={40} radius="xl" />
              <Text size="xs" ta="center">
                {host.name}
              </Text>
            </Stack>
          ))}
        </Group>
      </div>
    );
  };

  // Render principal: si no hay actividad seleccionada, mostramos un mensaje
  const renderMainContent = () => {
    if (!selectedActivity) {
      return (
        <Card shadow="sm" radius="md" p="lg">
          <Stack p="sm">
            <Text size="md" fw={500}>
              Bienvenido(a) al curso {event.name}.
            </Text>

            <Text size="sm" c="dimmed">
              Selecciona una actividad para ver detalles
            </Text>

            <Text size="lg" fw={600}>
              Módulos y actividades
            </Text>

            {modules.length ? renderModules() : renderActivities()}

            {renderAllHosts()}
          </Stack>
        </Card>
      );
    }

    // Si hay actividad seleccionada, mostramos el detalle
    return (
      <div>
        <Image src={event.styles.banner_footer} fit="contain" />
        <ActivityDetail
          activity={selectedActivity}
          eventId={event._id}
          onStartQuestionnaire={handleStartQuestionnaire}
          shareUrl={selectedActivity ? getShareUrl(selectedActivity) : ""}
        />
      </div>
    );
  };

  // Función de retroceso condicional
  const handleBack = () => {
    const basePath = `/course/${eventId}`;
    if (location.pathname === basePath && !location.search) {
      navigate("/organizations/63f552d916065937427b3b02");
    } else if (location.pathname === basePath && searchParams.has("activity")) {
      navigate(`/course/${eventId}`);
      setSelectedActivity(null);
    } else {
      navigate(-1);
    }
  };

  return (
    <AppShell
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { desktop: !opened, mobile: !opened },
      }}
    >
      {/* HEADER */}
      <AppShell.Header>
        <Flex align="center" style={{ height: "100%" }}>
          <Group p="xs" align="center">
            {/* Burger */}
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              color={theme.colors.gray[7]}
            />

            {/* Icono de retroceso */}
            <FaArrowLeft
              size={20}
              style={{ cursor: "pointer" }}
              onClick={handleBack}
            />

            {/* Logo */}
            <img
              src={event.styles.event_image}
              alt="Evento"
              style={{ height: 40 }}
            />

            {/* Título siempre presente, truncado */}
            <Title
              order={4}
              style={{
                marginLeft: theme.spacing.sm,
                maxWidth: titleMaxWidth,
                fontSize: titleFontSize,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {event.name}
            </Title>
          </Group>
        </Flex>
      </AppShell.Header>

      {/* NAVBAR LATERAL */}
      <AppShell.Navbar p="md" onMouseLeave={() => opened && close()}>
        <ScrollArea style={{ height: "calc(100vh - 80px)" }} type="auto">
          <Text size="xs" fw={700} mb="xs">
            <FaBookOpen size={14} style={{ marginRight: 4 }} />
            Módulos
          </Text>
          {renderModules()}

          <Divider my="lg" />

          <Text size="xs" fw={700} mb="xs">
            <FaListUl size={14} style={{ marginRight: 4 }} />
            Actividades
          </Text>
          {renderActivities()}

          <Divider my="lg" />

          <UnstyledButton style={{ width: "100%" }}>
            <Group p="xs">
              <FaUsers size={18} />
              <Text size="sm">Conferencistas</Text>
            </Group>
          </UnstyledButton>

          <UnstyledButton mt="xs" style={{ width: "100%" }}>
            <Group p="xs">
              <FaUserCheck size={18} />
              <Text size="sm">Asistentes</Text>
            </Group>
          </UnstyledButton>
        </ScrollArea>
      </AppShell.Navbar>

      {/* MAIN */}
      <AppShell.Main>
        <Container fluid>{renderMainContent()}</Container>
      </AppShell.Main>

      {/* DRAWER - CHAT */}
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

      {/* DRAWER - FORO */}
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

      {/* DRAWER - CUESTIONARIO (Quiz) */}
      <QuizDrawer
        opened={drawerQuestionnaireOpen}
        onClose={() => setDrawerQuestionnaireOpen(false)}
        transcript={selectedActivity?.description || ""}
        activityId={selectedActivity?._id || ""}
      />
    </AppShell>
  );
}
