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
import {
  createPaymentPlan,
  fetchPaymentPlanByUserId,
  updatePaymentPlanDateUntil,
} from "../../services/paymentPlansService";

const MEMBERSHIP_DAYS = 365;

// Detecta ambiente según variable de entorno
const wompiBaseUrl =
  import.meta.env.VITE_WOMPI_ENV === "production"
    ? "https://production.wompi.co"
    : "https://sandbox.wompi.co";

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
        `${wompiBaseUrl}/v1/transactions/${transactionId}`
      );
      const data = await resp.json();

      // Manejo de NOT_FOUND_ERROR (no mostrar fallido, mostrar pendiente)
      if (data.type === "NOT_FOUND_ERROR") {
        setStatus("pending");
        setMessage(
          "Estamos procesando tu pago. Si ya realizaste el pago, por favor espera unos minutos y vuelve a intentar."
        );
        return;
      }

      if (data.data.status === "APPROVED") {
        setAmount(data.data.amount_in_cents / 100);
        const organizationUser = await fetchOrganizationUserByUserId(userId);
        // const now = new Date();
        const newDateUntil = new Date(
          Date.now() + MEMBERSHIP_DAYS * 24 * 60 * 60 * 1000
        ).toISOString();

        // 1. ¿El usuario ya tiene PaymentPlan?
        let paymentPlan = null;
        try {
          paymentPlan = await fetchPaymentPlanByUserId(userId);
        } catch (e) {
          paymentPlan = null; // Si falla es porque no tiene
        }

        let updatedPaymentPlan;
        if (paymentPlan && paymentPlan._id) {
          // Opcional: Si el plan aún está activo, puedes sumar días a la fecha actual
          // const currentUntil = new Date(paymentPlan.date_until);
          // const baseDate = currentUntil > new Date() ? currentUntil : new Date();
          // const date_until = new Date(baseDate.getTime() + MEMBERSHIP_DAYS * 24 * 60 * 60 * 1000).toISOString();
          // updatedPaymentPlan = await updatePaymentPlanDateUntil(paymentPlan._id, date_until);

          // En este ejemplo, siempre pone un año desde hoy:
          updatedPaymentPlan = await updatePaymentPlanDateUntil(
            paymentPlan._id,
            newDateUntil
          );
          // Si quieres actualizar el precio también, crea/usa otro endpoint y pásalo aquí
        } else {
          updatedPaymentPlan = await createPaymentPlan({
            days: MEMBERSHIP_DAYS,
            date_until: newDateUntil,
            price: data.data.amount_in_cents / 100,
            organization_user_id: organizationUser._id,
          });
        }

        // 2. Asociar el paymentPlan al usuario, siempre (si ya lo tiene, lo sobreescribe igual)
        await createOrUpdateOrganizationUser({
          ...organizationUser,
          payment_plan_id: updatedPaymentPlan._id,
        });

        setStatus("success");
        setMessage("Tu membresía ha sido activada por un año.");
      } else if (["DECLINED", "VOIDED", "ERROR"].includes(data.data.status)) {
        setStatus("fail");
        setMessage("El pago no fue aprobado. Estado: " + data.data.status);
      } else {
        // PENDING u otro estado intermedio: muestra “Procesando”
        setStatus("pending");
        setMessage(
          "Tu pago está en proceso de confirmación bancaria. Esto puede tardar unos minutos. Puedes actualizar el estado más tarde."
        );
      }
    } catch (e) {
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
        {status === "loading" || status === "pending" ? (
          <Stack align="center">
            <Loader />
            <Text>
              {status === "loading"
                ? "Verificando el pago y activando tu membresía..."
                : message}
            </Text>
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
                (window.location.href = `/organizations/${organizationId}/pago`)
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
