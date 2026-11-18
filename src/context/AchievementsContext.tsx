import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Anchor, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconTrophy } from "@tabler/icons-react";
import { useUser } from "./UserContext";
import { ACTIVITY_COMPLETED_EVENT } from "../services/genonStreakService";
import {
  fetchMyAchievements,
  markAchievementsSeen,
  MyAchievements,
} from "../services/genonAchievementsService";
import { fireConfetti } from "../utils/confetti";

const TROPHY_COLORS = ["#E2B019", "#FFE38A", "#9C7400", "#F76707", "#FFD43B"];
// Más de estos logros a la vez (p. ej. al activarlos) salen en un solo aviso
const MAX_SEPARATE = 2;
const TOAST_MS = 8000;

interface AchievementsContextValue {
  /** Logros del usuario en la organización, uno por programa */
  programs: MyAchievements[];
  loaded: boolean;
  refresh: () => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextValue>({
  programs: [],
  loaded: false,
  refresh: async () => {},
});

export const useAchievements = () => useContext(AchievementsContext);

/**
 * Logros del usuario en la organización: los carga, los vuelve a pedir al
 * terminar una actividad y al volver a la pestaña, y avisa de los nuevos con
 * una felicitación privada flotante (no tapa el modal de la actividad).
 */
export function AchievementsProvider({
  organizationId,
  children,
}: {
  organizationId?: string;
  children: ReactNode;
}) {
  const { userId } = useUser();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<MyAchievements[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Avisos ya mostrados en esta pestaña (por si el "visto" aún no llegó)
  const shown = useRef(new Set<string>());

  const announce = useCallback(
    (list: MyAchievements[]) => {
      const goTo = () => navigate(`/organization/${organizationId}/profile?tab=achievements`);
      for (const p of list) {
        const fresh = p.celebrate.filter((c) => !shown.current.has(`${p.program_id}:${c.id}`));
        if (!fresh.length) continue;
        fresh.forEach((c) => shown.current.add(`${p.program_id}:${c.id}`));
        markAchievementsSeen(
          p.program_id,
          fresh.map((c) => c.id)
        ).catch(() => {});

        const link = (
          <Anchor
            size="sm"
            component="button"
            onClick={() => {
              notifications.clean();
              goTo();
            }}
          >
            Ver mis logros
          </Anchor>
        );
        if (fresh.length > MAX_SEPARATE) {
          notifications.show({
            title: `¡LOGROS! Conseguiste ${fresh.length}`,
            message: (
              <Stack gap={4}>
                <Text size="sm">{fresh.map((c) => c.title).join(" · ")}</Text>
                {link}
              </Stack>
            ),
            icon: <IconTrophy size={20} />,
            color: "yellow",
            autoClose: TOAST_MS,
          });
        } else {
          for (const c of fresh) {
            notifications.show({
              title: `¡LOGRO! ${c.title}`,
              message: (
                <Stack gap={4}>
                  <Text size="sm">{c.text}</Text>
                  {link}
                </Stack>
              ),
              icon: <IconTrophy size={20} />,
              color: "yellow",
              autoClose: TOAST_MS,
            });
          }
        }
        fireConfetti(TROPHY_COLORS, 70);
      }
    },
    [navigate, organizationId]
  );

  const refresh = useCallback(async () => {
    if (!userId || !organizationId) {
      setPrograms([]);
      return;
    }
    try {
      const list = await fetchMyAchievements(organizationId);
      setPrograms(list);
      announce(list);
    } catch {
      // Sin programa con logros: no se muestra nada
      setPrograms([]);
    } finally {
      setLoaded(true);
    }
  }, [userId, organizationId, announce]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onCompleted = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(ACTIVITY_COMPLETED_EVENT, onCompleted);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(ACTIVITY_COMPLETED_EVENT, onCompleted);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  return (
    <AchievementsContext.Provider value={{ programs, loaded, refresh }}>
      {children}
    </AchievementsContext.Provider>
  );
}
