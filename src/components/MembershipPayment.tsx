import { useParams } from "react-router-dom";
import { Card, Stack, Text, Title, Button, Group } from "@mantine/core";
import { useUser } from "../context/UserContext";
import { createPaymentRequest } from "../services/paymentRequestsService"; 
import { v4 as uuidv4 } from "uuid";

const MembershipPayment = () => {
  const today = new Date();
  const dateUntil = new Date(today);
  dateUntil.setDate(today.getDate() + 365);

  const plan = {
    name: "Plan Premium",
    price: 50000, // en pesos colombianos
    description: "Acceso ilimitado a todos los cursos y actividades por 1 año.",
    date_until: dateUntil.toISOString(),
  };

  const { organizationId } = useParams();
  const { userId } = useUser(); // Ajusta según tu contexto

  const PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY;

  const handlePayment = async () => {
    const amountInCents = plan.price * 100;
    // Genera una referencia robusta única (preferible con uuid)
    const reference = `membresia-${organizationId}-${userId}-${uuidv4()}`;
    const redirectUrl = encodeURIComponent(
      `${window.location.origin}/organization/${organizationId}/pago-exitoso`
    );

    // **1. Crea el paymentRequest en el backend antes de ir a Wompi**
    try {
      if (!userId) {
        alert("No se pudo obtener el usuario. Por favor inicia sesión nuevamente.");
        return;
      }
      await createPaymentRequest({
        reference,
        userId,
        organizationId: organizationId!,
        amount: plan.price,
      });

      // **2. Construye la URL de checkout y redirige**
      const wompiUrl = `https://checkout.wompi.co/p/?public-key=${PUBLIC_KEY}&currency=COP&amount-in-cents=${amountInCents}&reference=${reference}&redirect-url=${redirectUrl}`;
      window.location.href = wompiUrl;
    } catch (e) {
      console.log("Error al iniciar el pago:", e);
      alert("No fue posible iniciar el pago. Intenta de nuevo.");
      // Manejo de error (opcional: muestra un notification bonito)
    }
  };

  return (
    <Stack align="center" p="md" pt="xl" px="md">
      <Title order={2}>Pagar Membresía</Title>
      <Card shadow="sm" padding="lg" radius="md" withBorder style={{ maxWidth: 500, width: "100%" }}>
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
