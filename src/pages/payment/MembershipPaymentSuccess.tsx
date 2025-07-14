import { useEffect, useState, useCallback } from "react";
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
import { fetchPaymentRequestByReference, fetchPaymentRequestByTransactionId } from "../../services/paymentRequestsService";

const MembershipPaymentSuccess = () => {
  const { organizationId } = useParams();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get("id");
  const reference = searchParams.get("reference");
  const [status, setStatus] = useState<"loading" | "pending" | "success" | "fail">("loading");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  const { userId } = useUser();

  // Puedes usar reference o transactionId para consultar
  const checkTransaction = useCallback(async () => {
    if (!userId || (!reference && !transactionId)) {
      setStatus("fail");
      setMessage("No se encontró la transacción o el usuario.");
      return;
    }

    setStatus("pending");
    setMessage(
      "Estamos procesando tu pago. Si ya realizaste el pago, por favor espera unos minutos y vuelve a intentar."
    );

    try {
      let payment = null;
      if (reference) {
        payment = await fetchPaymentRequestByReference(reference);
      }
      if (!payment && transactionId) {
        payment = await fetchPaymentRequestByTransactionId(transactionId);
      }
      if (!payment) {
        setStatus("pending");
        setMessage(
          "Estamos procesando tu pago. Si ya realizaste el pago, por favor espera unos minutos y vuelve a intentar."
        );
        return;
      }

      setAmount(payment.amount);

      if (payment.status === "APPROVED") {
        setStatus("success");
        setMessage("Tu membresía ha sido activada por un año.");
      } else if (["DECLINED", "VOIDED", "ERROR"].includes(payment.status)) {
        setStatus("fail");
        setMessage("El pago no fue aprobado. Estado: " + payment.status);
      } else {
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
  }, [reference, transactionId, userId]);

  useEffect(() => {
    checkTransaction();
    // eslint-disable-next-line
  }, [checkTransaction]);

  // Polling para actualizar cada 7 segundos si está pendiente
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === "pending") {
      interval = setInterval(() => {
        checkTransaction();
      }, 7000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, checkTransaction]);

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
                (window.location.href = `/organization/${organizationId}`)
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
                (window.location.href = `/organization/${organizationId}/pago`)
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
