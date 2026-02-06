// src/pages/admin/components/AdminQuizPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { Tabs, Loader, Text, Table, Button, Group } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { fetchQuizByEventId } from "../../../services/quizService";
import SurveyComponent from "../../QuizTest";
import { Quiz } from "../../../services/types";

import { fetchUserById } from "../../../services/userService";

type Props = {
  eventId: string;
};

type UserNameMap = Record<string, string>; // userId -> name

export default function AdminQuizPanel({ eventId }: Props) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ cache nombres
  const [userNames, setUserNames] = useState<UserNameMap>({});
  const [loadingUsers, setLoadingUsers] = useState(false);

  const load = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const q = await fetchQuizByEventId(eventId);
      setQuiz(q);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setQuiz(null);
      } else {
        console.error(err);
        notifications.show({ message: "Error cargando examen", color: "red" });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ ids únicos de la lista
  const userIds = useMemo(() => {
    if (!quiz?.listUser?.length) return [];
    const ids = quiz.listUser
      .map((u: any) => u?.userId)
      .filter(Boolean) as string[];
    return Array.from(new Set(ids));
  }, [quiz]);

  // ✅ traer nombres de usuarios que aún no estén en cache
  useEffect(() => {
    const loadUserNames = async () => {
      if (!userIds.length) return;

      // filtrar los que faltan
      const missing = userIds.filter((id) => !userNames[id]);
      if (!missing.length) return;

      setLoadingUsers(true);

      try {
        const results = await Promise.allSettled(
          missing.map(async (id) => {
            const user = await fetchUserById(id);
            const name =
              (user as any).names || (user as any).name || "Sin nombre";
            return { id, name };
          }),
        );

        const nextMap: UserNameMap = {};
        results.forEach((r) => {
          if (r.status === "fulfilled") {
            nextMap[r.value.id] = r.value.name;
          } else {
            // si falla (404 o algo), lo marcamos igual para no reintentar infinito
            // (puedes revisar r.reason?.response?.status si quieres)
            const failedId = (r.reason?.config?.url || "").split("/users/")[1];
            if (failedId) nextMap[failedId] = "Usuario no encontrado";
          }
        });

        // fallback mejor: mapear por missing en orden si no pudimos sacar failedId
        missing.forEach((id) => {
          if (!nextMap[id] && !userNames[id]) {
            nextMap[id] = "Usuario no encontrado";
          }
        });

        setUserNames((prev) => ({ ...prev, ...nextMap }));
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUserNames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userIds]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return (
    <Tabs defaultValue="results">
      <Tabs.List>
        <Tabs.Tab value="results">Resultados</Tabs.Tab>
        <Tabs.Tab value="edit">Crear / Editar</Tabs.Tab>
      </Tabs.List>

      {/* 1) RESULTADOS */}
      <Tabs.Panel value="results" pt="md">
        <Group mb="sm" justify="space-between">
          <Text fw={600}>Personas que realizaron el examen</Text>

          <Group>
            <Button variant="light" onClick={load} loading={loading}>
              Recargar
            </Button>
          </Group>
        </Group>

        {loading ? (
          <Loader />
        ) : !quiz ? (
          <Text size="sm" c="dimmed">
            Aún no existe examen para este evento.
          </Text>
        ) : !quiz.listUser || quiz.listUser.length === 0 ? (
          <Text size="sm" c="dimmed">
            Nadie ha realizado el examen todavía.
          </Text>
        ) : (
          <>
            {loadingUsers && (
              <Text size="sm" c="dimmed" mb="sm">
                Cargando nombres de usuarios...
              </Text>
            )}

            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>Nombre</Table.Th>
                  <Table.Th>Nota</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {quiz.listUser.map((u: any, idx: number) => {
                  const id = u.userId;
                  const name = id ? userNames[id] || "Cargando..." : "N/A";

                  return (
                    <Table.Tr key={`${id}-${idx}`}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td>{name}</Table.Td>
                      <Table.Td>{u.result}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </>
        )}
      </Tabs.Panel>

      {/* 2) EDITAR / CREAR */}
      <Tabs.Panel value="edit" pt="md">
        <SurveyComponent eventId={eventId} />
      </Tabs.Panel>
    </Tabs>
  );
}
