import { Modal, Text, Button } from "@mantine/core";

interface SubscriptionModalProps {
  opened: boolean;
  onClose: () => void;
  onStart: () => void;
  organizationId?: string;
}

export default function SubscriptionModal({
  opened,
  onClose,
  onStart,
}: SubscriptionModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Suscripción requerida"
      centered
      size="lg"
    >
      <Text mb="md">
        Para acceder al contenido seleccionado debes suscribirte a{" "}
        <strong>ENDOCAMPUS ACE</strong>. Esta suscripción tiene un costo de{" "}
        <strong>$50.000 COP</strong> o <strong>15 USD</strong>, y con ella
        tienes derecho a material académico desarrollado por la ACE (Congresos y
        simposios).
      </Text>
      <Text mb="xl">
        La suscripción tiene vigencia de <strong>1 año</strong> a partir de la
        fecha en que se realice el pago.
      </Text>
      <Button fullWidth onClick={onStart}>
        Comenzar
      </Button>
    </Modal>
  );
}
