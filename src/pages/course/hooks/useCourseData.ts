import { useEffect, useState } from "react";
import { Event, Module, Activity, Host } from "../../../services/types";
import { Quiz as QuizData } from "../../../services/QuizService";
import { fetchEventById } from "../../../services/eventService";
import { getModulesByEventId } from "../../../services/moduleService";
import { getActivitiesByEvent } from "../../../services/activityService";
import { fetchHostsByEventId } from "../../../services/hostsService";
import { getQuizByEventId } from "../../../services/QuizService";
import { getUserAttempts } from "../../../services/userQuizAttemptService";

interface UseCourseDataReturn {
  event: Event | null;
  modules: Module[];
  activities: Activity[];
  hosts: Host[];
  quiz: QuizData | null | undefined;
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
  const [userAttemptsList, setUserAttemptsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!eventId) return;

        const [eventData, modulesData, activitiesData, hostData, quizData] =
          await Promise.all([
            fetchEventById(eventId),
            getModulesByEventId(eventId),
            getActivitiesByEvent(eventId),
            fetchHostsByEventId(eventId),
            getQuizByEventId(eventId),
          ]);

        setEvent(eventData);
        setModules(modulesData);
        setActivities(activitiesData);
        setHosts(hostData);
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
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, userId]);

  return { event, modules, activities, hosts, quiz, userAttemptsList, loading };
}
