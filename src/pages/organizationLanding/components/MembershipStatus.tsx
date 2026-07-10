import { Card, Text } from "@mantine/core";
import MembershipPayment from "../../../components/MembershipPayment";

interface MembershipStatusProps {
  loading: boolean;
  userId?: string | null;
  // ¿El usuario es miembro de ESTA organización? El estado de membresía/pago
  // solo aplica a miembros. Un usuario logueado en otra organización (sesión
  // global de Firebase) NO debe ver el mensaje de "Bienvenido / Pagar
  // Membresía" aquí: para esta organización es un visitante.
  isMember?: boolean;
  paymentPlan?: any; // Puedes reemplazar "any" por el tipo real de tu paymentPlan si lo tienes
  isExpired: (plan: any) => boolean;
}

export default function MembershipStatus({
  loading,
  userId,
  isMember,
  paymentPlan,
  isExpired,
}: MembershipStatusProps) {
  if (loading || !userId || !isMember) return null;
  if (!paymentPlan) {
    return (
      <Card>
        <Text fw={700} mt="md">
          📚 Bienvenido, solo te falta un paso para empezar a disfrutar de
          contenidos exclusivos, cursos, conferencias y herramientas diseñadas
          para llevar tu conocimiento al siguiente nivel.
        </Text>
        <MembershipPayment />
      </Card>
    );
  }
  if (isExpired(paymentPlan)) {
    return (
      <Card>
        <Text c="red" fw={700} mt="md">
          Tu membresía está vencida. Para acceder al contenido debes renovar tu
          pago.
        </Text>
        <MembershipPayment />
      </Card>
    );
  }
  return null;
}
