import { useState, useEffect } from 'react';
import { Tabs, Stack, Container, Title, Loader, Center, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { ActiveSession } from './sections/ActiveSession';
import { CourseActivityTime } from './sections/CourseActivityTime';
import { ActivityActivityTime } from './sections/ActivityActivityTime';
import { userActivityService } from '../../services/userActivityService';
import { UserActivity } from './types';

interface MyActivityProps {
  userId: string | null;
  firebaseUid: string | null;
  organizationId: string;
}

export const MyActivity = ({
  userId,
  firebaseUid,
  organizationId,
}: MyActivityProps) => {
  void firebaseUid;
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga la actividad actual del usuario
   */
  const loadActivityData = async () => {
    if (!userId || !organizationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await userActivityService.getActiveActivity(userId, organizationId);
      setUserActivity(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        // No hay sesión activa actualmente
        setUserActivity(null);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar datos de actividad';
      setError(errorMessage);
      console.error('Error cargando actividad:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Carga los datos al montar y recarga cada 30 segundos
   */
  useEffect(() => {
    if (!userId || !organizationId) return;

    loadActivityData();

    const interval = setInterval(loadActivityData, 30000);
    return () => clearInterval(interval);
  }, [userId, organizationId]);

  if (isLoading && !userActivity) {
    return (
      <Center p="md" style={{ minHeight: '300px' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Container p="md">
      <Stack gap="lg">
        <Title order={2}>Mi Actividad</Title>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Tabs defaultValue="session" variant="outline">
          <Tabs.List>
            <Tabs.Tab value="session">Sesión Activa</Tabs.Tab>
            <Tabs.Tab value="courses">Cursos</Tabs.Tab>
            <Tabs.Tab value="activities">Actividades</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="session">
            <ActiveSession userActivity={userActivity} isLoading={isLoading} />
          </Tabs.Panel>

          <Tabs.Panel value="courses">
            <CourseActivityTime userActivity={userActivity} isLoading={isLoading} />
          </Tabs.Panel>

          <Tabs.Panel value="activities">
            <ActivityActivityTime userActivity={userActivity} isLoading={isLoading} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};
