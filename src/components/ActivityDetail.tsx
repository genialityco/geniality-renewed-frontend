import { useEffect, useRef, useState } from "react";
import {
  Card,
  Title,
  Divider,
  Text,
  Progress,
  Group,
  Button,
  Notification,
  Flex,
} from "@mantine/core";
import Player from "@vimeo/player";
import { FaShare } from "react-icons/fa6";

import { fetchHostById } from "../services/hostsService";
import { updateVideoProgress } from "../services/activityService";
import {
  createOrUpdateActivityAttendee,
  ActivityAttendeePayload,
} from "../services/activityAttendeeService";
import {
  createOrUpdateCourseAttendee,
  CourseAttendeePayload,
} from "../services/courseAttendeeService";
import { fetchQuizByActivity } from "../services/quizService";
import { fetchQuizAttemptsByUserAndQuiz } from "../services/quizAttemptService";

import { useUser } from "../context/UserContext";
import { Activity, Host, Quiz, QuizAttempt } from "../services/types";

interface Fragment {
  startTime: number;
  text: string;
}

interface ActivityDetailProps {
  activity: Activity | null; // Actividad seleccionada
  eventId: string; // ID del evento (para enlaces, etc.)
  shareUrl: string; // URL para compartir
  onStartQuestionnaire: () => void; // Callback para abrir el quiz (Drawer)

  videoTime?: number | null;
  fragments?: Fragment[];
  formatTime?: (seconds: number) => string;
}

export default function ActivityDetail({
  activity,
  eventId,
  shareUrl,
  onStartQuestionnaire,
  videoTime = null,
  fragments = [],
  formatTime,
}: ActivityDetailProps) {
  const { userId } = useUser();

  // STATES
  const [videoProgress, setVideoProgress] = useState<number>(
    activity?.video_progress || 0
  );
  const [hosts, setHosts] = useState<Host[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [shareNotification, setShareNotification] = useState(false);

  const [player, setPlayer] = useState<Player | null>(null);
  const vimeoPlayerRef = useRef<HTMLIFrameElement | null>(null);

  // ==================================================
  // 1. Efecto: Cargar hosts y quiz info
  // ==================================================
  // A) Cargar hosts
  const loadHosts = async () => {
    if (!activity) return;

    if (!activity.host_ids?.length) {
      setHosts([]);
      return;
    }
    try {
      const data = await Promise.all(activity.host_ids.map(fetchHostById));
      setHosts(data);
    } catch (error) {
      console.error("Error al cargar conferencistas:", error);
    }
  };

  // B) Cargar quiz
  const loadQuizAndAttempts = async () => {
    if (!activity) return;

    if (!userId || !activity._id) return;
    try {
      const quizResult = await fetchQuizByActivity(activity._id);
      if (quizResult) {
        setQuiz(quizResult);
        // Cargar intentos
        const atts = await fetchQuizAttemptsByUserAndQuiz(
          quizResult._id,
          userId
        );
        setQuizAttempts(atts);
      } else {
        setQuiz(null);
        setQuizAttempts([]);
      }
    } catch (error) {
      console.log("No se pudo cargar el quiz o intentos:", error);
      setQuiz(null);
      setQuizAttempts([]);
    }
  };

  useEffect(() => {
    loadHosts();
    loadQuizAndAttempts();
  }, [activity, userId]);

  // ==================================================
  // 2. Efecto: Registrar/actualizar ActivityAttendee
  // ==================================================
  useEffect(() => {
    if (!activity || !userId) return;

    const enrollInActivity = async () => {
      try {
        // A) Registrar en la actividad
        const payloadActivity: ActivityAttendeePayload = {
          user_id: userId,
          activity_id: activity._id,
          progress: activity.video_progress || 0,
        };
        await createOrUpdateActivityAttendee(payloadActivity);

        // B) Registrar en el curso (si existe event_id)
        if (activity.event_id) {
          const payloadCourse: CourseAttendeePayload = {
            user_id: userId,
            event_id: activity.event_id.toString(),
          };
          await createOrUpdateCourseAttendee(payloadCourse);
        }
      } catch (err) {
        console.error(
          "Error inscribiendo al usuario en la actividad/curso:",
          err
        );
      }
    };

    enrollInActivity();
  }, [activity, userId]);

  // ==================================================
  // 3. Efecto: Instanciar Vimeo Player y manejar progreso
  // ==================================================
  useEffect(() => {
    if (!activity?.video || !vimeoPlayerRef.current) return;

    const newPlayer = new Player(vimeoPlayerRef.current);
    setPlayer(newPlayer);

    // Actualiza en Activity y en ActivityAttendee
    const updateProgressInActivity = async (progress: number) => {
      try {
        await updateVideoProgress(activity._id, Math.round(progress));
      } catch (error) {
        console.error("Error al actualizar el progreso en Activity:", error);
      }
    };

    let lastUpdateTime = Date.now();
    let lastProgressSent = activity.video_progress || 0;

    newPlayer.on("timeupdate", async (data) => {
      const currentTime = Date.now();
      const progress = (data.seconds / data.duration) * 100;
      setVideoProgress(progress);

      // Throttle cada 10s o cada 5% adicional
      const hasMinProgressChange = Math.abs(progress - lastProgressSent) >= 5;
      if (currentTime - lastUpdateTime >= 10000 || hasMinProgressChange) {
        await updateProgressInActivity(progress);
        lastUpdateTime = currentTime;
        lastProgressSent = progress;

        // También actualiza en ActivityAttendee
        if (userId) {
          try {
            await createOrUpdateActivityAttendee({
              user_id: userId,
              activity_id: activity._id,
              progress,
            });
          } catch (err) {
            console.error(
              "Error al actualizar progress en ActivityAttendee:",
              err
            );
          }
        }
      }
    });

    newPlayer.on("pause", async (data) => {
      const progress = (data.seconds / data.duration) * 100;
      await updateProgressInActivity(progress);

      if (userId) {
        try {
          await createOrUpdateActivityAttendee({
            user_id: userId,
            activity_id: activity._id,
            progress,
          });
        } catch (err) {
          console.error(
            "Error al actualizar progress en ActivityAttendee:",
            err
          );
        }
      }
    });

    newPlayer.on("ended", async () => {
      await updateProgressInActivity(100);
      if (userId) {
        try {
          await createOrUpdateActivityAttendee({
            user_id: userId,
            activity_id: activity._id,
            progress: 100,
          });
        } catch (err) {
          console.error(
            "Error al actualizar progress en ActivityAttendee:",
            err
          );
        }
      }
    });

    // Restaurar progreso previo
    newPlayer.getDuration().then((duration) => {
      if (activity.video_progress) {
        const savedTime = (activity.video_progress / 100) * duration;
        newPlayer.setCurrentTime(savedTime);
        setVideoProgress(activity.video_progress);
      }
    });

    return () => {
      newPlayer.off("timeupdate");
      newPlayer.off("pause");
      newPlayer.off("ended");
    };
  }, [activity, userId]);

  // ==================================================
  // 4. Efecto: Saltar a un tiempo específico si “videoTime” cambia
  // ==================================================
  useEffect(() => {
    if (player && videoTime !== null) {
      player.setCurrentTime(videoTime).catch((err) => {
        console.error("Error al saltar en el video:", err);
      });
    }
  }, [player, videoTime]);

  // ==================================================
  // HELPERS
  // ==================================================
  if (!activity) {
    return (
      <Card shadow="sm" p="md" radius="md">
        <Text size="md">No has seleccionado ninguna actividad.</Text>
      </Card>
    );
  }

  const handleShareActivity = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Actividad: ${activity.name}`,
          text: "Mira esta actividad",
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      setShareNotification(true);
      setTimeout(() => setShareNotification(false), 3000);
    } catch (error) {
      console.error("Error al compartir:", error);
    }
  };

  const handleFragmentClick = (startTime: number) => {
    if (!player) return;
    player
      .setCurrentTime(startTime)
      .then(() => {
        const container = document.getElementById("main-container");
        if (container) {
          container.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      })
      .catch((err) => console.error("Error al saltar al fragmento:", err));
  };

  return (
    <Card shadow="sm" p="md" radius="md">
      <Title order={3}>{activity.name}</Title>
      <Divider my="sm" />

      <Text fw={500}>Progreso del video:</Text>
      <Progress value={videoProgress} size="lg" striped />
      <Text size="sm">{Math.round(videoProgress)}% completado</Text>

      <Divider id="video-section" my="sm" />

      {/* Video iframe */}
      {activity.video ? (
        <iframe
          ref={vimeoPlayerRef}
          src={`${activity.video}?api=1&player_id=vimeo-player`}
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

      {/* BOTONES: CUESTIONARIO Y COMPARTIR */}
      <Group>
        <Text ta="left" size="md">
          ¡Descubre nuevas formas de aprender!
          <br />
          Puedes tomar un test sobre el video, ya sea antes o en cualquier
          momento, para potenciar hasta 5 veces tu absorción de conocimiento.
          <br />
          ¡Este test se genera dinámicamente mediante IA y se adapta a ti en
          tiempo real!
        </Text>
        <Group>
          <Button onClick={onStartQuestionnaire}>Iniciar Cuestionario</Button>
          <Button
            onClick={handleShareActivity}
            leftSection={<FaShare size={16} />}
          >
            Compartir actividad
          </Button>
        </Group>
      </Group>

      <Divider my="sm" />

      {/* Intentos de quiz */}
      {quiz ? (
        <>
          <Text fw={500} mt="sm">
            Intentos de cuestionario:
          </Text>
          {quizAttempts.length ? (
            <Card shadow="xs" p="sm" mt="sm">
              {quizAttempts.map((attempt, idx) => (
                <div key={attempt._id} style={{ marginBottom: "1rem" }}>
                  <Text size="sm">
                    Intento #{idx + 1} - Puntuación: {attempt.total_score} /{" "}
                    {attempt.max_score}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {new Date(attempt.createdAt as Date).toLocaleString()}
                  </Text>
                </div>
              ))}
            </Card>
          ) : (
            <Text size="sm" c="dimmed" mt="sm">
              Aún no tienes intentos.
            </Text>
          )}
          <Button variant="outline" mt="md" onClick={onStartQuestionnaire}>
            Intentar de nuevo
          </Button>
        </>
      ) : (
        <Text size="sm" c="dimmed" mt="md">
          Aún no se ha generado un cuestionario para esta actividad.
        </Text>
      )}

      {shareNotification && (
        <Notification color="green" mt="md">
          Enlace copiado al portapapeles
        </Notification>
      )}

      <Divider my="sm" />

      <Text fw={500}>Resumen:</Text>
      <Text size="sm">
        {activity.description || "Esta actividad no tiene descripción."}
      </Text>

      <Divider my="sm" />
      <Text fw={500}>Conferencistas:</Text>
      {!hosts.length ? (
        <Text size="sm" c="dimmed">
          No hay conferencistas asignados.
        </Text>
      ) : (
        <Group p="sm" mt="md">
          {hosts.map((host) => (
            <Card key={host._id} shadow="xs" p="sm" style={{ width: 150 }}>
              <img
                src={host.image}
                alt={host.name}
                style={{ width: "100%", height: 100, objectFit: "cover" }}
              />
              <Text size="sm" ta="center" mt="xs">
                {host.name}
              </Text>
            </Card>
          ))}
        </Group>
      )}

      {/* Fragmentos (opcional) */}
      {fragments.length > 0 && (
        <>
          <Divider my="sm" />
          <Text fw={500}>Fragmentos encontrados:</Text>
          <Flex direction="column" gap="xs" mt="md">
            {fragments.map((frag, i) => (
              <Button
                key={i}
                variant="light"
                color="blue"
                style={{ textAlign: "left" }}
                onClick={() => handleFragmentClick(frag.startTime)}
              >
                ⏳ {formatTime ? formatTime(frag.startTime) : frag.startTime} -{" "}
                {frag.text}
              </Button>
            ))}
          </Flex>
        </>
      )}
    </Card>
  );
}
