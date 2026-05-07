import { useEffect, useState } from "react";
import {
  Stack,
  TextInput,
  Button,
  Group,
  Alert,
  Loader,
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

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      const payload = { tab_titles: tabTitles };
      await updateOrganization(organizationId, payload as any);
      setOk("Títulos de tabs guardados correctamente");
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
        <Button variant="light" onClick={() => setOk(null)}>
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Guardar cambios
        </Button>
      </Group>
    </Stack>
  );
}
