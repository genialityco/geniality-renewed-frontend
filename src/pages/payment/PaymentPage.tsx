import { useEffect, useState } from "react";
import { useUser } from "../../context/UserContext";
import {
  Container,
  Title,
  Text,
  Button,
  Card,
  Flex,
  Paper,
  TextInput,
  Group,
  Loader,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { createPaymentPlan, fetchPaymentPlanByUserId } from "../../services/paymentPlansService";
import { fetchOrganizationUserByUserId } from "../../services/organizationUserService";

export default function PaymentPage() {
  const { organizationId } = useParams();
  const { userId, name, firebaseUser } = useUser();
  const navigate = useNavigate();

  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState(true);
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  // Validar si el usuario ya tiene plan activo
  useEffect(() => {
    const checkPlan = async () => {
      if (!userId) return;
      setCheckingPlan(true);
      try {
        const plan = await fetchPaymentPlanByUserId(userId);
        // Si tiene plan y está vigente, redirige a la organización
        if (plan && plan.date_until && new Date(plan.date_until) > new Date()) {
          navigate(`/organizations/${organizationId}`);
        }
      } catch (e) {
        // Si no tiene plan, se queda en la página de pago
      } finally {
        setCheckingPlan(false);
      }
    };
    if (userId && firebaseUser) {
      checkPlan();
    }
  }, [userId, firebaseUser, organizationId, navigate]);

  // Mostrar AuthForm si el usuario no está logueado
  useEffect(() => {
    if (!userId || !firebaseUser) {
      window.location.replace(
        `/organization/${organizationId}/iniciar-sesion?payment=1`
      );
    }
  }, [userId, firebaseUser, organizationId]);

  if (!userId || !firebaseUser || checkingPlan) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "60vh" }}>
        <Loader />
      </Flex>
    );
  }

  const handlePayment = async () => {
    if (!firebaseUser || !organizationId) return;

    try {
      setLoadingPayment(true);

      // Obtener organizationUserId desde la info del usuario
      const organizationUser = await fetchOrganizationUserByUserId(
        userId as string
      );

      if (!organizationUser) {
        throw new Error("No estás registrado en esta organización.");
      }

      const days = 365;
      const today = new Date();
      const dateUntil = new Date(today);
      dateUntil.setDate(today.getDate() + days);

      await createPaymentPlan({
        organization_user_id: organizationUser._id,
        days,
        date_until: dateUntil.toISOString(),
        price: 50000,
      });

      setPaymentCompleted(true);
    } catch (error) {
      console.error("Error en el pago:", error);
    } finally {
      setLoadingPayment(false);
    }
  };

  // Mostrar confirmación si ya pagó
  if (paymentCompleted) {
    return (
      <Container size="sm" mt="xl">
        <Paper shadow="md" p="xl" radius="md">
          <Title ta="center" order={2} mb="sm">
            ¡Gracias por tu suscripción!
          </Title>
          <Text ta="center" mb="md">
            Ahora tienes acceso completo a los contenidos académicos de
            ENDOCAMPUS ACE.
          </Text>
          <Flex justify="center">
            <Button
              onClick={() => navigate(`/organizations/${organizationId}`)}
            >
              Volver a la organización
            </Button>
          </Flex>
        </Paper>
      </Container>
    );
  }

  // Mostrar formulario de pago si está autenticado y no tiene plan
  return (
    <Container size="sm" mt="xl">
      <Card shadow="md" radius="md" padding="xl" withBorder>
        <Title order={3} mb="sm">
          Simulación de pago
        </Title>
        <Text mb="md">
          Hola {name || "usuario"}, completa el siguiente formulario para
          simular tu pago de <strong>$50.000 COP</strong> o{" "}
          <strong>15 USD</strong>.
        </Text>

        <TextInput
          label="Nombre en la tarjeta"
          placeholder="Juan Pérez"
          value={cardName}
          onChange={(e) => setCardName(e.currentTarget.value)}
          mb="sm"
        />

        <TextInput
          label="Número de tarjeta"
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.currentTarget.value)}
          mb="md"
        />

        <Group mt="md">
          <Button fullWidth loading={loadingPayment} onClick={handlePayment}>
            Realizar pago
          </Button>
        </Group>
      </Card>
    </Container>
  );
}
