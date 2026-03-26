import { useEffect, useState } from "react";
import {
  Stack,
  Title,
  Group,
  Paper,
  Text,
  Alert,
  Button,
  Loader,
  ThemeIcon,
  SimpleGrid,
  Divider,
} from "@mantine/core";
import {
  FaRotate,
  FaCircleXmark,
  FaArrowsRotate,
  FaCircleCheck,
  FaHourglassEnd,
  FaGlobe,
  FaUserShield,
  FaWrench,
  FaBoxArchive,
  FaStore,
} from "react-icons/fa6";
import {
  fetchSubscriptionReport,
  SubscriptionReport as SubscriptionReportData,
} from "../../../services/paymentPlansService";

type Props = { organizationId: string };

type StatCardProps = {
  icon: React.ReactNode;
  color: string;
  label: string;
  value: number;
  description: string;
};

function StatCard({ icon, color, label, value, description }: StatCardProps) {
  return (
    <Paper withBorder p="md" radius="md">
      <Group wrap="nowrap" align="flex-start" gap="sm">
        <ThemeIcon size="lg" radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <Stack gap={2}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {label}
          </Text>
          <Text size="xl" fw={700} lh={1}>
            {value.toLocaleString("es-CO")}
          </Text>
          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </Stack>
      </Group>
    </Paper>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text size="xs" fw={700} tt="uppercase" c="dimmed">
      {children}
    </Text>
  );
}

export default function SubscriptionReport({ organizationId }: Props) {
  const [report, setReport] = useState<SubscriptionReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSubscriptionReport(organizationId);
      setReport(data);
    } catch {
      setError("No se pudo cargar el reporte. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [organizationId]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Stack gap={2}>
          <Title order={4}>Reporte de Suscripciones</Title>
          {report && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Total registrados:{" "}
                <Text span fw={600} c="dark">
                  {(report.totalPaid + report.totalUnpaid).toLocaleString("es-CO")}
                </Text>
              </Text>
              <Text size="xs" c="dimmed">·</Text>
              <Text size="xs" c="dimmed">
                Con suscripción:{" "}
                <Text span fw={600} c="dark">
                  {report.totalPaid.toLocaleString("es-CO")}
                </Text>
              </Text>
            </Group>
          )}
        </Stack>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<FaArrowsRotate size={12} />}
          onClick={load}
          loading={loading}
        >
          Actualizar
        </Button>
      </Group>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}

      {loading && !report && (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      )}

      {report && (
        <Stack gap="md">

          {/* Estado */}
          <SectionTitle>Estado de suscripciones</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatCard
              icon={<FaCircleCheck size={16} />}
              color="green"
              label="Activas"
              value={report.totalActive}
              description="Con acceso vigente"
            />
            <StatCard
              icon={<FaHourglassEnd size={16} />}
              color="red"
              label="Vencidas"
              value={report.totalExpired}
              description="Plan expirado"
            />
            <StatCard
              icon={<FaCircleXmark size={16} />}
              color="orange"
              label="Sin suscripción"
              value={report.totalUnpaid}
              description="Registradas, nunca pagaron"
            />
          </SimpleGrid>

          <Divider />

          {/* Activos: renovados vs primer año */}
          <SectionTitle>Activos — renovados vs. primer año</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <StatCard
              icon={<FaCircleCheck size={16} />}
              color="teal"
              label="Activos sin renovar"
              value={report.activeNotRenewed}
              description="Vigentes en su primer año, no han renovado"
            />
            <StatCard
              icon={<FaRotate size={16} />}
              color="cyan"
              label="Activos renovados"
              value={report.activeRenewed}
              description="Vigentes y han renovado al menos una vez"
            />
          </SimpleGrid>

          <Divider />

          {/* Origen del pago */}
          <SectionTitle>Por origen del pago</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <StatCard
              icon={<FaGlobe size={16} />}
              color="blue"
              label="Gateway / Wompi"
              value={report.bySource.gateway}
              description="Pagos procesados por pasarela"
            />
            <StatCard
              icon={<FaUserShield size={16} />}
              color="violet"
              label="Admin"
              value={report.bySource.admin}
              description="Creados por administrador"
            />
            <StatCard
              icon={<FaWrench size={16} />}
              color="gray"
              label="Manual"
              value={report.bySource.manual}
              description="Ingresados manualmente"
            />
          </SimpleGrid>

          <Divider />

          {/* Plataforma actual vs migrados */}
          <SectionTitle>Plataforma actual vs migrados</SectionTitle>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <StatCard
              icon={<FaStore size={16} />}
              color="teal"
              label="Plataforma actual"
              value={report.platformPayments}
              description="Tienen PaymentRequest — pagados en esta plataforma"
            />
            <StatCard
              icon={<FaBoxArchive size={16} />}
              color="yellow"
              label="Migrados"
              value={report.migratedPayments}
              description="Sin PaymentRequest — importados de sistema anterior"
            />
          </SimpleGrid>

          <Divider />

          {/* Renovaciones */}
          <Group justify="space-between" align="center">
            <SectionTitle>
              Renovaciones — total: {report.totalRenewals.toLocaleString("es-CO")}
            </SectionTitle>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <StatCard
              icon={<FaGlobe size={16} />}
              color="cyan"
              label="Renovados por pasarela"
              value={report.renewalsGateway}
              description="Plan extendido con pago en esta plataforma"
            />
            <StatCard
              icon={<FaBoxArchive size={16} />}
              color="yellow"
              label="Renovados desde migración"
              value={report.renewalsMigrated}
              description="Plan extendido sin PaymentRequest (admin / migración)"
            />
          </SimpleGrid>

          <Text size="xs" c="dimmed" ta="right">
            Generado:{" "}
            {new Date(report.generatedAt).toLocaleString("es-CO", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </Text>

        </Stack>
      )}
    </Stack>
  );
}
