import { useEffect, useRef, useState, useCallback } from "react";
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
  fetchPaymentRequestByReference,
  fetchPaymentRequestByTransactionId,
} from "../../services/paymentRequestsService";
import { syncTransactionById } from "../../services/wompiService";

type UiStatus = "loading" | "pending" | "success" | "fail";

const MembershipPaymentSuccess = () => {
  const { organizationId } = useParams();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get("id");
  const reference = searchParams.get("reference");

  const [status, setStatus] = useState<UiStatus>("loading");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState<number | null>(null);

  const [isChecking, setIsChecking] = useState(false);
  const didSyncOnce = useRef(false);

  const { userId } = useUser();

  const formatCOP = (val: number) =>
    val.toLocaleString("es-CO", { style: "currency", currency: "COP" });

  // 1) Empujar conciliación directa por transactionId (si llegó en la URL)
  useEffect(() => {
    const doSync = async () => {
      if (didSyncOnce.current) return;
      if (!transactionId) return;
      try {
        didSyncOnce.current = true;
        await syncTransactionById(transactionId);
      } catch {
        // no bloquea la UI; el polling lo cubrirá
      }
    };
    doSync();
  }, [transactionId]);

  // 2) Consultar tu PaymentRequest por reference o transactionId
  const checkTransaction = useCallback(async () => {
    if (!userId || (!reference && !transactionId)) {
      setStatus("fail");
      setMessage("No se encontró la transacción o el usuario.");
      return;
    }

    try {
      setIsChecking(true);
      if (status === "loading") {
        setStatus("pending");
        setMessage(
          "Estamos procesando tu pago. Si ya lo realizaste, espera unos minutos e inténtalo de nuevo."
        );
      }

      let payment: any = null;
      if (reference) {
        payment = await fetchPaymentRequestByReference(reference);
      }
      if (!payment && transactionId) {
        payment = await fetchPaymentRequestByTransactionId(transactionId);
      }

      if (!payment) {
        setStatus("pending");
        setMessage(
          "Tu pago está en proceso de confirmación bancaria. Esto puede tardar unos minutos."
        );
        return;
      }

      if (typeof payment.amount === "number") {
        setAmount(payment.amount);
      }

      const s = (payment.status || "").toUpperCase();

      if (s === "APPROVED") {
        setStatus("success");
        setMessage("Tu membresía ha sido activada por un año. ¡Gracias!");
      } else if (["DECLINED", "VOIDED", "ERROR"].includes(s)) {
        setStatus("fail");
        setMessage("El pago no fue aprobado. Estado: " + s);
      } else {
        setStatus("pending");
        setMessage(
          "Tu pago está en proceso de confirmación bancaria. Esto puede tardar unos minutos."
        );
      }
    } catch {
      setStatus("pending");
      setMessage(
        "Estamos verificando el pago con el banco. Si ya pagaste, intenta actualizar el estado en unos minutos."
      );
    } finally {
      setIsChecking(false);
    }
  }, [reference, transactionId, userId, status]);

  // Primera verificación al montar
  useEffect(() => {
    checkTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkTransaction]);

  // Polling cada 7s si está pendiente
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
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
        style={{ maxWidth: 520, width: "100%" }}
      >
        {status === "loading" || status === "pending" ? (
          <Stack align="center">
            <Loader />
            <Text ta="center">
              {status === "loading"
                ? "Verificando el pago y activando tu membresía..."
                : message}
            </Text>
            <Button mt="lg" onClick={checkTransaction} loading={isChecking}>
              Volver a consultar estado
            </Button>
            <Text size="xs" mt="sm" c="dimmed" ta="center">
              Si el pago se aprueba, activaremos tu membresía automáticamente.
            </Text>
          </Stack>
        ) : status === "success" ? (
          <Notification color="green" title="Pago exitoso" onClose={() => {}}>
            <Text>{message}</Text>
            {amount != null && (
              <Text mt="sm">
                Monto pagado: <strong>{formatCOP(amount)}</strong>
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
            <Text>{message}</Text>
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
