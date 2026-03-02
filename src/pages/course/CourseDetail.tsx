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
  Stack,
  SimpleGrid,
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
    host.activities_ids?.includes(activity._id),
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
      <Group align="center" p="md" gap="md" grow={false} wrap="wrap">
        {/* Mostrar avatar grande del primer host (si existe) */}
        {activityHosts.length > 0 ? (
          <Avatar
            src={activityHosts[0].image}
            alt={activityHosts[0].name}
            size={80}
            radius="md"
          />
        ) : (
          <Avatar size={60} radius="xl" />
        )}
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Group p={0} gap="xs">
            <FaBookOpen size={18} />
            <Text fw={600} size="sm" style={{ wordBreak: "break-word" }}>
              {activity.name}
            </Text>
          </Group>
          {activityHosts.length > 0 ? (
            <Text fw={500} size="xs" mt={4} c="dimmed">
              {activityHosts[0].name}
            </Text>
          ) : (
            <Text fw={500} size="xs" mt={4} c="dimmed">
              Sin conferencista
            </Text>
          )}
          <Text size="xs" c={statusColor}>
            {statusLabel} ({Math.round(progress)}%)
          </Text>
        </Stack>
      </Group>
      <Progress value={progress} size="sm" color={statusColor} mt="xs" />
    </Card>
  );
}

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

  // Actividad seleccionada
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  // Control de apertura/colapso navbar
  const [opened, { toggle, close }] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 48em)");

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
              (act) => act._id === activityParam,
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
    return `${window.location.origin}/organization/${organizationId}/course/${eventId}?activity=${activity._id}`;
  }

  // Función para renderizar las actividades en la barra lateral
  const renderActivities = () => {
    if (!activities.length) return <Text size="sm">No hay actividades</Text>;

    const handleActivitySelection = (activity: Activity) => {
      setSelectedActivity(activity);
      if (activity && activity._id) {
        setSearchParams({ activity: activity._id });
      }
    };

    // Obtiene la fecha válida del objeto actividad
    const getCreatedDate = (activity: Activity) => {
      // Intenta los distintos campos posibles
      return (
        activity.create_at ||
        activity.created_at ||
        activity.createAt ||
        activity.createdAt ||
        null
      );
    };

    // Ordena por la fecha encontrada (ascendente)
    const sortedActivities = [...activities].sort((a, b) => {
      const dateA = new Date(getCreatedDate(a)).getTime();
      const dateB = new Date(getCreatedDate(b)).getTime();
      return dateA - dateB;
    });

    return (
      <Accordion variant="filled">
        {sortedActivities.map((activity) => (
          <Accordion.Item value={activity._id} key={activity._id}>
            <Accordion.Control
              onClick={() => handleActivitySelection(activity)}
            >
              <ActivityCard
                activity={activity}
                hosts={hosts}
                onClick={() => handleActivitySelection(activity)}
              />
            </Accordion.Control>
          </Accordion.Item>
        ))}
      </Accordion>
    );
  };

  // Función para renderizar módulos y sus actividades
  const renderModules = () => {
    if (!modules.length) return <Text size="sm">No hay módulos</Text>;

    // Ordenar por el campo "order" ascendente (de menor a mayor)
    const orderedModules = [...modules].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    return (
      <Accordion variant="separated" multiple>
        {orderedModules.map((module) => {
          const actividadesDelModulo = activities.filter(
            (activity) => activity.module_id === module._id,
          );

          const totalActividades = actividadesDelModulo.length;
          const progresoModulo =
            totalActividades > 0
              ? actividadesDelModulo.reduce(
                  (acc, activity) => acc + (activity.video_progress || 0),
                  0,
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
                  <Text size="xs" color={moduloColor}>
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
                      onClick={() => setSelectedActivity(activity)}
                    />
                  ))
                ) : (
                  <Text size="sm" color="dimmed">
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

  // Render principal: si no hay actividad seleccionada, mostramos un mensaje
  const renderMainContent = () => {
    const sortedActivities = [...activities].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    if (!selectedActivity) {
      return (
        <Stack gap="md">
          <Card shadow="sm" radius="md" p="md">
            <Text size="md" fw={500}>
              Bienvenido(a) al curso {event.name}.
            </Text>
            <Text size="sm" c="dimmed">
              Selecciona una actividad para ver detalles
            </Text>
          </Card>

          <Card shadow="sm" radius="md" p="md">
            <Text size="md" fw={600} mb="md">
              Módulos y actividades
            </Text>
            {modules.length ? renderModules() : renderActivities()}
          </Card>

          {/* Mostrar conferencistas debajo de módulos/actividades */}
          <Card shadow="sm" radius="md" p="md">
            <Text size="md" fw={600} mb="md">
              Conferencistas
            </Text>
            {hosts.length === 0 ? (
              <Text size="sm" c="dimmed">
                No hay conferencistas asignados.
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 2, xs: 3, sm: 4, md: 5 }} spacing="md">
                {hosts.map((host) => (
                  <Card
                    key={host._id}
                    shadow="lg"
                    radius="lg"
                    style={{ cursor: "pointer", height: "100%" }}
                    p="sm"
                  >
                    <Stack align="center" gap="sm">
                      <Avatar
                        src={host.image}
                        alt={host.name}
                        size={60}
                        radius="md"
                      />
                      <Text
                        size="xs"
                        ta="center"
                        style={{ wordBreak: "break-word" }}
                      >
                        {host.name}
                      </Text>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </Card>
        </Stack>
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
          activities={sortedActivities}
        />
      </div>
    );
  };

  // Handler para navegación hacia atrás
  const handleBack = () => {
    if (searchParams.has("activity")) {
      // Si hay actividad seleccionada por query param, limpia el query param y selecciona null
      setSearchParams({});
      setSelectedActivity(null);
    } else if (organizationId && eventId) {
      // Si está en /organization/:organizationId/course/:eventId sin query, navega a la lista de organizaciones
      window.location.href = `${window.location.origin}/organization/${organizationId}`;
    } else {
      // Fallback: navega a la raíz de organizaciones
      window.location.href = `${window.location.origin}/organization`;
    }
  };

  const handleBackHome = () => {
    navigate(`/organization/${organizationId}`);
  };

  return (
    <AppShell
      navbar={{
        width: { base: 280, sm: 300 },
        breakpoint: "sm",
        collapsed: { desktop: !opened, mobile: !opened },
      }}
      header={{
        height: { base: 140, sm: 110 },
      }}
    >
      {/* HEADER */}
      <AppShell.Header>
        {isMobile ? (
          <Stack
            gap={0}
            style={{ height: "100%", padding: "8px 12px 16px 12px" }}
            justify="flex-start"
          >
            {/* Mobile: imagen encima del título */}
            <Flex align="center" gap="sm" style={{ height: "auto" }}>
              <Burger
                opened={opened}
                onClick={toggle}
                size="sm"
                color="black"
                onMouseEnter={() => (opened ? null : toggle())}
              />
              <img
                src={event.styles.event_image}
                alt="Evento"
                onClick={handleBackHome}
                style={{
                  cursor: "pointer",
                  width: "100%",
                  maxHeight: 56,
                  objectFit: "contain",
                }}
              />
            </Flex>

            <Flex
              align="center"
              gap="xs"
              style={{ flex: 1, minWidth: 0 }}
              wrap="wrap"
            >
              <FaArrowLeft
                size={20}
                style={{ cursor: "pointer", flexShrink: 0 }}
                onClick={handleBack}
              />
              <Title
                order={4}
                style={{
                  fontSize: "clamp(14px, 4vw, 20px)",
                  wordBreak: "break-word",
                  flex: 1,
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
            style={{
              height: "100%",
              padding: "0 16px 16px 16px",
              width: "100%",
            }}
          >
            <Burger
              opened={opened}
              onClick={toggle}
              size="sm"
              color="black"
              onMouseEnter={() => (opened ? null : toggle())}
            />
            <img
              src={event.styles.event_image}
              alt="Evento"
              onClick={handleBackHome}
              style={{
                cursor: "pointer",
                objectFit: "contain",
                maxHeight: 64,
                maxWidth: 140,
                width: "auto",
                flexShrink: 0,
              }}
            />

            <Flex align="center" gap="xs" style={{ flex: 1, minWidth: 0 }}>
              <FaArrowLeft
                size={20}
                style={{ cursor: "pointer", flexShrink: 0 }}
                onClick={handleBack}
              />
              <Title
                order={4}
                style={{
                  fontSize: "18px",
                  wordBreak: "break-word",
                  marginLeft: 8,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {event.name}
              </Title>
            </Flex>
          </Flex>
        )}
      </AppShell.Header>

      {/* NAVBAR LATERAL */}
      <AppShell.Navbar p="xs" onMouseLeave={() => opened && close()}>
        <ScrollArea style={{ height: "calc(100vh - 120px)" }} type="auto">
          <Stack gap="md" p="sm">
            <div>
              <Text size="xs" fw={700} mb="xs">
                <FaBookOpen size={14} style={{ marginRight: 4 }} />
                Módulos
              </Text>
              {renderModules()}
            </div>

            <Divider />

            <div>
              <Text size="xs" fw={700} mb="xs">
                <FaListUl size={14} style={{ marginRight: 4 }} />
                Actividades
              </Text>
              {renderActivities()}
            </div>

            <Divider />

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
          </Stack>
        </ScrollArea>
      </AppShell.Navbar>

      {/* MAIN */}
      <AppShell.Main>
        <Container fluid px={{ base: "xs", xs: "md", sm: "lg" }} py="md">
          {renderMainContent()}
        </Container>
      </AppShell.Main>

      {/* DRAWER - CHAT */}
      <Drawer
        opened={drawerChatOpen}
        onClose={() => setDrawerChatOpen(false)}
        title="Chat del curso"
        padding="md"
        size="md"
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
        size="md"
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
