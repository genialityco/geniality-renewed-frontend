import { useUser } from '../context/UserContext';
import { useActivityTracker } from '../hooks/activity/useActivityTracker';

/**
 * Componente que inicializa y gestiona el rastreo de actividad del usuario
 * Se monta cuando el usuario está autenticado
 */
export default function ActivityWatcher() {
  const { userId, firebaseUser, organizationUserData } = useUser();

  const organizationId = organizationUserData?.organization_id?._id || organizationUserData?.organization_id;

  // Inicializar el rastreador
  useActivityTracker({
    userId,
    firebaseUid: firebaseUser?.uid || null,
    organizationId: organizationId || '',
  });

  // No renderiza nada, solo gestiona el rastreador
  return null;
}
