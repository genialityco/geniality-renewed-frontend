import { useCallback, useState } from "react";
import CompletionModal from "./CompletionModal";
import { useCompletionMessages } from "../hooks/useCompletionMessages";

interface ActivityCompletionHandlerProps {
  organizationId?: string;
  activityId?: string;
  children: (props: {
    onActivityCompleted: () => void;
    onCertificateReady: () => void;
  }) => React.ReactNode;
}

export default function ActivityCompletionHandler({
  organizationId,
  children,
}: ActivityCompletionHandlerProps) {
  const { messages } = useCompletionMessages(organizationId);
  const [completionModalOpened, setCompletionModalOpened] = useState(false);
  const [certificateModalOpened, setCertificateModalOpened] = useState(false);

  const handleActivityCompleted = useCallback(() => {
    setCompletionModalOpened(true);
  }, []);

  const handleCertificateReady = useCallback(() => {
    setCertificateModalOpened(true);
  }, []);

  return (
    <>
      {children({
        onActivityCompleted: handleActivityCompleted,
        onCertificateReady: handleCertificateReady,
      })}

      <CompletionModal
        opened={completionModalOpened}
        onClose={() => setCompletionModalOpened(false)}
        title={
          messages.activityCompleted || "¡Actividad completada!"
        }
        description={
          messages.activityCompletedDescription ||
          "Felicidades, has completado la actividad exitosamente."
        }
      />

      <CompletionModal
        opened={certificateModalOpened}
        onClose={() => setCertificateModalOpened(false)}
        title={
          messages.certificateReady || "¡Tu certificado está listo!"
        }
        description={
          messages.certificateReadyDescription ||
          "Descarga tu certificado de participación ahora."
        }
        showCertificateButton
      />
    </>
  );
}
