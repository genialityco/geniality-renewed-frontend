import { useState } from "react";
import {
  Stack,
  Box,
  Text,
  Image,
  Title,
  Button,
  Divider,
  Group,
  Badge,
  SimpleGrid,
  Avatar,
  Modal,
  Accordion,
  Progress,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import ActivityDetailWithTracker from "../../../components/ActivityDetailWithTracker";
import CourseProgressCard from "../../../components/CourseProgressCard";
import ActivityGrid from "../../../components/ActivityGrid";
import SearchBar, { SearchResult } from "../../organizationLanding/components/SearchBar";
import { Activity, Host, Event } from "../../../services/types";
import {
  getActivityProgress,
  getModuleAverageProgress,
  getProgressColor,
  sortActivitiesByDate,
  sortModulesByOrder,
} from "../helpers/courseDetailHelpers";

interface CourseMainContentProps {
  event: Event | null;
  activities: Activity[];
  hosts: Host[];
  activityAttendees: any[];
  courseProgress: number;
  selectedActivity: Activity | null;
  quiz: any;
  userAttempts: any[];
  modules: any[];
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  showSearchDropdown: boolean;
  onActivitySelect: (activity: Activity) => void;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => Promise<void>;
  onSearchClear: () => void;
  onShowDropdownChange: (show: boolean) => void;
  isMobile: boolean;
}

export function CourseMainContent({
  event,
  activities,
  hosts,
  activityAttendees,
  courseProgress,
  selectedActivity,
  quiz,
  userAttempts,
  modules,
  searchQuery,
  searchResults,
  searchLoading,
  showSearchDropdown,
  onActivitySelect,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  onShowDropdownChange,
  isMobile = false,
}: CourseMainContentProps) {
  const navigate = useNavigate();
  const { organizationId, eventId } = useParams();
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [hostModalOpened, setHostModalOpened] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);

  if (selectedActivity) {
    return (
      <ActivityDetailWithTracker
        activity={selectedActivity}
        eventId={event?._id || ""}
        shareUrl={`${window.location.origin}/organization/${organizationId}/course/${eventId}?activity=${selectedActivity._id}`}
        activities={activities}
        activityAttendees={activityAttendees}
        courseId={event?._id || ""}
        courseName={event?.name || ""}
        videoTime={videoStartTime}
      />
    );
  }

  const qid = quiz?._id || quiz?.id;
  const attempted = userAttempts.some((a) => a.userId);
  const completedCount = activities.filter(
    (activity) => getActivityProgress(activityAttendees, activity._id) >= 100
  ).length;
  const bannerSrc =
    event?.styles?.banner_image ||
    event?.picture ||
    event?.styles?.event_image;

  const orderedModules = sortModulesByOrder(modules);
  const moduleIds = new Set(orderedModules.map((module) => module._id));

  const orderedActivitiesForLearning =
    orderedModules.length > 0
      ? [
          ...orderedModules.flatMap((module) =>
            sortActivitiesByDate(
              activities.filter(
                (activity: Activity) => activity.module_id === module._id
              )
            )
          ),
          ...sortActivitiesByDate(
            activities.filter(
              (activity: Activity) =>
                !activity.module_id || !moduleIds.has(activity.module_id)
            )
          ),
        ]
      : sortActivitiesByDate(activities);

  const handleStartLearning = () => {
    if (!orderedActivitiesForLearning.length) return;

    const inProgressActivities = orderedActivitiesForLearning.filter(
      (activity) => {
        const progress = getActivityProgress(activityAttendees, activity._id);
        return progress > 0 && progress < 100;
      }
    );

    const lastInProgress = inProgressActivities.at(-1);

    const lastCompletedIndex = orderedActivitiesForLearning
      .map((activity) => getActivityProgress(activityAttendees, activity._id))
      .reduce(
        (lastIndex, progress, index) => (progress >= 100 ? index : lastIndex),
        -1
      );

    const nextAfterLastCompleted =
      lastCompletedIndex >= 0 &&
      lastCompletedIndex < orderedActivitiesForLearning.length - 1
        ? orderedActivitiesForLearning[lastCompletedIndex + 1]
        : null;

    const firstPending = orderedActivitiesForLearning.find((activity) => {
      const progress = getActivityProgress(activityAttendees, activity._id);
      return progress < 100;
    });

    onActivitySelect(
      nextAfterLastCompleted ||
        lastInProgress ||
        firstPending ||
        orderedActivitiesForLearning[0]
    );
  };

  return (
    <Stack gap="lg">
      {/* Banner */}
      {bannerSrc && (
        <Box style={{ borderRadius: 16, overflow: "hidden" }}>
          <Image src={bannerSrc} fit="cover" mah={280} w="100%" />
        </Box>
      )}

      {/* Título */}
      <Box>
        <Title order={2} size="h2" mb="xs">
          {event?.name}
        </Title>
        {event?.description && (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {event.description}
          </Text>
        )}
      </Box>

      {/* Progreso */}
      <CourseProgressCard
        courseProgress={courseProgress}
        completedActivities={completedCount}
        totalActivities={activities.length}
        courseName={event?.name || ""}
        onStartLearning={handleStartLearning}
      />

      {/* Quiz CTA */}
      {quiz && qid && (
        <Button
          fullWidth
          size="md"
          variant={attempted ? "light" : "filled"}
          color={attempted ? "teal" : "blue"}
          onClick={() =>
            navigate(
              attempted
                ? `/organization/${organizationId}/course/${eventId}/quiz/${qid}/result`
                : `/organization/${organizationId}/course/${eventId}/quiz/${qid}`
            )
          }
        >
          {attempted ? "Ver mis resultados del examen →" : "Realizar examen →"}
        </Button>
      )}

      {/* Búsqueda */}
      <SearchBar
        value={searchQuery}
        onChange={(e) => {
          onSearchChange(e.currentTarget.value);
          if (e.currentTarget.value.trim()) {
            onShowDropdownChange(true);
          } else {
            onShowDropdownChange(false);
            setVideoStartTime(null);
          }
        }}
        onSearch={() => {
          void onSearchSubmit();
        }}
        onClear={() => {
          onSearchClear();
          onShowDropdownChange(false);
          setVideoStartTime(null);
        }}
        results={searchResults}
        loading={searchLoading}
        onResultSelect={(result) => {
          if (result.type === "transcript" && result.startTime !== undefined) {
            setVideoStartTime(result.startTime);
          } else {
            setVideoStartTime(null);
          }
          onShowDropdownChange(false);
        }}
        showDropdown={showSearchDropdown}
        onShowDropdownChange={onShowDropdownChange}
      />

      {/* Módulos o Actividades */}
      {modules.length > 0 ? (
        <>
          <Group justify="space-between" align="center" mb="lg">
            <Text fw={800} size="xl">
              📖 Módulos
            </Text>
            <Badge size="lg" variant="light" color="blue" radius="md">
              {modules.length} módulos
            </Badge>
          </Group>
          <Accordion variant="separated" multiple radius="lg">
            {orderedModules.map((module) => {
              const modActivities = activities.filter(
                (a: Activity) => a.module_id === module._id
              );
              if (modActivities.length === 0) return null;

              const avgProgress = getModuleAverageProgress(
                modActivities,
                activityAttendees
              );
              const color = getProgressColor(avgProgress);

              return (
                <Accordion.Item value={module._id} key={module._id}>
                  <Accordion.Control>
                    <Group justify="space-between" gap="md" wrap="nowrap">
                      <Text fw={700} size="sm">
                        📖 {module.module_name}
                      </Text>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="xs" c="dimmed">
                          {modActivities.length} actividades
                        </Text>
                        <Badge size="sm" variant="light" color={color}>
                          {avgProgress === 100
                            ? "Completado"
                            : avgProgress > 0
                              ? `${Math.round(avgProgress)}%`
                              : "Nuevo"}
                        </Badge>
                      </Group>
                    </Group>
                    <Progress
                      value={avgProgress}
                      size={3}
                      color={color}
                      mt={6}
                      radius="xl"
                    />
                  </Accordion.Control>
                  <Accordion.Panel pt="md">
                    <ActivityGrid
                      activities={modActivities}
                      activityAttendees={activityAttendees}
                      selectedActivityId={undefined}
                      onActivitySelect={onActivitySelect}
                      hosts={hosts}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </>
      ) : (
        <>
          <Group justify="space-between" align="center" mb="lg">
            <Text fw={800} size="xl">
              ▶ Actividades
            </Text>
            <Badge size="lg" variant="light" color="blue" radius="md">
              {activities.length} actividades
            </Badge>
          </Group>
          <ActivityGrid
            activities={activities}
            activityAttendees={activityAttendees}
            selectedActivityId={undefined}
            onActivitySelect={onActivitySelect}
            hosts={hosts}
          />
        </>
      )}

      {/* Conferencistas */}
      {hosts.length > 0 && (
        <>
          <Divider my="xl" />
          <Box>
            <Group justify="space-between" align="center" mb="md">
              <Text fw={700} size="lg">
                🎤 Conferencistas
              </Text>
              <Text size="xs" c="dimmed">
                {hosts.length} conferencistas
              </Text>
            </Group>
            <SimpleGrid
              cols={{ base: 2, xs: 3, sm: 4, md: 5 }}
              spacing="md"
            >
              {hosts.map((host) => (
                <Box
                  key={host._id}
                  onClick={() => {
                    setSelectedHost(host);
                    setHostModalOpened(true);
                  }}
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: "#fff",
                    border: "1px solid #e9ecef",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 16px rgba(0, 0, 0, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 4px rgba(0, 0, 0, 0.1)";
                  }}
                >
                  <Stack align="center" gap={8}>
                    <Avatar
                      src={host.image}
                      alt={host.name}
                      size={isMobile ? 96 : 120}
                      radius="xl"
                      style={{
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        border: "3px solid #e7f5ff",
                      }}
                    />
                    <Text
                      size="sm"
                      ta="center"
                      fw={600}
                      lineClamp={2}
                      style={{ lineHeight: 1.3 }}
                    >
                      {host.name}
                    </Text>
                    {host.profession && (
                      <Text
                        size="xs"
                        c="blue"
                        ta="center"
                        lineClamp={1}
                        fw={500}
                      >
                        {host.profession}
                      </Text>
                    )}
                    <Badge size="sm" variant="light">
                      Ver perfil →
                    </Badge>
                  </Stack>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        </>
      )}

      {/* Host Modal */}
      <Modal
        opened={hostModalOpened}
        onClose={() => setHostModalOpened(false)}
        title="Perfil del Conferencista"
        size="lg"
        centered
        radius="lg"
      >
        {selectedHost && (
          <Stack gap="xl">
            <Group gap="lg" align="flex-start">
              <Avatar src={selectedHost.image} size={140} radius="xl" />
              <Stack gap="md" style={{ flex: 1 }}>
                <div>
                  <Text fw={900} size="lg">
                    {selectedHost.name}
                  </Text>
                  {selectedHost.profession && (
                    <Badge size="xl" variant="light" color="blue" mt="md">
                      {selectedHost.profession}
                    </Badge>
                  )}
                </div>
                {selectedHost.description && (
                  <Text size="md" style={{ lineHeight: 1.8 }}>
                    {selectedHost.description}
                  </Text>
                )}
              </Stack>
            </Group>
            {activities
              .filter((a) => selectedHost.activities_ids?.includes(a._id))
              .length > 0 && (
              <>
                <Divider />
                <div>
                  <Text fw={800} size="md" mb="lg" tt="uppercase" c="dimmed">
                    🎥 Actividades (
                    {
                      activities.filter((a) =>
                        selectedHost.activities_ids?.includes(a._id)
                      ).length
                    }
                    )
                  </Text>
                  <Stack gap="md">
                    {activities
                      .filter((a) =>
                        selectedHost.activities_ids?.includes(a._id)
                      )
                      .map((activity) => {
                        const progress =
                          activityAttendees.find(
                            (a: any) => a.activity_id === activity._id
                          )?.progress || 0;
                        const isDone = progress === 100;
                        const color = getProgressColor(progress);

                        return (
                          <Box
                            key={activity._id}
                            onClick={() => {
                              onActivitySelect(activity);
                              setHostModalOpened(false);
                            }}
                            p="lg"
                            style={{
                              borderRadius: 10,
                              backgroundColor: isDone ? "#f0fdf4" : "#fafbfc",
                              border: `2px solid ${isDone ? "#dcfce7" : "#e9ecef"}`,
                              transition: "all 0.2s ease",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#e7f5ff";
                              e.currentTarget.style.borderColor = "#74c0fc";
                              e.currentTarget.style.transform = "translateY(-3px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = isDone
                                ? "#f0fdf4"
                                : "#fafbfc";
                              e.currentTarget.style.borderColor = isDone
                                ? "#dcfce7"
                                : "#e9ecef";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            <Group justify="space-between" align="center">
                              <Text size="md" fw={700} lineClamp={2}>
                                {activity.name}
                              </Text>
                              <Badge color={color} size="md" variant="light">
                                {isDone
                                  ? "✓ Completada"
                                  : progress > 0
                                    ? `${Math.round(progress)}%`
                                    : "Nueva"}
                              </Badge>
                            </Group>
                            {progress > 0 && (
                              <Progress
                                value={progress}
                                size="sm"
                                color={color}
                                mt="sm"
                                radius="xl"
                              />
                            )}
                          </Box>
                        );
                      })}
                  </Stack>
                </div>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
