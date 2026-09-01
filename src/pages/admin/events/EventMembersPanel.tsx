// src/pages/admin/events/EventMembersPanel.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Group,
  Loader,
  Modal,
  Pagination,
  Progress,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
} from "@mantine/core";
import { FaMagnifyingGlass } from "react-icons/fa6";
import {
  fetchEventMembers,
  EventMember,
  EventMembersMetrics,
  EventMembersSortKey,
} from "../../../services/eventMetricsService";

interface Props {
  organizationId: string;
  eventId: string;
}

type SortKey = EventMembersSortKey;

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_META: Record<
  EventMember["status"],
  { label: string; color: string }
> = {
  completed: { label: "Completado", color: "teal" },
  in_progress: { label: "En progreso", color: "blue" },
  not_started: { label: "Sin empezar", color: "gray" },
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

const PLACEHOLDER_NAMES = new Set(["Usuario sin nombre", "Cuenta eliminada"]);

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0 min";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function ProgressCell({ value }: { value: number }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Progress value={value} size="sm" w={80} color={value >= 100 ? "teal" : "blue"} />
      <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
        {value}%
      </Text>
    </Group>
  );
}

export default function EventMembersPanel({ organizationId, eventId }: Props) {
  const [data, setData] = useState<EventMembersMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("enrolledAt");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<EventMember | null>(null);

  // Búsqueda con debounce: evita disparar un fetch al backend en cada tecla.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEventMembers(organizationId, eventId, {
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      sortKey,
      sortDir: sortAsc ? "asc" : "desc",
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        console.error("Error cargando avance por miembro:", err);
        if (!cancelled) setError("No se pudo cargar el avance por miembro.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organizationId, eventId, page, search, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
    setPage(1);
  }

  function sortArrow(key: SortKey): string {
    if (sortKey !== key) return "";
    return sortAsc ? " ▲" : " ▼";
  }

  if (loading) {
    return (
      <Group justify="center" py="lg">
        <Loader size="sm" />
      </Group>
    );
  }

  if (error || !data) {
    return (
      <Alert color="red" title="Error">
        {error ?? "No se pudo cargar el avance por miembro."}
      </Alert>
    );
  }

  if (data.total === 0 && !search) {
    return (
      <Text size="sm" c="dimmed">
        Aún no hay miembros inscritos en este curso.
      </Text>
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <Stack gap="sm">
      <TextInput
        placeholder="Buscar por nombre o email"
        leftSection={<FaMagnifyingGlass size={12} />}
        value={searchInput}
        onChange={(e) => setSearchInput(e.currentTarget.value)}
        maw={320}
      />

      <ScrollArea>
        <Table striped highlightOnHover verticalSpacing="sm" miw={560}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                onClick={() => toggleSort("name")}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Nombre{sortArrow("name")}
              </Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th
                onClick={() => toggleSort("courseProgress")}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Progreso{sortArrow("courseProgress")}
              </Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th
                onClick={() => toggleSort("enrolledAt")}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Inscrito{sortArrow("enrolledAt")}
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.members.map((member) => {
              const status = STATUS_META[member.status];
              return (
                <Table.Tr
                  key={member.userId}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedMember(member)}
                >
                  <Table.Td>
                    {PLACEHOLDER_NAMES.has(member.name) ? (
                      <Text size="sm" c="dimmed" fs="italic">
                        {member.name}
                      </Text>
                    ) : (
                      member.name
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" truncate maw={220}>
                      {member.email || "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <ProgressCell value={member.courseProgress} />
                  </Table.Td>
                  <Table.Td>
                    <Badge color={status.color} variant="light">
                      {status.label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{formatDate(member.enrolledAt)}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {data.members.length === 0 && (
        <Text size="sm" c="dimmed">
          Ningún miembro coincide con “{search}”.
        </Text>
      )}

      {totalPages > 1 && (
        <Group justify="center">
          <Pagination total={totalPages} value={page} onChange={setPage} size="sm" />
        </Group>
      )}

      <Modal
        opened={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        title={selectedMember ? `Avance de ${selectedMember.name}` : ""}
        size="lg"
      >
        {selectedMember && (
          <Stack gap="xs">
            <Text size="sm" c="dimmed">
              {selectedMember.email}
            </Text>
            {data.activities.length === 0 ? (
              <Text size="sm" c="dimmed">
                Este curso aún no tiene actividades.
              </Text>
            ) : (
              <ScrollArea.Autosize mah={420}>
                <Table striped verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Actividad</Table.Th>
                      <Table.Th>Progreso</Table.Th>
                      <Table.Th>Tiempo</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.activities.map((meta) => {
                      const entry = selectedMember.activities.find(
                        (a) => a.activityId === meta.activityId
                      );
                      return (
                        <Table.Tr key={meta.activityId}>
                          <Table.Td>
                            {meta.moduleName && (
                              <Text size="xs" c="dimmed">
                                {meta.moduleName}
                              </Text>
                            )}
                            <Text size="sm">{meta.name}</Text>
                          </Table.Td>
                          <Table.Td>
                            <ProgressCell value={entry?.progress ?? 0} />
                          </Table.Td>
                          <Table.Td>
                            {formatDuration(entry?.timeSpentMs ?? 0)}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
