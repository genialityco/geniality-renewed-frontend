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
  Stack,
  Avatar,
} from "@mantine/core";
import Player from "@vimeo/player";
import { FaShare, FaArrowLeft } from "react-icons/fa6";
import ReactPlayer from "react-player";

import { fetchHostById } from "../services/hostsService";
// import { updateVideoProgress } from "../services/activityService";
import {
  createOrUpdateActivityAttendee,
  ActivityAttendeePayload,
} from "../services/activityAttendeeService";
import { fetchQuizByActivity } from "../services/quizService";
import { fetchQuizAttemptsByUserAndQuiz } from "../services/quizAttemptService";

import { useUser } from "../context/UserContext";
import { Activity, Host, Quiz, QuizAttempt } from "../services/types";
import { useSearchParams } from "react-router-dom";

interface Fragment {
  segmentId: number;
  endTime: any;
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
  // eventId,
  shareUrl,
  // onStartQuestionnaire,
  videoTime: _vt = null,
  fragments: _frags = [],
  formatTime,
}: ActivityDetailProps) {
  const { userId } = useUser();

  // ———– LECTURA DE t= DEL QUERY PARAM ———–
  const [searchParams] = useSearchParams();
  const tParam = parseFloat(searchParams.get("t") || "NaN");

  // Lee y decodifica fragments del query param
  let fragmentsFromUrl: Fragment[] = [];
  try {
    const rawFragments = searchParams.get("fragments");
    // Solo decodifica si el string contiene caracteres de escape (%)
    if (rawFragments) {
      let decoded: string;
      if (/%[0-9A-Fa-f]{2}/.test(rawFragments)) {
        decoded = decodeURIComponent(rawFragments);
        fragmentsFromUrl = JSON.parse(decoded);
      } else {
        // Ya viene como JSON, no decodificar
        fragmentsFromUrl = JSON.parse(rawFragments);
      }
    }
  } catch (e) {
    console.error("Error parsing fragments from URL:", e);
    fragmentsFromUrl = [];
  }

  // Ordena los fragmentos por startTime ascendente para mejor UX
  const [fragments, _setFragments] = useState<Fragment[]>(
    fragmentsFromUrl.length > 0
      ? [...fragmentsFromUrl].sort((a, b) => a.startTime - b.startTime)
      : _frags
  );

  const [videoTime, setVideoTime] = useState<number | null>(
    !isNaN(tParam) && tParam >= 0 ? tParam : null
  );

  // STATES
  const [videoProgress, setVideoProgress] = useState<number>(
    activity?.video_progress || 0
  );
  const [hosts, setHosts] = useState<Host[]>([]);
  const [_quiz, setQuiz] = useState<Quiz | null>(null);
  const [_quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [shareNotification, setShareNotification] = useState(false);

  const [player, setPlayer] = useState<Player | null>(null);
  const vimeoPlayerRef = useRef<HTMLIFrameElement | null>(null);
  const reactPlayerRef = useRef<ReactPlayer | null>(null);

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
      console.error("No se pudo cargar el quiz o intentos:", error);
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
        // if (activity.event_id) {
        //   const payloadCourse: CourseAttendeePayload = {
        //     user_id: userId,
        //     event_id: activity.event_id.toString(),
        //   };
        //   await createOrUpdateCourseAttendee(payloadCourse);
        // }
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
  // 3. Efecto: Instanciar Vimeo Player y manejar progreso + posicionar en videoTime
  // ==================================================
  useEffect(() => {
    if (!activity?.video || !vimeoPlayerRef.current) return;

    const newPlayer = new Player(vimeoPlayerRef.current);
    setPlayer(newPlayer);

    // Actualiza en Activity y en ActivityAttendee
    // const updateProgressInActivity = async (progress: number) => {
    //   try {
    //     await updateVideoProgress(activity._id, Math.round(progress));
    //   } catch (error) {
    //     console.error("Error al actualizar el progreso en Activity:", error);
    //   }
    // };

    newPlayer.on("timeupdate", async (data) => {
      const progress = (data.seconds / data.duration) * 100;
      setVideoProgress(progress);
    });

    // Al montar, salto a videoTime si viene en URL, sino a progreso guardado
    newPlayer.getDuration().then((duration) => {
      if (videoTime !== null) {
        newPlayer.setCurrentTime(videoTime);
        setVideoProgress((videoTime / duration) * 100);
      } else if (activity.video_progress) {
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
  }, [activity, userId, videoTime]);

  // ==================================================
  // 4. Efecto: Saltar a videoTime en ReactPlayer (para URLs no-Vimeo)
  // ==================================================
  useEffect(() => {
    if (reactPlayerRef.current && videoTime !== null) {
      reactPlayerRef.current.seekTo(videoTime, "seconds");
    }
  }, [videoTime]);

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
    setVideoTime(startTime);
    if (player) {
      player.setCurrentTime(startTime).catch(console.error);
    }
    // Scroll al video si no está visible
    setTimeout(() => {
      const videoSection = document.getElementById("video-section");
      if (videoSection) {
        videoSection.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // Helper para obtener el video_id de una URL de Vimeo
  function getVimeoEmbedUrl(url: string) {
    // Ejemplo de url: https://vimeo.com/1086547406/7d27eab87d?share=copy
    // Extrae el primer número largo después de vimeo.com/
    const match = url.match(/vimeo\.com\/(\d+)/);
    if (match) {
      return `https://player.vimeo.com/video/${match[1]}?api=1&player_id=vimeo-player`;
    }
    return url;
  }

  // Helper para formatear tiempo
  function formatTimeDefault(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const secsString = secs < 10 ? `0${secs}` : secs.toString();
    return `${mins}:${secsString}`;
  }


  return (
    <Card shadow="sm" radius="md">
      <Group justify="left">
        {/* Mostrar flecha solo si la URL es organizations/:orgId/activitydetail/:activityId */}
        {(() => {
          const match = window.location.pathname.match(
            /^\/organizations\/[^/]+\/activitydetail\/[^/]+/
          );
          if (match) {
            return (
              <FaArrowLeft
                size={22}
                style={{ cursor: "pointer", marginRight: 12 }}
                onClick={() => {
                  // Navega hacia atrás o a la lista de actividades de la organización
                  window.history.length > 1
                    ? window.history.back()
                    : window.location.assign(
                        `/organizations/${window.location.pathname.split("/")[2]}`
                      );
                }}
              />
            );
          }
          return null;
        })()}
        <Title order={3}>{activity.name}</Title>
      </Group>
      {typeof activity.event_id === "object" &&
        activity.event_id !== null &&
        "name" in activity.event_id && (
          <Text size="sm" variant="gradient">
            Evento:{" "}
            <span
              style={{
                color: "#228be6",
                textDecoration: "underline",
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                const eventId =
                  (activity.event_id as any)._id ||
                  (activity.event_id as any).id ||
                  "";
                // Extrae organizationId de la URL actual
                const orgMatch = window.location.pathname.match(/organizations\/([^/]+)/);
                const organizationId = orgMatch ? orgMatch[1] : undefined;
                if (eventId && organizationId) {
                  window.open(
                    `${window.location.origin}/organizations/${organizationId}/course/${eventId}`,
                    "_blank"
                  );
                } else if (eventId) {
                  window.open(
                    `${window.location.origin}/course/${eventId}`,
                    "_blank"
                  );
                }
              }}
            >
              {activity.event_id.name}
            </span>
          </Text>
        )}

      <Divider my="sm" />

      <Text fw={500}>Progreso del video:</Text>
      <Progress value={videoProgress} size="lg" striped />
      <Text size="sm">{Math.round(videoProgress)}% completado</Text>

      <Divider id="video-section" my="sm" />

      {/* Video iframe o ReactPlayer */}
      {activity.video ? (
        activity.video.includes("vimeo") ? (
          <iframe
            ref={vimeoPlayerRef}
            src={getVimeoEmbedUrl(activity.video)}
            style={{ width: "100%", aspectRatio: "16/9" }}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          />
        ) : (
          <ReactPlayer
            ref={(r) => {
              reactPlayerRef.current = r;
            }}
            url={activity.video}
            width="100%"
            style={{ aspectRatio: "16/9" }}
            controls
            onProgress={({ played }) => setVideoProgress(played * 100)}
            onReady={() => {
              if (videoTime !== null) {
                reactPlayerRef.current?.seekTo(videoTime, "seconds");
              }
            }}
          />
        )
      ) : (
        <Text size="sm" c="dimmed" mt="xs">
          No hay URL de video disponible.
        </Text>
      )}

      {/* Resto de tu componente igual (botones, quiz, conferencistas, fragmentos) */}
      <Divider my="sm" />
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
          {/* <Button onClick={onStartQuestionnaire}>Iniciar Cuestionario</Button> */}
          <Button
            onClick={handleShareActivity}
            leftSection={<FaShare size={16} />}
          >
            Compartir actividad
          </Button>
        </Group>
      </Group>

      <Divider my="sm" />

      {shareNotification && (
        <Notification color="green" mt="md">
          Enlace copiado al portapapeles
        </Notification>
      )}

      <Divider my="sm" />
      <Text fw={500}>Conferencistas:</Text>
      {!hosts.length ? (
        <Text size="sm" c="dimmed">
          No hay conferencistas asignados.
        </Text>
      ) : (
        <Group p="sm" mt="md">
          {hosts.map((host) => (
            <Card
              key={host._id}
              shadow="lg"
              radius="lg"
              style={{ width: 150, cursor: "pointer" }}
            >
              <Stack align="center">
                <Avatar src={host.image} alt={host.name} size={100} radius="md" />
                <Text size="sm" ta="center">
                  {host.name}
                </Text>
              </Stack>
            </Card>
          ))}
        </Group>
      )}

      {fragments && fragments.length > 0 && (
        <>
          <Divider my="sm" />
          <Text fw={500}>Fragmentos encontrados:</Text>
          <Flex direction="column" gap="xs" mt="md">
            {fragments.map((frag, i) => (
              <Button
                key={frag.segmentId || i}
                variant="light"
                color="blue"
                style={{ textAlign: "left", whiteSpace: "normal" }}
                onClick={() => handleFragmentClick(frag.startTime)}
              >
                ⏳ {(formatTime || formatTimeDefault)(frag.startTime)}
                {typeof frag.endTime === "number"
                  ? ` - ${(formatTime || formatTimeDefault)(frag.endTime)}`
                  : ""}
                <br />
                {frag.text}
              </Button>
            ))}
          </Flex>
        </>
      )}
    </Card>
  );
}
