import { useState } from "react";
import { Card, Stack, Text, Title, Button, Group, Loader, Notification } from "@mantine/core";

const MembershipPayment = () => {
  // Estados simulados
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  // Datos simulados para el plan
  const plan = {
    name: "Plan Premium",
    price: 50000,
    description: "Acceso ilimitado a todos los cursos y actividades por 1 año.",
    date_until: "2025-11-14T16:12:36.654Z",
  };

  const handlePayment = async () => {
    // Simulamos el proceso de pago
    setLoading(true);
    // Simulación de retardo
    setTimeout(() => {
      setLoading(false);
      setPaid(true);
    }, 2000);
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
            <Text size="sm" fw={600}>{plan.price} COP</Text>
          </Group>
          <Group justify="space-around">
            <Text size="sm">Vigencia hasta:</Text>
            <Text size="sm">{new Date(plan.date_until).toLocaleDateString()}</Text>
          </Group>
          {loading ? (
            <Group justify="center" mt="md">
              <Loader />
              <Text>Cargando...</Text>
            </Group>
          ) : paid ? (
            <Notification title="Pago exitoso" color="green" onClose={() => setPaid(false)}>
              Tu membresía ha sido activada.
            </Notification>
          ) : (
            <Button fullWidth mt="md" onClick={handlePayment}>
              Pagar Ahora
            </Button>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};

export default MembershipPayment;
