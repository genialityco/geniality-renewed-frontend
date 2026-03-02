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
  compact?: boolean;
}

function ActivityCard({ activity, hosts, onClick, compact = false }: ActivityCardProps) {
  const isMobile = useMediaQuery("(max-width: 48em)");
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

  const avatarSize = compact ? 60 : isMobile ? 70 : 100;

  if (compact) {
    return (
      <Card
        shadow="xs"
        p="sm"
        radius="md"
        withBorder
        style={{ cursor: "pointer" }}
        onClick={onClick}
      >
        <Stack align="center" gap="xs">
          {/* Imagen centrada sin recorte */}
          {activityHosts.length > 0 ? (
            <Image
              src={activityHosts[0].image}
              alt={activityHosts[0].name}
              fit="contain"
              style={{
                width: avatarSize,
                height: avatarSize,
                borderRadius: "var(--mantine-radius-md)",
              }}
            />
          ) : (
            <Avatar size={avatarSize} radius="xl" />
          )}
          
          {/* Título centrado */}
          <Text fw={600} size="sm" ta="center" style={{ wordBreak: "break-word" }}>
            {activity.name}
          </Text>
          
          {/* Host centrado */}
          {activityHosts.length > 0 ? (
            <Text fw={500} size="xs" ta="center" c="dimmed">
              {activityHosts[0].name}
            </Text>
          ) : (
            <Text fw={500} size="xs" ta="center" c="dimmed">
              Sin conferencista
            </Text>
          )}
          
          {/* Progreso */}
          <Text size="xs" c={statusColor} fw={500}>
            {statusLabel} ({Math.round(progress)}%)
          </Text>
          <Progress value={progress} size="sm" color={statusColor} w="100%" />
        </Stack>
      </Card>
    );
  }

  return (
    <Card
      shadow="xs"
      p={isMobile ? "xs" : "md"}
      radius="md"
      withBorder
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      <Group align="flex-start" gap={isMobile ? "xs" : "md"} wrap="wrap">
        {/* Imagen del primer host - sin recorte */}
        {activityHosts.length > 0 ? (
          <Image
            src={activityHosts[0].image}
            alt={activityHosts[0].name}
            fit="contain"
            style={{
              width: avatarSize,
              height: avatarSize,
              flexShrink: 0,
              borderRadius: "var(--mantine-radius-md)",
            }}
          />
        ) : (
          <Avatar size={avatarSize} radius="xl" style={{ flexShrink: 0 }} />
        )}
        
        {/* Información de la actividad */}
        <Stack gap={isMobile ? 4 : 8} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" p={0} wrap="wrap">
            <FaBookOpen size={isMobile ? 16 : 18} style={{ flexShrink: 0 }} />
            <Text fw={600} size={isMobile ? "sm" : "md"} style={{ wordBreak: "break-word" }}>
              {activity.name}
            </Text>
          </Group>
          {activityHosts.length > 0 ? (
            <Text fw={500} size="xs" c="dimmed">
              {activityHosts[0].name}
            </Text>
          ) : (
            <Text fw={500} size="xs" c="dimmed">
              Sin conferencista
            </Text>
          )}
          <Text size="xs" c={statusColor} fw={500}>
            {statusLabel} ({Math.round(progress)}%)
          </Text>
        </Stack>
      </Group>
      <Progress value={progress} size="sm" color={statusColor} mt="md" />
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
  // Función para renderizar actividades en la navbar (formato compacto)
  const renderActivitiesForNavbar = () => {
    if (!activities.length) return <Text size="sm">No hay actividades</Text>;

    const handleActivitySelection = (activity: Activity) => {
      setSelectedActivity(activity);
      if (activity && activity._id) {
        setSearchParams({ activity: activity._id });
      }
    };

    const getCreatedDate = (activity: Activity) => {
      return (
        activity.create_at ||
        activity.created_at ||
        activity.createAt ||
        activity.createdAt ||
        null
      );
    };

    const sortedActivities = [...activities].sort((a, b) => {
      const dateA = new Date(getCreatedDate(a)).getTime();
      const dateB = new Date(getCreatedDate(b)).getTime();
      return dateA - dateB;
    });

    return (
      <Stack gap="sm">
        {sortedActivities.map((activity) => (
          <ActivityCard
            key={activity._id}
            activity={activity}
            hosts={hosts}
            onClick={() => handleActivitySelection(activity)}
            compact={true}
          />
        ))}
      </Stack>
    );
  };

  // Función para renderizar módulos en la navbar (formato compacto)
  const renderModulesForNavbar = () => {
    if (!modules.length) return <Text size="sm">No hay módulos</Text>;

    const orderedModules = [...modules].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    const handleActivitySelection = (activity: Activity) => {
      setSelectedActivity(activity);
      if (activity && activity._id) {
        setSearchParams({ activity: activity._id });
      }
    };

    return (
      <Accordion variant="filled">
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

          let moduloColor = "gray";

          if (progresoModulo > 0 && progresoModulo < 100) {
            moduloColor = "yellow";
          } else if (progresoModulo === 100) {
            moduloColor = "green";
          }

          return (
            <Accordion.Item value={module._id} key={module._id}>
              <Accordion.Control>
                <Group justify="space-between" gap="xs">
                  <Text size="sm">{module.module_name}</Text>
                  <Text size="xs" color={moduloColor}>
                    ({Math.round(progresoModulo)}%)
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
                  <Stack gap="sm">
                    {actividadesDelModulo.map((activity) => (
                      <ActivityCard
                        key={activity._id}
                        activity={activity}
                        hosts={hosts}
                        onClick={() => handleActivitySelection(activity)}
                        compact={true}
                      />
                    ))}
                  </Stack>
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

  // Función para renderizar actividades en la vista principal (formato normal)
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
          <Card shadow="sm" radius="md" p={isMobile ? "sm" : "md"} style={{ marginTop: "4rem" }}>
            <Text size={isMobile ? "sm" : "md"} fw={500}>
              Bienvenido(a) al curso {event.name}.
            </Text>
            <Text size="xs" c="dimmed">
              Selecciona una actividad para ver detalles
            </Text>
          </Card>

          <Card shadow="sm" radius="md" p={isMobile ? "sm" : "md"}>
            <Text size={isMobile ? "sm" : "md"} fw={600} mb="md">
              Módulos y actividades
            </Text>
            {modules.length ? renderModules() : renderActivities()}
          </Card>

          {/* Mostrar conferencistas debajo de módulos/actividades */}
          <Card shadow="sm" radius="md" p={isMobile ? "sm" : "md"}>
            <Text size={isMobile ? "sm" : "md"} fw={600} mb="md">
              Conferencistas
            </Text>
            {hosts.length === 0 ? (
              <Text size="xs" c="dimmed">
                No hay conferencistas asignados.
              </Text>
            ) : (
              <SimpleGrid
                cols={{ base: 2, xs: 3, sm: 4, md: 5 }}
                spacing={isMobile ? "xs" : "md"}
              >
                {hosts.map((host) => {
                  const hostImageSize = isMobile ? 90 : 120;
                  return (
                    <Card
                      key={host._id}
                      shadow="md"
                      radius="lg"
                      style={{ cursor: "pointer" }}
                      p={isMobile ? "xs" : "sm"}
                    >
                      <Stack align="center" gap={isMobile ? 6 : "xs"}>
                        <Image
                          src={host.image}
                          alt={host.name}
                          fit="contain"
                          style={{
                            width: hostImageSize,
                            height: hostImageSize,
                            borderRadius: "var(--mantine-radius-md)",
                          }}
                        />
                        <Text
                          size="xs"
                          ta="center"
                          style={{
                            wordBreak: "break-word",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {host.name}
                        </Text>
                      </Stack>
                    </Card>
                  );
                })}
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
        height: { base: 120, sm: 70 },
      }}
    >
      {/* HEADER */}
      <AppShell.Header>
        {isMobile ? (
          <Stack
            gap={0}
            style={{
              height: "100%",
              padding: "8px 12px",
              justifyContent: "flex-start",
            }}
          >
            {/* Fila 1: Burger y Logo */}
            <Flex align="center" gap="xs" style={{ height: "auto" }}>
              <Burger
                opened={opened}
                onClick={toggle}
                size="sm"
                color="black"
              />
              <img
                src={event.styles.event_image}
                alt="Evento"
                onClick={handleBackHome}
                style={{
                  cursor: "pointer",
                  maxHeight: 48,
                  maxWidth: "100%",
                  objectFit: "contain",
                  flex: 1,
                }}
              />
            </Flex>
            {/* Fila 2: Back y Título */}
            <Flex align="center" gap="xs" style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
              <FaArrowLeft
                size={18}
                style={{ cursor: "pointer", flexShrink: 0 }}
                onClick={handleBack}
              />
              <Title
                order={5}
                style={{
                  fontSize: "clamp(12px, 3vw, 16px)",
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
            justify="flex-start"
            gap="md"
            style={{
              height: "100%",
              padding: "0 16px",
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
                maxHeight: 50,
                maxWidth: 140,
                objectFit: "contain",
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
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                }}
              >
                {event.name}
              </Title>
            </Flex>
          </Flex>
        )}
      </AppShell.Header>

      {/* NAVBAR LATERAL */}
      <AppShell.Navbar p="md" onMouseLeave={() => opened && close()}>
        <Stack gap="md" h="100%" style={{ overflow: "hidden" }}>
          {/* Contenido scrolleable: Módulos y Actividades */}

          {/* Contenido scrolleable: Módulos y Actividades */}
          <ScrollArea style={{ flex: 1 }} type="auto">
            <Stack gap="md">
              <div>
                <Text size="xs" fw={700} mb="xs">
                  <FaBookOpen size={14} style={{ marginRight: 4 }} />
                  Módulos
                </Text>
                {renderModulesForNavbar()}
              </div>

              <Divider my="lg" />

              <div>
                <Text size="xs" fw={700} mb="xs">
                  <FaListUl size={14} style={{ marginRight: 4 }} />
                  Actividades
                </Text>
                {renderActivitiesForNavbar()}
              </div>

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
            </Stack>
          </ScrollArea>
        </Stack>
      </AppShell.Navbar>

      {/* MAIN */}
      <AppShell.Main pt={4}>
        <Container fluid px={{ base: "xs", xs: "sm", sm: "md", md: "lg" }} py={4}>
          {renderMainContent()}
        </Container>
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
