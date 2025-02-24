import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
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
  Button,
  Divider,
  Burger,
  Flex,
  ScrollArea,
  Progress,
} from "@mantine/core";
import {
  FaComments,
  FaForumbee,
  FaBookOpen,
  FaListUl,
  FaUsers,
  FaUserCheck,
} from "react-icons/fa6";

import { fetchEventById } from "../../services/eventService";
import { fetchModulesByEventId } from "../../services/moduleService";
import {
  findByEventId,
  updateVideoProgress,
} from "../../services/activityService";
import { generateQuestionnaire } from "../../services/questionnaireService"; // <-- Importamos nuestro servicio
import { Event, Module, Activity } from "../../services/types";
import { useDisclosure } from "@mantine/hooks";
import Player from "@vimeo/player";

// IMPORTS DE SURVEY
import { Model } from "survey-core";
import { Survey } from "survey-react-ui";

var newSurveyJson = {}

export default function CourseDetail() {
  const { eventId } = useParams<{ eventId: string }>();

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

  // Progreso de video
  const [videoProgress, setVideoProgress] = useState<number>(0);
  const vimeoPlayerRef = useRef<HTMLIFrameElement | null>(null);

  // Drawer del Cuestionario
  const [drawerQuestionnaireOpen, setDrawerQuestionnaireOpen] = useState(false);

  // Estado para almacenar la definición del cuestionario (SurveyJS)
  const [surveyJson, setSurveyJson] = useState<any>(null);

  const [showResults, setShowResults] = useState(false);

  // Cargar datos iniciales (Evento, Módulos, Actividades)
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (eventId) {
          const eventData = await fetchEventById(eventId);
          setEvent(eventData);

          const modulesData = await fetchModulesByEventId(eventId);
          setModules(modulesData);

          const activitiesData = await findByEventId(eventId);
          setActivities(activitiesData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  // Manejar reproducción y progreso del video
  useEffect(() => {
    if (selectedActivity?.video && vimeoPlayerRef.current) {
      const player = new Player(vimeoPlayerRef.current);

      // Cargar el progreso anterior si existe
      player.getDuration().then((duration) => {
        if (selectedActivity.video_progress) {
          const savedTime = (selectedActivity.video_progress / 100) * duration;
          player.setCurrentTime(savedTime);
          setVideoProgress(selectedActivity.video_progress);
        }
      });

      // Actualizar en tiempo real
      player.on("timeupdate", async (data) => {
        const progress = (data.seconds / data.duration) * 100;
        setVideoProgress(progress);

        if (selectedActivity && progress > 0) {
          try {
            await updateVideoProgress(
              selectedActivity._id,
              Math.round(progress)
            );
          } catch (error) {
            console.error("Error al actualizar el progreso del video:", error);
          }
        }
      });

      return () => {
        player.off("timeupdate");
      };
    }
  }, [selectedActivity]);

  if (loading) return <Loader />;
  if (!event) return <Text>Curso no encontrado</Text>;

  // Handler para iniciar el cuestionario
  const handleStartQuestionnaire = async () => {
    if (!selectedActivity) return;

    try {
      // Tomamos la descripción de la actividad como "transcript"
      const transcript = selectedActivity.description || "Texto vacío";
      const response = await generateQuestionnaire(transcript);

      // Intentamos parsear la respuesta si viene en formato string
      let parsedQuestions;
      try {
        parsedQuestions = JSON.parse(response);
      } catch {
        parsedQuestions = response;
      }

      // SurveyJS: definimos la estructura del cuestionario
      // Usamos "correctAnswer" para que SurveyJS maneje la calificación
    newSurveyJson = {
        title: "Cuestionario generado",
        // Texto que se mostrará al finalizar (SurveyJS reemplaza
        // automáticamente variables como {correctedAnswers} y {questionCount})
        // completedHtml: `
        //   <h3>¡Has finalizado!</h3>
        //   <p>
        //     Has respondido correctamente a <b>{correctedAnswers}</b> 
        //     pregunta(s) de un total de <b>{questionCount}</b>.
        //   </p>
        //   <p>Puedes revisar las preguntas para ver las respuestas correctas.</p>
        // `,
        pages: [
          {
            name: "page1",
            questions: parsedQuestions.map((q: any, idx: number) => ({
              type: "radiogroup",
              name: `question${idx}`,
              title: q.pregunta,
              choices: q.opciones,
              // q.respuestacorrecta es un índice numérico;
              // le pasamos la cadena correspondiente en correctAnswer:
              correctAnswer: q.opciones[q.respuestacorrecta],
            })),
          },
        ],
      };

      setSurveyJson(newSurveyJson);
      setDrawerQuestionnaireOpen(true);
    } catch (error) {
      console.error("Error generando cuestionario:", error);
    }
  };

  // Render de actividades en la barra lateral
  const renderActivities = () => {
    if (!activities.length) return <Text size="sm">No hay actividades</Text>;

    return (
      <Accordion variant="filled">
        {activities.map((activity) => {
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
            <Accordion.Item value={activity._id.toString()} key={activity._id}>
              <Accordion.Control onClick={() => setSelectedActivity(activity)}>
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

  // Render de módulos y sus actividades
  const renderModules = () => {
    if (!modules.length) return <Text size="sm">No hay módulos</Text>;

    return (
      <Accordion variant="separated" multiple>
        {modules.map((module) => {
          // Actividades de este módulo
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

  // Render principal (detalle de la actividad)
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
        </Card>
      );
    }

    return (
      <Card shadow="sm" p="md" radius="md">
        <Title order={3}>{selectedActivity.name}</Title>

        <Divider my="sm" />
        <Text fw={500}>Progreso del video:</Text>
        <Progress value={videoProgress} size="lg" striped />
        <Text size="sm">{Math.round(videoProgress)}% completado</Text>

        <Divider my="sm" />

        {selectedActivity.video ? (
          <iframe
            ref={vimeoPlayerRef}
            src={`${selectedActivity.video}?api=1&player_id=vimeo-player`}
            width="100%"
            height="315"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <Text size="sm" c="dimmed" mt="xs">
            No hay URL de video disponible.
          </Text>
        )}

        <Divider my="sm" />

        {/* BOTÓN PARA INICIAR EL CUESTIONARIO */}
        <Button onClick={handleStartQuestionnaire}>Iniciar Cuestionario</Button>

        <Divider my="sm" />

        <Text fw={500}>Descripción:</Text>
        <Text size="sm">
          {selectedActivity.description ||
            "Esta actividad no tiene descripción."}
        </Text>

        <Divider my="sm" />

        <Text fw={500}>Conferencistas (host_ids):</Text>
        {selectedActivity.host_ids && selectedActivity.host_ids.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
            {selectedActivity.host_ids.map((hostId) => (
              <li key={hostId}>{hostId}</li>
            ))}
          </ul>
        ) : (
          <Text size="sm" c="dimmed">
            No hay conferencistas asignados.
          </Text>
        )}
      </Card>
    );
  };

  return (
    <AppShell
      header={{ height: 40 }}
      navbar={{
        width: 300,
        breakpoint: "sm",
        collapsed: { desktop: !opened, mobile: !opened },
      }}
    >
      {/* HEADER */}
      <AppShell.Header>
        <Flex align="center">
          <Burger
            opened={opened}
            onClick={toggle}
            size="sm"
            color="black"
            onMouseEnter={() => opened || toggle()}
          />
          <Group justify="space-between" style={{ height: "100%" }}>
            <Title order={2} style={{ cursor: "pointer" }}>
              {event.name}
            </Title>

            {/* Botones para abrir Chat y Foro como Drawers */}
            <Group>
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
            </Group>
          </Group>
        </Flex>
      </AppShell.Header>
      {/* NAVBAR (BARRA LATERAL) */}
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

          {/* Conferencistas */}
          <UnstyledButton style={{ width: "100%" }}>
            <Group p="xs">
              <FaUsers size={18} />
              <Text size="sm">Conferencistas</Text>
            </Group>
          </UnstyledButton>

          {/* Asistentes */}
          <UnstyledButton mt="xs" style={{ width: "100%" }}>
            <Group p="xs">
              <FaUserCheck size={18} />
              <Text size="sm">Asistentes</Text>
            </Group>
          </UnstyledButton>
        </ScrollArea>
      </AppShell.Navbar>
      {/* MAIN (ZONA CENTRAL) */}
      <AppShell.Main style={{ height: "100vh", overflow: "auto" }}>
        <Container fluid>{renderMainContent()}</Container>
      </AppShell.Main>
      {/* DRAWER PARA CHAT */}
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
      {/* DRAWER PARA FORO */}
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
      <Drawer
        opened={drawerQuestionnaireOpen}
        onClose={() => setDrawerQuestionnaireOpen(false)}
        title="Cuestionario"
        padding="md"
        size="xl"
        position="right"
      >
        {!surveyJson ? (
          <Text size="sm">
            Cargando cuestionario o sin preguntas generadas.
          </Text>
        ) : (
          (() => {
            const surveyModel = new Model(surveyJson);

            // Al completar el cuestionario
            surveyModel.onComplete.add((sender) => {
              // 1) Modo lectura (ya no se puede cambiar respuestas)
              
              sender.mode = "display";
              surveyModel.mode = "display";
              surveyModel.showCorrectAnswers = "on";
              surveyModel.questionsOnPageMode = "singlePage";
              surveyModel.showProgressBar = "off";
              // 2) Para cada pregunta, verificamos si es correcta o no
              sender.getAllQuestions().forEach((question: any) => {
                // "isAnswerCorrect" existe si definimos "correctAnswer" en la pregunta
                const isCorrect = question.isAnswerCorrect
                  ? question.isAnswerCorrect()
                  : false;

                // 3) Añadimos un sufijo al title de cada pregunta
                if (isCorrect) {
                  question.title = question.title + " ✅ (Correcta)";
                } else {
                  question.title =
                    question.title +
                    ` ❌ (Correcta: ${question.correctAnswer})`;
                }
              });

              //setSurveyJson(newSurveyJson);
            });

            return <Survey model={surveyModel} />;
          })()
        )}
      </Drawer>
    </AppShell>
  );
}
