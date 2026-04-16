import { useEffect, useState } from "react";
import { fetchOrganizationById } from "../services/organizationService";

interface CompletionMessages {
  activityCompleted?: string;
  activityCompletedDescription?: string;
  certificateReady?: string;
  certificateReadyDescription?: string;
}

const DEFAULT_MESSAGES: CompletionMessages = {
  activityCompleted: "¡Actividad completada!",
  activityCompletedDescription:
    "Felicidades, has completado la actividad exitosamente.",
  certificateReady: "¡Tu certificado está listo!",
  certificateReadyDescription:
    "Descarga tu certificado de participación ahora.",
};

export function useCompletionMessages(organizationId?: string) {
  const [messages, setMessages] = useState<CompletionMessages>(
    DEFAULT_MESSAGES
  );
  const [loading, setLoading] = useState(!!organizationId);

  useEffect(() => {
    if (!organizationId) {
      setMessages(DEFAULT_MESSAGES);
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadMessages = async () => {
      try {
        const org = await fetchOrganizationById(organizationId);
        if (mounted) {
          setMessages({
            ...DEFAULT_MESSAGES,
            ...org.completion_messages,
          });
        }
      } catch (error) {
        console.error("Error loading completion messages:", error);
        if (mounted) {
          setMessages(DEFAULT_MESSAGES);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadMessages();
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  return { messages, loading };
}
