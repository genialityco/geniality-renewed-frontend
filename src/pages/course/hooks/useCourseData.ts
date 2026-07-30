import { useEffect, useState } from "react";
import { Event, Module, Activity, Host } from "../../../services/types";
import { Quiz as QuizData } from "../../../services/QuizService";
import { fetchEventById } from "../../../services/eventService";
import { getModulesByEventId } from "../../../services/moduleService";
import { getActivitiesByEvent } from "../../../services/activityService";
import { fetchHostsByEventId } from "../../../services/hostsService";
import { getQuizzesByEventId } from "../../../services/QuizService";
import { getUserAttempts, getBestScore } from "../../../services/userQuizAttemptService";
import {
  getGeneralQuiz,
  quizIdOf,
} from "../helpers/courseDetailHelpers";

interface UseCourseDataReturn {
  event: Event | null;
  modules: Module[];
  activities: Activity[];
  hosts: Host[];
  /** Examen general del curso (moduleId null), o null si no existe. */
  quiz: QuizData | null | undefined;
  /** Todos los exámenes del curso (general + por módulo). */
  quizzes: QuizData[];
  /** Mejor score del usuario por quizId (number) o false si no ha intentado. */
  bestScoreByQuiz: Record<string, number | false>;
  userAttemptsList: any[];
  loading: boolean;
}

export function useCourseData(
  eventId: string | undefined,
  userId: string | null | undefined
): UseCourseDataReturn {
  const [event, setEvent] = useState<Event | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [quiz, setQuiz] = useState<QuizData | null | undefined>(undefined);
  const [quizzes, setQuizzes] = useState<QuizData[]>([]);
  const [bestScoreByQuiz, setBestScoreByQuiz] = useState<
    Record<string, number | false>
  >({});
  const [userAttemptsList, setUserAttemptsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!eventId) return;

        const [eventData, modulesData, activitiesData, hostData, quizzesData] =
          await Promise.all([
            fetchEventById(eventId),
            getModulesByEventId(eventId),
            getActivitiesByEvent(eventId),
            fetchHostsByEventId(eventId),
            getQuizzesByEventId(eventId),
          ]);

        // Al alumno solo se le muestran los exámenes habilitados.
        const enabledQuizzes = quizzesData.filter((q) => q.enabled !== false);
        const generalQuiz = getGeneralQuiz(enabledQuizzes);

        setEvent(eventData);
        setModules(modulesData);
        setActivities(activitiesData);
        setHosts(hostData);
        setQuizzes(enabledQuizzes);
        setQuiz(generalQuiz);

        if (userId && enabledQuizzes.length > 0) {
          // Mejor score del usuario para cada examen (para saber cuáles aprobó).
          const scoreEntries = await Promise.all(
            enabledQuizzes.map(async (q) => {
              const id = quizIdOf(q);
              try {
                const score = await getBestScore(id, userId);
                return [id, score] as const;
              } catch {
                return [id, false as const] as const;
              }
            })
          );
          setBestScoreByQuiz(Object.fromEntries(scoreEntries));

          // Intentos del examen general (compat con la vista actual).
          if (generalQuiz) {
            const generalId = quizIdOf(generalQuiz);
            try {
              const attempts = await getUserAttempts(generalId, userId);
              setUserAttemptsList(attempts);
            } catch {
              setUserAttemptsList([]);
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
  }, [eventId, userId]);

  return {
    event,
    modules,
    activities,
    hosts,
    quiz,
    quizzes,
    bestScoreByQuiz,
    userAttemptsList,
    loading,
  };
}
