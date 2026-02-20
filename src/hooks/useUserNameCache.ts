/**
 * Hook para gestionar nombres en caché de usuarios
 * Se utiliza en AdminQuizPanel y otros lugares donde se necesita obtener nombres
 */

import { useEffect, useState, useCallback } from 'react';
import { fetchUserById } from '../services/userService';
import { notifications } from '@mantine/notifications';

type UserNameMap = Record<string, string>;

export function useUserNameCache(userIds: string[]) {
  const [userNames, setUserNames] = useState<UserNameMap>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadUserNames = useCallback(async () => {
    if (!userIds || userIds.length === 0) return;

    // Filtrar IDs que faltan cargar
    const missing = userIds.filter((id) => !userNames[id]);
    if (missing.length === 0) return;

    setIsLoading(true);

    try {
      const results = await Promise.allSettled(
        missing.map(async (id) => {
          const user = await fetchUserById(id);
          const name =
            (user as any).names || (user as any).name || 'Sin nombre';
          return { id, name };
        })
      );

      const nextMap: UserNameMap = {};

      results.forEach((result, idx) => {
        const userId = missing[idx];
        if (result.status === 'fulfilled') {
          nextMap[userId] = result.value.name;
        } else {
          nextMap[userId] = 'Usuario no encontrado';
        }
      });

      setUserNames((prev) => ({ ...prev, ...nextMap }));
    } catch (error) {
      console.error('Error cargando nombres de usuarios:', error);
      notifications.show({
        message: 'Error cargando algunos nombres de usuarios',
        color: 'yellow',
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [userIds, userNames]);

  useEffect(() => {
    loadUserNames();
  }, [loadUserNames]);

  return { userNames, isLoading };
}
