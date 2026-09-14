import { useEffect, useState } from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  TextInput,
  Select,
  Button,
  Alert,
  List,
  Loader,
  Badge,
} from "@mantine/core";
import { FaWhatsapp } from "react-icons/fa6";
import { useUser } from "../../context/UserContext";
import {
  fetchReminderTemplateNames,
  sendTestReminderTemplate,
  ReminderTemplateName,
  TestReminderTemplateResult,
} from "../../services/remindersService";

const TEMPLATE_LABELS: Record<ReminderTemplateName, string> = {
  recordatorio_inactividad_3dias: "Recordatorio de inactividad (3 días)",
  reporte_semanal_progreso: "Reporte semanal de progreso",
  ranking_lider_curso: "Ranking: líder del curso",
  ranking_comparativo_curso: "Ranking: comparativo con el grupo",
};

export default function RemindersAdminPage() {
  const { userId } = useUser();

  const [templates, setTemplates] = useState<ReminderTemplateName[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateName, setTemplateName] = useState<ReminderTemplateName | "">("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestReminderTemplateResult | null>(null);

  useEffect(() => {
    fetchReminderTemplateNames()
      .then(setTemplates)
      .catch((e) =>
        setError(e?.message || "No se pudieron cargar las plantillas")
      )
      .finally(() => setLoadingTemplates(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!userId) {
      setError("No se encontró el usuario logueado.");
      return;
    }
    if (!templateName || !phone.trim()) {
      setError("Selecciona una plantilla e ingresa el teléfono.");
      return;
    }

    setSending(true);
    try {
      const res = await sendTestReminderTemplate({
        userId,
        templateName,
        to: phone.trim(),
      });
      setResult(res);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Error al enviar la plantilla"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2}>Probar plantillas de recordatorio (WhatsApp)</Title>
          <Text c="dimmed" size="sm">
            Envía un mensaje de prueba usando una plantilla real de WhatsApp,
            con los datos del usuario logueado.
          </Text>
        </div>

        <Card withBorder p="lg" radius="md" component="form" onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="ID de usuario"
              description="Se usa automáticamente el usuario logueado"
              value={userId || ""}
              readOnly
            />

            <Select
              label="Plantilla"
              placeholder={
                loadingTemplates ? "Cargando plantillas..." : "Selecciona una plantilla"
              }
              data={templates.map((t) => ({
                value: t,
                label: TEMPLATE_LABELS[t] ?? t,
              }))}
              value={templateName || null}
              onChange={(value) =>
                setTemplateName((value as ReminderTemplateName) || "")
              }
              disabled={loadingTemplates}
              searchable
              required
            />

            <TextInput
              label="Teléfono destino"
              description="Formato internacional, solo dígitos"
              placeholder="573001112233"
              value={phone}
              onChange={(e) => setPhone(e.currentTarget.value)}
              required
            />

            <Button
              type="submit"
              leftSection={<FaWhatsapp size={16} />}
              loading={sending}
              disabled={loadingTemplates}
            >
              Enviar mensaje de prueba
            </Button>

            {error && (
              <Alert color="red" title="Error">
                {error}
              </Alert>
            )}

            {result && (
              <Card withBorder radius="md" p="md" bg="gray.0">
                <Stack gap="xs">
                  <Text size="sm">
                    Resultado:{" "}
                    <Badge color={result.result === "sent" ? "green" : "yellow"}>
                      {result.result}
                    </Badge>
                    {result.result === "fallback_email" && (
                      <Text component="span" size="sm" c="dimmed">
                        {" "}
                        (WhatsApp falló, se envió email de respaldo)
                      </Text>
                    )}
                  </Text>
                  <Text size="sm" fw={500}>
                    Parámetros usados:
                  </Text>
                  <List size="sm">
                    {result.parameters.map((p, i) => (
                      <List.Item key={i}>{p}</List.Item>
                    ))}
                  </List>
                </Stack>
              </Card>
            )}
          </Stack>
        </Card>

        {loadingTemplates && <Loader size="sm" />}
      </Stack>
    </Container>
  );
}
