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
  Checkbox,
  Group,
  Tabs,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { FaEye, FaWhatsapp } from "react-icons/fa6";
import { useUser } from "../../context/UserContext";
import { useOrganization } from "../../context/OrganizationContext";
import {
  fetchReminderTemplateNames,
  previewReminderTemplate,
  searchReminderTestUsers,
  sendTestReminderTemplate,
  ReminderTemplateName,
  ReminderTemplatePreview,
  ReminderTestUser,
  TestReminderTemplateResult,
} from "../../services/remindersService";
import EngagementResultsPanel from "./EngagementResultsPanel";

const TEMPLATE_LABELS: Record<ReminderTemplateName, string> = {
  recordatorio_inactividad_3dias: "Recordatorio de inactividad (3 días)",
  reporte_semanal_progreso: "Reporte semanal de progreso",
  ranking_lider_curso1: "Ranking: líder del curso",
  ranking_comparativo_curso1: "Ranking: comparativo con el grupo",
};

export default function RemindersAdminPage() {
  const { organization } = useOrganization();
  const organizationId = organization?._id;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={2}>Recordatorios por WhatsApp</Title>
          <Text c="dimmed" size="sm">
            Resultados de los mensajes que envía la plataforma y prueba de
            plantillas.
          </Text>
        </div>

        <Tabs defaultValue="results" keepMounted={false}>
          <Tabs.List>
            <Tabs.Tab value="results">Resultados</Tabs.Tab>
            <Tabs.Tab value="test">Probar plantillas</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="results" pt="md">
            {organizationId ? (
              <EngagementResultsPanel organizationId={organizationId} />
            ) : (
              <Loader size="sm" />
            )}
          </Tabs.Panel>

          <Tabs.Panel value="test" pt="md">
            <TemplateTester organizationId={organizationId} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}

const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.message || fallback;

const userLabel = (u: ReminderTestUser | null) =>
  u ? [u.name, u.email].filter(Boolean).join(" · ") : "";

/** Si el envío real le podría llegar a este usuario, y por qué no. */
function ContactSummary({ user }: { user: ReminderTestUser }) {
  return (
    <Group gap="xs">
      <Badge color={user.has_phone ? "gray" : "red"} variant="outline">
        {user.has_phone ? `Tel. ${user.phone_masked}` : "Sin teléfono"}
      </Badge>
      {user.opted_out ? (
        <Badge color="red" variant="light">
          Se dio de baja
        </Badge>
      ) : (
        <Badge color={user.whatsapp_consent ? "teal" : "orange"} variant="light">
          {user.whatsapp_consent ? "Acepta WhatsApp" : "Sin consentimiento"}
        </Badge>
      )}
      {(!user.has_phone || !user.whatsapp_consent) && (
        <Text size="xs" c="dimmed">
          Los recordatorios reales no le llegarían; la prueba sí funciona.
        </Text>
      )}
    </Group>
  );
}

function TemplateTester({ organizationId }: { organizationId?: string }) {
  const { userId } = useUser();

  const [templates, setTemplates] = useState<ReminderTemplateName[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateName, setTemplateName] = useState<ReminderTemplateName | "">("");
  const [phone, setPhone] = useState("");
  const [trackClick, setTrackClick] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TestReminderTemplateResult | null>(null);
  const [preview, setPreview] = useState<ReminderTemplatePreview | null>(null);

  // Usuario cuyos datos arman el mensaje (por defecto, el logueado)
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [options, setOptions] = useState<ReminderTestUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ReminderTestUser | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    setLoadingTemplates(true);
    fetchReminderTemplateNames(organizationId)
      .then(setTemplates)
      .catch((e) =>
        setError(e?.message || "No se pudieron cargar las plantillas")
      )
      .finally(() => setLoadingTemplates(false));
  }, [organizationId]);

  useEffect(() => {
    const term = debouncedSearch.trim();
    // Al elegir una opción, el buscador muestra su etiqueta: no re-buscar
    if (!organizationId || term.length < 2 || term === userLabel(selectedUser)) {
      return;
    }
    let cancelled = false;
    setSearching(true);
    searchReminderTestUsers(organizationId, term)
      .then((list) => !cancelled && setOptions(list))
      .catch(() => !cancelled && setOptions([]))
      .finally(() => !cancelled && setSearching(false));
    return () => {
      cancelled = true;
    };
  }, [organizationId, debouncedSearch, selectedUser]);

  // La opción elegida se mantiene aunque cambien los resultados
  const userOptions = [
    ...(selectedUser ? [selectedUser] : []),
    ...options.filter((o) => o.user_id !== selectedUser?.user_id),
  ];

  const targetUserId = selectedUser?.user_id || userId;

  const resetOutput = () => {
    setError(null);
    setResult(null);
    setPreview(null);
  };

  const validate = (needsPhone: boolean) => {
    if (!targetUserId || !organizationId) {
      setError("No se encontró el usuario logueado.");
      return false;
    }
    if (!templateName) {
      setError("Selecciona una plantilla.");
      return false;
    }
    if (needsPhone && !phone.trim()) {
      setError("Ingresa el teléfono destino.");
      return false;
    }
    return true;
  };

  const handlePreview = async () => {
    resetOutput();
    if (!validate(false) || !templateName) return;
    setPreviewing(true);
    try {
      setPreview(
        await previewReminderTemplate(organizationId!, {
          userId: targetUserId!,
          templateName,
        })
      );
    } catch (err: any) {
      setError(errorMessage(err, "No se pudo armar la vista previa"));
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetOutput();
    if (!validate(true) || !templateName) return;

    setSending(true);
    try {
      const res = await sendTestReminderTemplate(organizationId!, {
        userId: targetUserId!,
        templateName,
        to: phone.trim(),
        trackClick,
      });
      setResult(res);
    } catch (err: any) {
      setError(errorMessage(err, "Error al enviar la plantilla"));
    } finally {
      setSending(false);
    }
  };

  return (
    <Stack gap="lg" maw={640}>
      <Text c="dimmed" size="sm">
        Arma una plantilla real de WhatsApp con los datos de un usuario de la
        organización (su nombre, último curso, avance…) y envíala al teléfono
        de prueba que indiques. El mensaje nunca se envía al usuario elegido.
      </Text>

      <Card withBorder p="lg" radius="md" component="form" onSubmit={handleSubmit}>
        <Stack gap="md">
          <Select
            label="Usuario cuyos datos se usan"
            description="Busca por nombre, correo, documento o teléfono. Si no eliges a nadie, se usan tus datos."
            placeholder="Tus datos (usuario logueado)"
            searchable
            clearable
            searchValue={search}
            onSearchChange={setSearch}
            // Los resultados ya vienen filtrados por el servidor (también
            // por documento o teléfono, que no están en la etiqueta)
            filter={({ options }) => options}
            nothingFoundMessage={
              searching
                ? "Buscando..."
                : search.trim().length < 2
                ? "Escribe al menos 2 caracteres"
                : "Sin resultados"
            }
            rightSection={searching ? <Loader size="xs" /> : undefined}
            data={userOptions.map((u) => ({
              value: u.user_id,
              label: userLabel(u),
            }))}
            value={selectedUser?.user_id || null}
            onChange={(value) => {
              setSelectedUser(
                userOptions.find((u) => u.user_id === value) || null
              );
              resetOutput();
            }}
          />

          {selectedUser && <ContactSummary user={selectedUser} />}

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

          <Checkbox
            label="Probar el enlace con seguimiento de clics"
            description='Agrega "?ref=test" al botón. Abre el enlace desde WhatsApp: si carga bien la página, se puede activar ENGAGEMENT_CLICK_REF en el servidor.'
            checked={trackClick}
            onChange={(e) => setTrackClick(e.currentTarget.checked)}
          />

          <Group grow>
            <Button
              variant="light"
              leftSection={<FaEye size={16} />}
              onClick={handlePreview}
              loading={previewing}
              disabled={loadingTemplates}
            >
              Vista previa
            </Button>
            <Button
              type="submit"
              leftSection={<FaWhatsapp size={16} />}
              loading={sending}
              disabled={loadingTemplates}
            >
              Enviar al teléfono de prueba
            </Button>
          </Group>

          {error && (
            <Alert color="red" title="Error">
              {error}
            </Alert>
          )}

          {preview && (
            <Card withBorder radius="md" p="md" bg="gray.0">
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Vista previa con los datos de {preview.contact.name}
                </Text>
                {preview.parameters ? (
                  <>
                    <List size="sm">
                      {preview.parameters.map((p, i) => (
                        <List.Item key={i}>
                          <Text span size="sm" c="dimmed">
                            {`{{${i + 1}}}`}
                          </Text>{" "}
                          {p}
                        </List.Item>
                      ))}
                    </List>
                    {preview.buttonUrl && (
                      <Text size="xs" c="dimmed">
                        Botón: …/organization/{preview.buttonUrl}
                      </Text>
                    )}
                  </>
                ) : (
                  <Alert color="yellow" variant="light">
                    Este usuario no tiene actividad suficiente para esta
                    plantilla (p. ej. no ha visto ningún curso pendiente o no
                    hay grupo para comparar), así que el envío real no le
                    llegaría.
                  </Alert>
                )}
              </Stack>
            </Card>
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
                {result.buttonUrl && (
                  <Text size="xs" c="dimmed">
                    Botón: …/organization/{result.buttonUrl}
                  </Text>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      {loadingTemplates && <Loader size="sm" />}
    </Stack>
  );
}
