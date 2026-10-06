// src/components/AiEvaluationButton.tsx
import { useState } from "react";
import { Button, ButtonProps, Code, Modal, Stack, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FaWhatsapp } from "react-icons/fa6";
import {
  startAiEvaluation,
  StartAiEvaluationResponse,
} from "../services/aiEvaluationService";

const WHATSAPP_GREEN = "#25D366";

interface Props extends Omit<ButtonProps, "onClick" | "loading"> {
  eventId: string;
  /** Si se pasa, se evalúa ese módulo directamente; si no, el bot pregunta cuál. */
  moduleId?: string;
  label?: string;
}

/**
 * Botón "Evaluar tus conocimientos": crea la sesión en el backend y abre
 * WhatsApp con el código pre-llenado; la IA hace las preguntas por allá.
 */
export default function AiEvaluationButton({
  eventId,
  moduleId,
  label = "Evaluar tus conocimientos",
  ...buttonProps
}: Props) {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<StartAiEvaluationResponse | null>(null);

  const handleClick = async () => {
    // La pestaña se abre de forma síncrona: si se abre después del await, el
    // navegador la bloquea como popup.
    const tab = window.open("", "_blank");
    setLoading(true);
    try {
      const data = await startAiEvaluation(eventId, moduleId);
      setSession(data);
      if (tab) tab.location.href = data.whatsapp_url;
    } catch (error: any) {
      tab?.close();
      notifications.show({
        title: "No se pudo iniciar la evaluación",
        message:
          error?.response?.data?.message || "Intenta de nuevo en un momento.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        leftSection={<FaWhatsapp size={16} />}
        color={WHATSAPP_GREEN}
        {...buttonProps}
        loading={loading}
        onClick={handleClick}
      >
        {label}
      </Button>

      <Modal
        opened={!!session}
        onClose={() => setSession(null)}
        title="Evaluación por WhatsApp"
        centered
      >
        {session && (
          <Stack gap="sm">
            <Text size="sm">
              Envía el mensaje que aparece en WhatsApp <b>sin modificarlo</b>:
              incluye tu código <Code>{session.code}</Code>. La IA te hará
              preguntas sobre el contenido y al final recibirás tu evaluación.
            </Text>
            <Text size="xs" c="dimmed">
              El código vence en una hora si no lo envías.
            </Text>
            <Button
              component="a"
              href={session.whatsapp_url}
              target="_blank"
              rel="noopener noreferrer"
              color={WHATSAPP_GREEN}
              leftSection={<FaWhatsapp size={16} />}
            >
              Abrir WhatsApp
            </Button>
          </Stack>
        )}
      </Modal>
    </>
  );
}
