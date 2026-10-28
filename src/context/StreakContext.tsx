import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { Button, Group, Modal, Stack } from "@mantine/core";
import { useUser } from "./UserContext";
import {
  ACTIVITY_COMPLETED_EVENT,
  fetchMyStreaks,
  markStreakSeen,
  MyStreak,
} from "../services/genonStreakService";
import StreakCelebration from "../components/streak/StreakCelebration";

/**
 * Quien muestra el logro en su propia pantalla (el modal de actividad
 * completada). Devuelve true si se encarga de mostrarlo.
 */
export type StreakCelebrationHost = (streak: MyStreak) => boolean;

interface StreakContextValue {
  /** Rachas del usuario en la organización, una por programa (mayor primero) */
  streaks: MyStreak[];
  /** La racha que suma con este curso, si tiene */
  forEvent: (eventId?: string | null) => MyStreak | null;
  refresh: () => Promise<void>;
  /** Cuándo se pidieron los datos de racha que hay en pantalla (ms) */
  syncedAt: number;
  registerHost: (host: StreakCelebrationHost) => () => void;
  /** El logro ya se mostró: no se repite */
  dismissCelebration: (streak: MyStreak) => void;
}

const StreakContext = createContext<StreakContextValue>({
  streaks: [],
  forEvent: () => null,
  refresh: async () => {},
  syncedAt: 0,
  registerHost: () => () => {},
  dismissCelebration: () => {},
});

export const useStreak = () => useContext(StreakContext);

/**
 * Racha académica del usuario en la organización: la carga, la vuelve a
 * pedir al terminar una actividad y celebra el logro apenas ocurre (el día
 * que ya cuenta o la medalla nueva). Lo muestra el modal de la actividad
 * terminada; si no hay ninguna abierta, este mismo contexto.
 */
export function StreakProvider({
  organizationId,
  children,
}: {
  organizationId?: string;
  children: ReactNode;
}) {
  const { userId } = useUser();
  const navigate = useNavigate();
  const [streaks, setStreaks] = useState<MyStreak[]>([]);
  const [syncedAt, setSyncedAt] = useState(0);
  // Logro mostrado por el contexto (sin pantalla de actividad que lo tome)
  const [fallback, setFallback] = useState<MyStreak | null>(null);
  const hosts = useRef(new Set<StreakCelebrationHost>());
  // Logro en pantalla y logros ya cerrados en esta pestaña
  const showing = useRef<string | null>(null);
  const done = useRef(new Set<string>());

  const announce = useCallback((list: MyStreak[]) => {
    if (showing.current) return;
    const s = list.find((x) => x.celebrate && !done.current.has(x.celebrate.key));
    if (!s?.celebrate) return;
    showing.current = s.celebrate.key;
    const taken = [...hosts.current].some((host) => host(s));
    if (!taken) setFallback(s);
  }, []);

  const refresh = useCallback(async () => {
    if (!userId || !organizationId) {
      setStreaks([]);
      return;
    }
    const startedAt = Date.now();
    try {
      const list = await fetchMyStreaks({ organizationId });
      setStreaks(list);
      setSyncedAt((t) => Math.max(t, startedAt));
      announce(list);
    } catch {
      // Sin racha disponible (p. ej. sin programa): no se muestra nada
      setStreaks([]);
    }
  }, [userId, organizationId, announce]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Al terminar una actividad, y al volver a la pestaña (p. ej. tras un reto por WhatsApp)
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

  // La racha es de la persona en el programa: suma en cualquiera de sus cursos
  const forEvent = useCallback(
    (eventId?: string | null) =>
      (eventId && streaks.find((s) => s.event_ids.includes(eventId))) || null,
    [streaks]
  );

  const registerHost = useCallback((host: StreakCelebrationHost) => {
    hosts.current.add(host);
    return () => {
      hosts.current.delete(host);
    };
  }, []);

  const dismissCelebration = useCallback((s: MyStreak) => {
    const key = s.celebrate?.key;
    if (key) {
      done.current.add(key);
      markStreakSeen(s.enrollment_id, key).catch(() => {});
      if (showing.current === key) showing.current = null;
    }
    setFallback(null);
  }, []);

  // Datos al día del logro en pantalla (la racha se vuelve a pedir)
  const shown = fallback ? forEvent(fallback.event_id) || fallback : null;

  return (
    <StreakContext.Provider
      value={{ streaks, forEvent, refresh, syncedAt, registerHost, dismissCelebration }}
    >
      {children}
      <Modal
        opened={!!fallback}
        onClose={() => fallback && dismissCelebration(fallback)}
        centered
        size="md"
        withCloseButton={false}
      >
        {fallback && shown && (
          <Stack gap="md">
            <StreakCelebration streak={shown} kind={fallback.celebrate?.kind} />
            <Group justify="center">
              <Button
                variant="default"
                onClick={() => {
                  dismissCelebration(fallback);
                  navigate(`/organization/${organizationId}/profile?tab=streak`);
                }}
              >
                Ver mi racha
              </Button>
              <Button color="orange" onClick={() => dismissCelebration(fallback)}>
                Seguir estudiando
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </StreakContext.Provider>
  );
}
