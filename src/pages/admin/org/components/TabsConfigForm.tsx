import { useEffect, useState } from "react";
import {
  Stack,
  TextInput,
  Button,
  Group,
  Alert,
  Loader,
  Switch,
  Divider,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import {
  fetchOrganizationById,
  updateOrganization,
} from "../../../../services/organizationService";

type Props = { organizationId: string };

interface TabTitles {
  courses?: string;
  activities?: string;
  exclusive?: string;
}

interface TabVisibility {
  courses: boolean;
  activities: boolean;
  exclusive: boolean;
}

export default function TabsConfigForm({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [tabTitles, setTabTitles] = useState<TabTitles>({
    courses: "CURSOS",
    activities: "ACTIVIDADES",
    exclusive: "MIEMBROS ACE",
  });

  // Por defecto todas las pestañas están habilitadas.
  const [tabVisibility, setTabVisibility] = useState<TabVisibility>({
    courses: true,
    activities: true,
    exclusive: true,
  });

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchOrganizationById(organizationId)
      .then((org) => {
        if (!mounted) return;
        setTabTitles({
          courses: org.tab_titles?.courses || "CURSOS",
          activities: org.tab_titles?.activities || "ACTIVIDADES",
          exclusive: org.tab_titles?.exclusive || "MIEMBROS ACE",
        });
        setTabVisibility({
          courses: org.tab_visibility?.courses !== false,
          activities: org.tab_visibility?.activities !== false,
          exclusive: org.tab_visibility?.exclusive !== false,
        });
      })
      .catch(() => setError("No se pudo cargar la organización"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const handleChange = (key: keyof TabTitles, value: string) => {
    setTabTitles((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggle = (key: keyof TabVisibility, value: boolean) => {
    setTabVisibility((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const payload = { tab_titles: tabTitles, tab_visibility: tabVisibility };
      await updateOrganization(organizationId, payload as any);
      setOk("Configuración de tabs guardada correctamente");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <Stack gap="md">
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert
          icon={<IconCheck size={16} />}
          color="green"
          variant="light"
          onClose={() => setOk(null)}
          withCloseButton
        >
          {ok}
        </Alert>
      )}

      <Text fw={600} size="sm">
        Pestañas visibles en la landing
      </Text>
      <Text size="xs" c="dimmed">
        Habilita o deshabilita las pestañas que se muestran en la landing
        principal de la organización. Por defecto están activadas.
      </Text>

      <Switch
        label="Mostrar pestaña Cursos"
        checked={tabVisibility.courses}
        onChange={(e) => handleToggle("courses", e.currentTarget.checked)}
      />
      <Switch
        label="Mostrar pestaña Actividades"
        checked={tabVisibility.activities}
        onChange={(e) => handleToggle("activities", e.currentTarget.checked)}
      />
      <Switch
        label="Mostrar pestaña Exclusivo (miembros)"
        checked={tabVisibility.exclusive}
        onChange={(e) => handleToggle("exclusive", e.currentTarget.checked)}
      />

      <Divider my="xs" />

      <Text fw={600} size="sm">
        Títulos de las pestañas
      </Text>

      <TextInput
        label="Título - Pestaña Cursos"
        placeholder="CURSOS"
        value={tabTitles.courses || ""}
        onChange={(e) => handleChange("courses", e.currentTarget.value)}
      />

      <TextInput
        label="Título - Pestaña Actividades"
        placeholder="ACTIVIDADES"
        value={tabTitles.activities || ""}
        onChange={(e) => handleChange("activities", e.currentTarget.value)}
      />

      <TextInput
        label="Título - Pestaña Exclusivo"
        placeholder="MIEMBROS ACE"
        value={tabTitles.exclusive || ""}
        onChange={(e) => handleChange("exclusive", e.currentTarget.value)}
      />

      <Group justify="flex-end">
        <Button onClick={handleSave} loading={saving}>
          Guardar cambios
        </Button>
      </Group>
    </Stack>
  );
}
