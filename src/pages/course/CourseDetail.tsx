import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
import { Event, Module, Activity } from "../../services/types";

import QuizDrawer from "../../components/QuizDrawer";
import ActivityDetail from "../../components/ActivityDetail";

// IMPORTACIONES PARA REGISTRO DE CURSO
import { useUser } from "../../context/UserContext";
import {
  createOrUpdateCourseAttendee,
  CourseAttendeePayload,
} from "../../services/courseAttendeeService";

export default function CourseDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [event, setEvent] = useState<Event | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
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

  // Cargar datos iniciales (Evento, Módulos, Actividades)
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

  // NUEVO: Efecto para registrar al usuario en el curso
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

    // Ordenar actividades por `created_at` en orden descendente (más recientes primero)
    const sortedActivities = [...activities].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return (
      <Accordion variant="filled">
        {sortedActivities.map((activity) => {
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

          return (
            <Accordion.Item value={activity._id} key={activity._id}>
              <Accordion.Control
                onClick={() => handleActivitySelection(activity)}
              >
                <Group justify="space-between">
                  <Text>{activity.name}</Text>
                  <Text size="xs" c={statusColor}>
                    {statusLabel} ({Math.round(progress)}%)
                  </Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Progress value={progress} size="sm" color={statusColor} />
              </Accordion.Panel>
            </Accordion.Item>
          );
        })}
      </Accordion>
    );
  };

  // Función para renderizar módulos y sus actividades
  const renderModules = () => {
    if (!modules.length) return <Text size="sm">No hay módulos</Text>;

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
                  actividadesDelModulo.map((activity) => {
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

                    return (
                      <Card
                        key={activity._id}
                        shadow="xs"
                        mb="xs"
                        p="sm"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedActivity(activity)}
                      >
                        <Group justify="space-between">
                          <Text size="sm" fw={500}>
                            {activity.name}
                          </Text>
                          <Text size="xs" c={statusColor}>
                            {statusLabel} ({Math.round(progress)}%)
                          </Text>
                        </Group>
                        <Progress
                          value={progress}
                          size="sm"
                          color={statusColor}
                          mt="xs"
                        />
                      </Card>
                    );
                  })
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

  // Render principal: si no hay actividad seleccionada, mostramos un mensaje
  const renderMainContent = () => {
    if (!selectedActivity) {
      return (
        <Card shadow="sm" p="md" radius="md">
          <Text size="md" fw={500}>
            Bienvenido(a) al curso {event.name}.
          </Text>
          <Text size="sm" c="dimmed">
            Selecciona una actividad para ver detalles
          </Text>
          <Text size="lg" fw={600} mt="lg">
            Módulos y actividades
          </Text>
          {modules.length ? renderModules() : null}
          {!modules.length && activities.length ? renderActivities() : null}
        </Card>
      );
    }

    // Si hay actividad seleccionada, usamos nuestro nuevo componente
    return (
      <Container fluid>
        <Image src={event.styles.banner_footer} fit="fill" h={180} />
        <ActivityDetail
          activity={selectedActivity}
          eventId={event._id}
          onStartQuestionnaire={handleStartQuestionnaire}
          shareUrl={selectedActivity ? getShareUrl(selectedActivity) : ""}
        />
      </Container>
    );
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { desktop: !opened, mobile: !opened },
      }}
    >
      {/* HEADER */}
      <AppShell.Header>
        <Flex justify="center" align="center" style={{ height: "100%" }}>
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            color="black"
            onMouseEnter={() => opened || toggle()}
          />
          <Group style={{ height: "100%", width: "100%" }}>
            <Group>
              <img height={40} src={event.styles.event_image} />
            </Group>
            <Group>
              <FaArrowLeft
                size={24}
                style={{ cursor: "pointer" }}
                onClick={() => window.history.back()}
              />
              <Title order={4}>{event.name}</Title>
            </Group>

            {/* <Group>
              <Button
                variant="subtle"
                leftSection={<FaComments size={18} />}
                onClick={() => setDrawerChatOpen(true)}
              >
                Chat
              </Button>
              <Button
                variant="subtle"
                leftSection={<FaForumbee size={18} />}
                onClick={() => setDrawerForumOpen(true)}
              >
                Foro
              </Button>
            </Group> */}
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
      <AppShell.Main style={{ height: "100vh", overflow: "auto" }}>
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
