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
import { UserActivity, CourseTime } from '../types';
import { IconBook } from '@tabler/icons-react';
import { fetchEventById } from '../../../services/eventService';

interface CourseActivityTimeProps {
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

export const CourseActivityTime = ({ userActivity, isLoading }: CourseActivityTimeProps) => {
  const [sortedCourses, setSortedCourses] = useState<CourseTime[]>([]);
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});

  // Cargar nombres de cursos que no tengan course_name
  useEffect(() => {
    const loadMissingCourseNames = async () => {
      if (!userActivity?.courses) return;

      const namesToFetch = userActivity.courses
        .filter((c: CourseTime) => !c.course_name) // Solo cargar si no tiene nombre
        .map((c: CourseTime) => c.event_id);

      if (namesToFetch.length === 0) return;

      const names: Record<string, string> = {};
      for (const eventId of namesToFetch) {
        try {
          const event = await fetchEventById(eventId);
          if (event?.name) {
            names[eventId] = event.name;
          }
        } catch (error) {
          console.error(`Error cargando nombre del evento ${eventId}:`, error);
        }
      }

      setCourseNames(names);
    };

    loadMissingCourseNames();
  }, [userActivity?.courses]);

  useEffect(() => {
    if (userActivity?.courses) {
      const sorted = [...userActivity.courses].sort(
        (a, b) => b.time_spent_ms - a.time_spent_ms,
      );
      setSortedCourses(sorted);
    }
  }, [userActivity?.courses]);

  if (isLoading) {
    return (
      <Stack p="md">
        <Skeleton height={50} />
        <Skeleton height={30} />
        <Skeleton height={30} />
      </Stack>
    );
  }

  if (!userActivity?.courses || userActivity.courses.length === 0) {
    return (
      <Stack p="md" align="center">
        <Badge color="gray" size="lg">
          Sin datos
        </Badge>
        <Text c="dimmed" size="sm">
          Aún no has dedicado tiempo a ningún curso
        </Text>
      </Stack>
    );
  }

  const totalCourseTime = userActivity.total_courses_time_ms;

  return (
    <Stack p="md" gap="lg">
      <div>
        <Text size="sm" c="dimmed" mb="xs">
          Tiempo total en cursos
        </Text>
        <Title order={3}>{formatTime(totalCourseTime)}</Title>
      </div>

      <div>
        <Text size="sm" c="dimmed" mb="md">
          Desglose por curso
        </Text>
        <Stack gap="md">
          {sortedCourses.map((course, idx) => {
            const percentage = totalCourseTime > 0 
              ? (course.time_spent_ms / totalCourseTime) * 100
              : 0;

            // Usar course_name del backend si está disponible, sino cargar del caché
            const displayName = course.course_name || courseNames[course.event_id] || `Curso ${course.event_id}`;

            return (
              <Paper key={`${course.course_id}-${idx}`} p="md" radius="md" withBorder>
                <Group justify="space-between" mb="xs">
                  <Group gap="xs">
                    <ThemeIcon color="blue" variant="light" radius="md">
                      <IconBook size={16} />
                    </ThemeIcon>
                    <div>
                      <Text fw={500} size="sm">
                        {displayName}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {course.event_id}
                      </Text>
                    </div>
                  </Group>
                  <Badge color="blue" variant="light">
                    {formatTime(course.time_spent_ms)}
                  </Badge>
                </Group>
                <Progress value={percentage} color="blue" size="sm" />
              </Paper>
            );
          })}
        </Stack>
      </div>
    </Stack>
  );
};
