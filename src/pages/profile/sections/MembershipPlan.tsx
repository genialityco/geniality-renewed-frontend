import { Card, Stack, Text, Badge, Group } from "@mantine/core";
import { useEffect, useState } from "react";
import { fetchPaymentPlanByUserId } from "../../../services/paymentPlansService";
import { useUser } from "../../../context/UserContext";
import { PaymentPlan } from "../../../services/types";

const MembershipPlan = () => {
  const { userId } = useUser();
  const [plan, setPlan] = useState<PaymentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        if (userId) {
          const data = await fetchPaymentPlanByUserId(userId);
          setPlan(data);
        }
      } catch (error) {
        console.error("Error al obtener el plan:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [userId]);

  if (loading) return <Text>Cargando plan...</Text>;
  if (!plan) return <Text>No se encontró plan de membresía.</Text>;

  // Asumimos que:
  // - La fecha de inicio es el campo created_at
  // - La fecha de fin es el campo date_until
  const isActive = new Date() <= new Date(plan.date_until);
  const startDate = new Date(plan.created_at).toLocaleDateString();
  const endDate = new Date(plan.date_until).toLocaleDateString();

  return (
    <Stack pt="md" maw={400}>
      <Text size="xl" fw={700}>
        Mi Plan / Membresía
      </Text>

      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text fw={600}>Estado</Text>
            <Badge color={isActive ? "green" : "red"} variant="light">
              {isActive ? "Activo" : "Inactivo"}
            </Badge>
          </Group>

          <Group justify="space-between">
            <Text fw={600}>Fecha de inicio</Text>
            <Text>{startDate}</Text>
          </Group>

          <Group justify="space-between">
            <Text fw={600}>Fecha de fin</Text>
            <Text>{endDate}</Text>
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
};

export default MembershipPlan;
