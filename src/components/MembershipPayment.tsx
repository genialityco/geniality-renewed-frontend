import { useParams } from "react-router-dom";
import { Card, Stack, Text, Title, Button, Group } from "@mantine/core";

const MembershipPayment = () => {
  // Calcular la fecha de vigencia: hoy + 365 días
  const today = new Date();
  const dateUntil = new Date(today);
  dateUntil.setDate(today.getDate() + 365);

  // Datos simulados para el plan
  const plan = {
    name: "Plan Premium",
    price: 50000, // en pesos colombianos
    description: "Acceso ilimitado a todos los cursos y actividades por 1 año.",
    date_until: dateUntil.toISOString(),
  };

  // Obtener la organización desde la URL
  const { organizationId } = useParams();

  // Obtener la public key de Wompi desde las variables de entorno
  const PUBLIC_KEY = import.meta.env.VITE_WOMPI_PUBLIC_KEY;

  const handlePayment = () => {
    // Calcular el valor en centavos
    const amountInCents = plan.price * 100;
    // Generar una referencia única para el pago
    const reference = `membresia-${organizationId}-${Date.now()}`;
    // Redireccionar al usuario a esta URL después del pago
    const redirectUrl = encodeURIComponent(
      `${window.location.origin}/organizations/${organizationId}/pago-exitoso`
    );

    // Construir la URL de Wompi Checkout Web
    const wompiUrl = `https://checkout.wompi.co/p/?public-key=${PUBLIC_KEY}&currency=COP&amount-in-cents=${amountInCents}&reference=${reference}&redirect-url=${redirectUrl}`;

    // Redirigir al usuario al checkout de Wompi
    window.location.href = wompiUrl;
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
