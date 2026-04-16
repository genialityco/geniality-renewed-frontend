import { useEffect, useState } from 'react';
import { Stack, Text, Title, Group, Badge, Skeleton } from '@mantine/core';
import { UserActivity } from '../types';

interface ActiveSessionProps {
  userActivity: UserActivity | null;
  isLoading: boolean;
}

/**
 * Formatea milisegundos a formato legible (HH:MM:SS)
 */
function formatTime(ms: number): string {
  // Si es un timestamp, convertir a duración desde ahora
  if (ms > 1000000000000) {
    const now = Date.now();
    ms = now - ms;
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Formatea una fecha al formato "HH:MM"
 */
function formatHourMinutes(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export const ActiveSession = ({ userActivity, isLoading }: ActiveSessionProps) => {
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  useEffect(() => {
    if (!userActivity?.session_start || !userActivity?.is_active) {
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const start = new Date(userActivity.session_start).getTime();
      
      // Tiempo de sesión actual
      const currentSessionTime = now - start;
      
      // Tiempo acumulado de todas las actividades anteriores
      const accumulatedTime = (userActivity.total_courses_time_ms || 0) + 
                             (userActivity.total_activities_time_ms || 0);
      
      // Tiempo total: acumulado + sesión actual
      setElapsedTime(accumulatedTime + currentSessionTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [userActivity?.session_start, userActivity?.is_active, userActivity?.total_courses_time_ms, userActivity?.total_activities_time_ms]);

  if (isLoading) {
    return (
      <Stack p="md">
        <Skeleton height={50} />
        <Skeleton height={30} />
        <Skeleton height={20} />
      </Stack>
    );
  }

  if (!userActivity || !userActivity.is_active) {
    return (
      <Stack p="md" align="center">
        <Badge color="gray" size="lg">
          Sin sesión activa
        </Badge>
        <Text c="dimmed" size="sm">
          Inicia una nueva sesión al acceder a la plataforma
        </Text>
      </Stack>
    );
  }

  const sessionStart = new Date(userActivity.session_start);

  return (
    <Stack p="md" gap="lg">
      <div>
        <Text size="sm" c="dimmed" mb="xs">
          Tiempo en la plataforma
        </Text>
        <Group justify="space-between" align="flex-end">
          <Title order={2} style={{ fontSize: '3rem', fontWeight: 'bold' }}>
            {formatTime(elapsedTime)}
          </Title>
          <Badge color="green" size="lg" variant="filled">
            En línea
          </Badge>
        </Group>
      </div>

      <Stack gap="xs" p="xs" style={{ backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Inicio de sesión:
          </Text>
          <Text size="sm" fw={500}>
            {formatHourMinutes(sessionStart)}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Fecha:
          </Text>
          <Text size="sm" fw={500}>
            {sessionStart.toLocaleDateString('es-ES')}
          </Text>
        </Group>
      </Stack>
    </Stack>
  );
};
