import {
  Stack,
  Group,
  Avatar,
  Text,
  Badge,
  Divider,
  UnstyledButton,
  Box,
} from "@mantine/core";
import { Host, Activity } from "../../../services/types";
import {
  getActivityProgress,
  getProgressColor,
} from "../helpers/courseDetailHelpers";

interface HostModalContentProps {
  host: Host;
  activities: Activity[];
  activityAttendees: any[];
  onActivitySelect: (activity: Activity) => void;
  onClose: () => void;
}

export function HostModalContent({
  host,
  activities,
  activityAttendees,
  onActivitySelect,
  onClose,
}: HostModalContentProps) {
  const hostActivities = activities.filter((a) =>
    host.activities_ids?.includes(a._id),
  );

  const handleActivityClick = (activity: Activity) => {
    onActivitySelect(activity);
    onClose();
  };

  return (
    <Stack gap="xl">
      <Group gap="lg" align="flex-start">
        <Avatar src={host.image} size={140} radius="xl" />
        <Stack gap="md" style={{ flex: 1 }}>
          <div>
            <Text fw={900} size="lg">
              {host.name}
            </Text>
            {host.profession && (
              <Badge size="xl" variant="light" color="blue" mt="md">
                {host.profession}
              </Badge>
            )}
          </div>
          {host.description && (
            <Text size="md" style={{ lineHeight: 1.8 }}>
              {host.description}
            </Text>
          )}
        </Stack>
      </Group>

      {hostActivities.length > 0 ? (
        <>
          <Divider />
          <div>
            <Text fw={800} size="md" mb="lg" tt="uppercase" c="dimmed">
              🎥 Actividades ({hostActivities.length})
            </Text>
            <Stack gap="md">
              {hostActivities.map((activity) => {
                const progress = getActivityProgress(
                  activityAttendees,
                  activity._id,
                );
                const isDone = progress === 100;
                const color = getProgressColor(progress);

                return (
                  <UnstyledButton
                    key={activity._id}
                    onClick={() => handleActivityClick(activity)}
                    style={{ width: "100%", borderRadius: 10 }}
                  >
                    <Box
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
                        <Badge
                          size="lg"
                          color={color}
                          variant="filled"
                          radius="md"
                          style={{ flexShrink: 0 }}
                        >
                          {isDone
                            ? "✓ Completada"
                            : progress > 0
                              ? `${Math.round(progress)}%`
                              : "Nuevo"}
                        </Badge>
                      </Group>
                    </Box>
                  </UnstyledButton>
                );
              })}
            </Stack>
          </div>
        </>
      ) : (
        <Text size="md" c="dimmed" ta="center" py="xl">
          Este conferencista no tiene actividades asignadas
        </Text>
      )}
    </Stack>
  );
}
