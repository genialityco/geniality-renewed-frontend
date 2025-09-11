import { useParams } from "react-router-dom";
import { Card, Stack, Text, Title, Button, Group } from "@mantine/core";
import { useUser } from "../context/UserContext";
import { createPaymentRequest } from "../services/paymentRequestsService";
import {
  getIntegritySignature,
  buildCheckoutUrl,
} from "../services/wompiService";
import { v4 as uuidv4 } from "uuid";

const MembershipPayment = () => {
  const today = new Date();
  const dateUntil = new Date(today);
  dateUntil.setDate(today.getDate() + 365);

  const plan = {
    name: "Plan Premium",
    price: 50000, // COP
    description: "Acceso ilimitado a todos los cursos y actividades por 1 año.",
    date_until: dateUntil.toISOString(),
  };

  const { organizationId } = useParams();
  const { userId } = useUser();
  const PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY as string;

  const handlePayment = async () => {
    if (!PUBLIC_KEY) {
      alert("Falta VITE_WOMPI_PUBLIC_KEY en el frontend.");
      return;
    }
    if (!userId) {
      alert(
        "No se pudo obtener el usuario. Por favor inicia sesión nuevamente."
      );
      return;
    }

    const amountInCents = plan.price * 100;
    const reference = `membresia-${organizationId}-${userId}-${uuidv4()}`;
    const redirectUrl = `${window.location.origin}/organization/${organizationId}/pago-exitoso`;

    try {
      // 1) Crear intento
      await createPaymentRequest({
        reference,
        userId,
        organizationId: organizationId!,
        amount: plan.price,
      });

      // 2) Firma de integridad
      const signature = await getIntegritySignature({
        reference,
        amountInCents,
        currency: "COP",
      });

      // 3) Redirigir al checkout
      const wompiUrl = buildCheckoutUrl({
        publicKey: PUBLIC_KEY,
        reference,
        amountInCents,
        currency: "COP",
        integritySignature: signature,
        redirectUrl,
      });

      window.location.href = wompiUrl;
    } catch (e) {
      console.error("Error al iniciar el pago:", e);
      alert("No fue posible iniciar el pago. Intenta de nuevo.");
    }
  };

  return (
    <Stack align="center" p="md" pt="xl" px="md">
      <Title order={2}>Pagar Membresía</Title>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{ maxWidth: 500, width: "100%" }}
      >
        <Stack p="sm">
          <Text size="lg" fw={500}>
            {plan.name}
          </Text>
          <Text size="md" c="dimmed">
            {plan.description}
          </Text>

          <Group justify="space-around">
            <Text size="sm">Precio:</Text>
            <Text size="sm" fw={600}>
              {plan.price.toLocaleString("es-CO")} COP
            </Text>
          </Group>

          <Group justify="space-around">
            <Text size="sm">Vigencia hasta:</Text>
            <Text size="sm">
              {new Date(plan.date_until).toLocaleDateString()}
            </Text>
          </Group>

          <Button fullWidth mt="md" onClick={handlePayment}>
            Pagar Ahora
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
};

export default MembershipPayment;
