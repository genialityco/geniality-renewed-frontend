import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import {
  Stack,
  Title,
  Card,
  Text,
  Loader,
  Notification,
  Button,
} from "@mantine/core";
import { useUser } from "../../context/UserContext";
import {
  fetchOrganizationUserByUserId,
  createOrUpdateOrganizationUser,
} from "../../services/organizationUserService";
import { createPaymentPlan } from "../../services/paymentPlansService";

const MEMBERSHIP_DAYS = 365;

const MembershipPaymentSuccess = () => {
  const { organizationId } = useParams();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get("id");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  const { userId } = useUser();

  const checkTransaction = async () => {
    if (!transactionId || !userId) {
      setStatus("fail");
      setMessage("No se encontró la transacción o el usuario.");
      return;
    }
    try {
      const resp = await fetch(
        `https://sandbox.wompi.co/v1/transactions/${transactionId}`
      );
      const data = await resp.json();

      if (data.data.status === "APPROVED") {
        setAmount(data.data.amount_in_cents / 100);
        const organizationUser = await fetchOrganizationUserByUserId(userId);
        const now = new Date();
        const date_until = new Date(
          now.setDate(now.getDate() + MEMBERSHIP_DAYS)
        ).toISOString();
        const paymentPlan = await createPaymentPlan({
          days: MEMBERSHIP_DAYS,
          date_until,
          price: data.data.amount_in_cents / 100,
          organization_user_id: organizationUser._id,
        });
        await createOrUpdateOrganizationUser({
          ...organizationUser,
          payment_plan_id: paymentPlan._id,
        });
        setStatus("success");
        setMessage("¡Pago exitoso! Tu membresía ha sido activada.");
      } else if (data.data.status === "PENDING") {
        setStatus("pending");
        setMessage(
          "Tu pago está en proceso de confirmación bancaria. Esto puede tardar unos minutos. Puedes actualizar el estado más tarde."
        );
      } else if (["DECLINED", "VOIDED", "ERROR"].includes(data.data.status)) {
        setStatus("fail");
        setMessage("El pago no fue aprobado. Estado: " + data.data.status);
      } else {
        // Otros estados no definitivos
        setStatus("pending");
        setMessage("Estado actual: " + data.data.status);
      }
    } catch (e) {
      // Errores de red: muestra pending, no fail
      setStatus("pending");
      setMessage(
        "Estamos verificando el pago con el banco. Si ya pagaste, puedes intentar actualizar el estado en unos minutos."
      );
    }
  };

  useEffect(() => {
    checkTransaction();
    // eslint-disable-next-line
  }, [transactionId, userId]);

  return (
    <Stack align="center" p="md" pt="xl" px="md">
      <Title order={2}>Resultado del Pago</Title>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{ maxWidth: 500, width: "100%" }}
      >
        {status === "loading" ? (
          <Stack align="center">
            <Loader />
            <Text>Verificando el pago y activando tu membresía...</Text>
          </Stack>
        ) : status === "pending" ? (
          <Stack align="center">
            <Loader />
            <Text>{message}</Text>
            <Button mt="lg" onClick={checkTransaction}>
              Volver a consultar estado
            </Button>
            <Text size="xs" mt="sm" c="dimmed">
              Si el pago se aprueba, activaremos tu membresía automáticamente.
            </Text>
          </Stack>
        ) : status === "success" ? (
          <Notification color="green" title="Pago exitoso" onClose={() => {}}>
            {message}
            {amount && (
              <Text mt="sm">
                Monto pagado: <strong>{amount} COP</strong>
              </Text>
            )}
            <Button
              mt="lg"
              onClick={() =>
                (window.location.href = `/organizations/${organizationId}`)
              }
            >
              Ir al inicio
            </Button>
          </Notification>
        ) : (
          <Notification color="red" title="Pago no exitoso" onClose={() => {}}>
            {message}
            <Button
              mt="lg"
              onClick={() =>
                (window.location.href = `/organizations/${organizationId}`)
              }
            >
              Intentar de nuevo
            </Button>
          </Notification>
        )}
      </Card>
    </Stack>
  );
};

export default MembershipPaymentSuccess;
