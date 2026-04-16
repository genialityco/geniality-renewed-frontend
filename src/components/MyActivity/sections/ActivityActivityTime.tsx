import { useEffect, useState } from 'react';
import {
  Stack,
  Text,
  Title,
  Badge,
  Skeleton,
  Group,
  Progress,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import { UserActivity, ActivityTime } from '../types';
import { IconVideo } from '@tabler/icons-react';
import { getActivityById } from '../../../services/activityService';

interface ActivityActivityTimeProps {
  userActivity: UserActivity | null;
  isLoading: boolean;
}

/**
 * Formatea milisegundos a formato legible
 */
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${totalSeconds}s`;
  }
}

export const ActivityActivityTime = ({ userActivity, isLoading }: ActivityActivityTimeProps) => {
  const [sortedActivities, setSortedActivities] = useState<ActivityTime[]>([]);
  const [activityNames, setActivityNames] = useState<Record<string, string>>({});

  // Cargar nombres de actividades que no tengan activity_name
  useEffect(() => {
    const loadMissingActivityNames = async () => {
      if (!userActivity?.activities) return;

      const namesToFetch = userActivity.activities
        .filter((a: ActivityTime) => !a.activity_name)
        .map((a: ActivityTime) => a.activity_id);

      if (namesToFetch.length === 0) return;

      const names: Record<string, string> = {};
      for (const activityId of namesToFetch) {
        try {
          const activity = await getActivityById(activityId);
          if (activity?.name) {
            names[activityId] = activity.name;
          }
        } catch (error) {
          console.error(`Error cargando nombre de actividad ${activityId}:`, error);
        }
      }

      setActivityNames(names);
    };

    loadMissingActivityNames();
  }, [userActivity?.activities]);

  useEffect(() => {
    if (userActivity?.activities) {
      const sorted = [...(userActivity.activities as ActivityTime[])].sort(
        (a, b) => b.time_spent_ms - a.time_spent_ms,
      );
      setSortedActivities(sorted);
    }
  }, [userActivity?.activities]);

  if (isLoading) {
    return (
      <Stack p="md">
        <Skeleton height={50} />
        <Skeleton height={30} />
        <Skeleton height={30} />
      </Stack>
    );
  }

  if (!userActivity?.activities || userActivity.activities.length === 0) {
    return (
      <Stack p="md" align="center">
        <Badge color="gray" size="lg">
          Sin datos
        </Badge>
        <Text c="dimmed" size="sm">
          Aún no has dedicado tiempo a ninguna actividad
        </Text>
      </Stack>
    );
  }

  const totalActivityTime = userActivity.total_activities_time_ms;

  return (
    <Stack p="md" gap="lg">
      <div>
        <Text size="sm" c="dimmed" mb="xs">
          Tiempo total en actividades
        </Text>
        <Title order={3}>{formatTime(totalActivityTime)}</Title>
      </div>

      <div>
        <Text size="sm" c="dimmed" mb="md">
          Desglose por actividad
        </Text>
        <Stack gap="md">
          {sortedActivities.map((activity, idx) => {
            const percentage = totalActivityTime > 0 
              ? (activity.time_spent_ms / totalActivityTime) * 100
              : 0;

            return (
              <Paper key={`${activity.activity_id}-${idx}`} p="md" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ThemeIcon color="violet" variant="light" radius="md">
                      <IconVideo size={16} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500} size="sm">
                        {activity.activity_name || activityNames[activity.activity_id] || `Actividad ${activity.activity_id}`}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {activity.activity_id}
                      </Text>
                    </div>
                  </Group>
                  <Badge color="violet" variant="light">
                    {formatTime(activity.time_spent_ms)}
                  </Badge>
                </Group>
                <Progress value={percentage} color="violet" size="sm" />
              </Paper>
            );
          })}
        </Stack>
      </div>
    </Stack>
  );
};
