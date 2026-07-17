import { useEffect, useMemo, useState } from "react";
import {
  Paper,
  Group,
  Button,
  Select,
  TextInput,
  Checkbox,
  Table,
  Title,
  Stack,
  Loader,
  Alert,
  Text,
  Textarea,
  Accordion,
  Switch,
  NumberInput,
} from "@mantine/core";
import {
  fetchOrganizationById,
  updateOrganization,
} from "../../../services/organizationService";
import type { UserProperty } from "../../../services/types";
import BrandingForm from "./components/BrandingForm";
import TabsConfigForm from "./components/TabsConfigForm";
import CompletionMessagesForm from "./components/CompletionMessagesForm";
import EmailTemplateForm from "./components/EmailTemplateForm";

const NAME_VAR = { token: "{{nombres}}", label: "nombre del usuario" };
const DATE_VAR = { token: "{{fecha}}", label: "fecha de vigencia" };
// Variables de usuario (disponibles en todos los correos).
const LASTNAME_VAR = { token: "{{apellidos}}", label: "apellidos del usuario" };
const EMAIL_VAR = { token: "{{email}}", label: "correo del usuario" };
const PHONE_VAR = { token: "{{telefono}}", label: "teléfono del usuario" };
// Variables de organización.
const ORG_VAR = { token: "{{organizacion}}", label: "nombre de la organización" };
const LINK_VAR = { token: "{{enlace_acceso}}", label: "enlace de acceso" };
// Variables de suscripción.
const PLAN_VAR = { token: "{{plan}}", label: "duración del plan" };
const AMOUNT_VAR = { token: "{{valor}}", label: "valor pagado" };
const DAYS_LEFT_VAR = { token: "{{dias_restantes}}", label: "días restantes" };

const USER_VARS = [NAME_VAR, LASTNAME_VAR, EMAIL_VAR, PHONE_VAR];
const ORG_VARS = [ORG_VAR, LINK_VAR];
const SUBSCRIPTION_VARS = [DATE_VAR, PLAN_VAR, AMOUNT_VAR, DAYS_LEFT_VAR];

type Props = { organizationId: string };

const TYPE_OPTIONS = [
  { value: "text", label: "Texto" },
  { value: "email", label: "Email" },
  { value: "boolean", label: "Booleano" },
  { value: "list", label: "Lista" },
  { value: "codearea", label: "Área de código" },
  { value: "country", label: "País" },
  { value: "city", label: "Ciudad" },
];

function sortByOrderWeight(a: UserProperty, b: UserProperty) {
  const aw = a.order_weight ?? 0;
  const bw = b.order_weight ?? 0;
  if (aw === bw) return (a.index ?? 0) - (b.index ?? 0);
  return aw - bw;
}

function normalizeOrderWeights(list: UserProperty[]) {
  return list.map((p, i) => ({ ...p, order_weight: i + 1, index: i }));
}

export default function AdminOrganizationSettings({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [propsList, setPropsList] = useState<UserProperty[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        const list = Array.isArray(org.user_properties)
          ? [...org.user_properties]
          : [];
        const normalized = normalizeOrderWeights(list.sort(sortByOrderWeight));
        setPropsList(
          normalized.map((p) => ({
            ...p,
            visible: p.visible !== false,
            description: (p as any).description ?? "",
          }))
        );
      })
      .catch(() => {
        // Error handled in PropertiesPanel
      })
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  if (loading) return <Loader />;

  return (
    <Stack>
      <Title order={3}>Configuración de Mi Organización</Title>

      <Accordion variant="separated">
        <Accordion.Item value="membership">
          <Accordion.Control>
            <Title order={5}>💳 Cobro / Membresía</Title>
            <Text size="xs" c="dimmed">
              Activa o desactiva el cobro y define el valor de la membresía
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <AccessSettingsPanel organizationId={organizationId} />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="branding">
          <Accordion.Control>
            <Title order={5}>🎨 Branding</Title>
            <Text size="xs" c="dimmed">
              Banner, logo y título de la organización
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <BrandingForm organizationId={organizationId} />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="tabs">
          <Accordion.Control>
            <Title order={5}>📑 Configuración de Tabs</Title>
            <Text size="xs" c="dimmed">
              Personaliza los nombres y descripciones de las pestañas
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <TabsConfigForm organizationId={organizationId} />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="completion-messages">
          <Accordion.Control>
            <Title order={5}>✉️ Mensajes de Finalización</Title>
            <Text size="xs" c="dimmed">
              Mensajes personalizados al completar actividades
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <CompletionMessagesForm organizationId={organizationId} />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="welcome-email">
          <Accordion.Control>
            <Title order={5}>👋 Correo de Bienvenida</Title>
            <Text size="xs" c="dimmed">
              Correo que se envía al registrarse en la organización
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <EmailTemplateForm
              organizationId={organizationId}
              configKey="welcome_email"
              enabledLabel="Enviar correo de bienvenida al registrarse"
              variables={[...USER_VARS, ...ORG_VARS]}
              defaults={{
                subject: "{{nombres}}, te damos la bienvenida",
                title: "¡Bienvenido(a)!",
                body: "Es un gusto darte la bienvenida a nuestra plataforma.\n\n¡Explora, aprende y fortalece tus conocimientos con nosotros!",
              }}
              infoText={
                <>
                  Este correo se envía automáticamente cuando un usuario se
                  registra en la organización. Usa el banner y el logo
                  configurados en el <b>Branding</b>.
                </>
              }
            />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="subscription-created-email">
          <Accordion.Control>
            <Title order={5}>💳 Correo de Suscripción (creada)</Title>
            <Text size="xs" c="dimmed">
              Correo que se envía cuando el usuario activa su suscripción
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <EmailTemplateForm
              organizationId={organizationId}
              configKey="subscription_created_email"
              enabledLabel="Enviar correo al activar la suscripción"
              variables={[...USER_VARS, ...SUBSCRIPTION_VARS, ...ORG_VARS]}
              defaults={{
                subject: "{{nombres}}, gracias por tu suscripción",
                title: "¡Gracias por tu suscripción!",
                body: "Tu suscripción ha sido activada de manera exitosa.\n\nAhora tienes acceso hasta el {{fecha}}. ¡Comienza tu recorrido con nosotros!",
              }}
              infoText={
                <>
                  Este correo se envía cuando el usuario paga o se le activa por
                  primera vez una suscripción.
                </>
              }
            />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="subscription-updated-email">
          <Accordion.Control>
            <Title order={5}>🔄 Correo de Suscripción (renovada)</Title>
            <Text size="xs" c="dimmed">
              Correo que se envía cuando se renueva o actualiza la suscripción
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <EmailTemplateForm
              organizationId={organizationId}
              configKey="subscription_updated_email"
              enabledLabel="Enviar correo al renovar/actualizar la suscripción"
              variables={[...USER_VARS, ...SUBSCRIPTION_VARS, ...ORG_VARS]}
              defaults={{
                subject: "{{nombres}}, tu suscripción fue actualizada",
                title: "¡Tu suscripción fue actualizada!",
                body: "Tu suscripción ha sido actualizada de manera exitosa.\n\nAhora tienes acceso hasta el {{fecha}}.",
              }}
              infoText={
                <>
                  Este correo se envía cuando se renueva o se extiende la fecha
                  de vigencia de una suscripción.
                </>
              }
            />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="properties">
          <Accordion.Control>
            <Title order={5}>📋 Propiedades de Usuario</Title>
            <Text size="xs" c="dimmed">
              Campos personalizables del registro de usuarios
            </Text>
          </Accordion.Control>
          <Accordion.Panel>
            <PropertiesPanel
              propsList={propsList}
              setPropsList={setPropsList}
              organizationId={organizationId}
            />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}

// Panel de cobro / membresía: activar/desactivar el cobro y editar el valor.
function AccessSettingsPanel({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [charge, setCharge] = useState(false);
  const [price, setPrice] = useState<number>(0);
  const [days, setDays] = useState<number>(365);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        const acc = (org as any).access_settings ?? {};
        setCharge(acc.type === "payment");
        setPrice(Number(acc.price) || 0);
        setDays(Number(acc.days) || 365);
      })
      .catch(() => setError("No se pudo cargar la configuración de cobro."))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      if (charge && (!price || price <= 0)) {
        throw new Error("Ingresa un valor a cobrar mayor a 0.");
      }
      const access_settings = {
        type: charge ? "payment" : "free",
        price: charge ? Number(price) || 0 : 0,
        days: Number(days) || 0,
      };
      await updateOrganization(organizationId, { access_settings } as any);
      setOk(
        charge
          ? "Cobro activado. Los nuevos usuarios deberán pagar para acceder."
          : "Cobro desactivado. El acceso es gratuito para los miembros."
      );
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la configuración de cobro.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <Stack>
      <Alert color="blue" variant="light">
        Cuando el cobro está <b>activo</b>, los usuarios nuevos verán el mensaje
        para pagar la membresía y no podrán acceder al contenido hasta pagar.
        Cuando está <b>desactivado</b>, el acceso es gratuito para los miembros.
      </Alert>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert color="green" variant="light">
          {ok}
        </Alert>
      )}

      <Paper withBorder p="md" radius="md">
        <Stack>
          <Switch
            label="Cobrar membresía en esta organización"
            checked={charge}
            onChange={(e) => setCharge(e.currentTarget.checked)}
          />

          {charge && (
            <NumberInput
              label="Valor a cobrar (COP)"
              description="Monto de la membresía por período"
              min={0}
              thousandSeparator="."
              decimalSeparator=","
              value={price}
              onChange={(val) => setPrice(Number(val) || 0)}
            />
          )}

          <NumberInput
            label="Días de vigencia"
            description="Duración del acceso tras el pago (o del período gratuito)"
            min={0}
            value={days}
            onChange={(val) => setDays(Number(val) || 0)}
          />

          <Group justify="flex-end" mt="sm">
            <Button onClick={save} loading={saving}>
              Guardar cambios
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}

// Componente auxiliar para las propiedades
interface PropertiesPanelProps {
  propsList: UserProperty[];
  setPropsList: (list: UserProperty[] | ((prev: UserProperty[]) => UserProperty[])) => void;
  organizationId: string;
}

function PropertiesPanel({
  propsList,
  setPropsList,
  organizationId,
}: PropertiesPanelProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const handleChange = (
    i: number,
    patch: Partial<UserProperty> & { description?: string }
  ) => {
    setPropsList((prev: UserProperty[]) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  const moveRow = (i: number, dir: -1 | 1) => {
    setPropsList((prev: UserProperty[]) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return normalizeOrderWeights(next);
    });
  };

  const addProperty = () => {
    setPropsList((prev: UserProperty[]) => {
      const next = [
        ...prev,
        {
          name: "",
          label: "",
          type: "text" as any,
          mandatory: false,
          unique: false,
          options: [],
          dependency: {},
          visible: true,
          description: "" as any,
          order_weight: (prev.length || 0) + 1,
          index: prev.length || 0,
        } as UserProperty,
      ];
      return normalizeOrderWeights(next);
    });
  };

  const removeProperty = (i: number) => {
    setPropsList((prev: UserProperty[]) =>
      normalizeOrderWeights(prev.filter((_: UserProperty, idx: number) => idx !== i))
    );
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      for (const p of propsList) {
        if (!p.name || !p.label) {
          throw new Error("Todos los campos deben tener 'name' y 'label'.");
        }
        if (/\s/.test(p.name)) {
          throw new Error(`'name' no debe contener espacios: ${p.name}`);
        }
      }

      const payload = { user_properties: normalizeOrderWeights(propsList) };
      await updateOrganization(organizationId, payload as any);
      setOk("Propiedades guardadas correctamente.");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(
    () =>
      propsList.map((p, i) => (
        <tr key={`${p.name || "nuevo"}-${i}`}>
          <td style={{ width: 180 }}>
            <TextInput
              label="Label"
              value={p.label}
              onChange={(e) =>
                handleChange(i, { label: e.currentTarget.value })
              }
            />
          </td>

          <td style={{ width: 180 }}>
            <TextInput
              label="Name"
              description="sin espacios, ej: firstName"
              value={p.name}
              onChange={(e) => handleChange(i, { name: e.currentTarget.value })}
            />
          </td>

          <td style={{ width: 160 }}>
            <Select
              label="Tipo"
              data={TYPE_OPTIONS}
              value={(p as any).type ?? "text"}
              onChange={(val) => handleChange(i, { type: val as any })}
            />
          </td>

          <td style={{ width: 260 }}>
            <Textarea
              label="Descripción (opcional)"
              description="Texto de ayuda que se mostrará debajo del campo"
              value={(p as any).description ?? ""}
              onChange={(e) =>
                handleChange(i, { description: e.currentTarget.value })
              }
              autosize
              minRows={2}
              maxRows={4}
            />
          </td>

          <td style={{ width: 120, verticalAlign: "bottom" }}>
            <Checkbox
              label="Obligatorio"
              checked={!!p.mandatory}
              onChange={(e) =>
                handleChange(i, { mandatory: e.currentTarget.checked })
              }
              mt={26}
            />
          </td>

          <td style={{ width: 120, verticalAlign: "bottom" }}>
            <Checkbox
              label="Visible"
              checked={p.visible !== false}
              onChange={(e) =>
                handleChange(i, { visible: e.currentTarget.checked })
              }
              mt={26}
            />
          </td>

          <td style={{ width: 200, verticalAlign: "bottom" }}>
            <Group gap="xs" mt={26}>
              <Button variant="light" size="xs" onClick={() => moveRow(i, -1)}>
                ↑
              </Button>
              <Button variant="light" size="xs" onClick={() => moveRow(i, 1)}>
                ↓
              </Button>
              <Button
                variant="subtle"
                size="xs"
                color="red"
                onClick={() => removeProperty(i)}
              >
                Eliminar
              </Button>
            </Group>
          </td>
        </tr>
      )),
    [propsList]
  );

  return (
    <Stack>
      <Alert color="blue" variant="light">
        Administra <b>user_properties</b>: cambia orden (↑/↓), marca{" "}
        <b>Obligatorio</b>, <b>Visible</b> y añade una <b>Descripción</b>{" "}
        opcional que se mostrará bajo el campo en el formulario.
      </Alert>

      {error && (
        <Alert color="red" variant="light">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert color="green" variant="light">
          {ok}
        </Alert>
      )}

      <Group>
        <Button variant="light" onClick={addProperty}>
          Añadir campo
        </Button>
      </Group>

      <Paper withBorder p="sm" radius="md">
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Label</Table.Th>
              <Table.Th>Name</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Descripción (opcional)</Table.Th>
              <Table.Th>Obligatorio</Table.Th>
              <Table.Th>Visible</Table.Th>
              <Table.Th>Orden</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>

        <Group mt="md" justify="flex-end">
          <Button onClick={save} loading={saving}>
            Guardar cambios
          </Button>
        </Group>

        <Text size="xs" mt="xs" c="dimmed">
          * Al guardar, se recalculan <code>order_weight</code> e{" "}
          <code>index</code> secuenciales.
        </Text>
      </Paper>
    </Stack>
  );
}
