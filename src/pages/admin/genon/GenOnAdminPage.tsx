// src/pages/admin/genon/GenOnAdminPage.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FaFloppyDisk, FaPlus, FaTrash } from "react-icons/fa6";
import { useOrganization } from "../../../context/OrganizationContext";
import { fetchPracticeAdminOrganizations } from "../../../services/whatsappPracticeService";
import {
  GenOnCatalog,
  GenOnProgram,
  GenOnTemplate,
  MODE_LABELS,
  apiError,
  createGenOnProgram,
  deleteGenOnProgram,
  fetchGenOnCatalog,
  fetchGenOnPrograms,
  fetchGenOnTemplates,
  updateGenOnProgram,
} from "../../../services/genonService";
import ProgramTab from "./ProgramTab";
import FlowsTab from "./FlowsTab";
import TemplatesTab from "./TemplatesTab";
import CoursesTab from "./CoursesTab";
import TestTab from "./TestTab";
import TrackingTab from "./TrackingTab";

// Lo que se guarda del programa (el resto lo maneja el motor)
const EDITABLE: (keyof GenOnProgram)[] = [
  "name",
  "mode",
  "organization_ids",
  "event_ids",
  "timezone",
  "send_slots",
  "blocked_weekdays",
  "weekly_cap",
  "social_min",
  "default_activity_minutes",
  "auto_login_links",
  "holdout_percent",
  "segments",
  "flows",
  "replies",
  "challenge",
  "courses",
  "triggers",
];

const MODE_COLORS = { off: "gray", dry_run: "yellow", live: "green" } as const;

export interface GenOnTabProps {
  program: GenOnProgram;
  patch: (changes: Partial<GenOnProgram>) => void;
  catalog: GenOnCatalog;
  templates: GenOnTemplate[];
  organizations: { _id: string; name: string }[];
}

/**
 * Gen.ON Adherencia Educación: programas (organizaciones, horarios, tope,
 * control), flujos por segmento, plantillas de Meta, retos por curso,
 * pruebas y seguimiento.
 */
export default function GenOnAdminPage() {
  const { organization } = useOrganization();
  const [programs, setPrograms] = useState<GenOnProgram[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<GenOnProgram | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<GenOnCatalog | null>(null);
  const [templates, setTemplates] = useState<GenOnTemplate[]>([]);
  const [organizations, setOrganizations] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadTemplates = useCallback(async () => {
    setTemplates(await fetchGenOnTemplates());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchGenOnPrograms(),
      fetchGenOnCatalog(),
      fetchGenOnTemplates(),
      fetchPracticeAdminOrganizations(),
    ])
      .then(([list, cat, tpls, orgs]) => {
        setPrograms(list);
        setCatalog(cat);
        setTemplates(tpls);
        setOrganizations(orgs);
        if (list.length) setSelectedId(list[0]._id);
      })
      .catch((e) => setError(apiError(e, "No se pudo cargar Gen.ON")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const p = programs.find((x) => x._id === selectedId) || null;
    setDraft(p ? structuredClone(p) : null);
    setDirty(false);
  }, [selectedId, programs]);

  const patch = useCallback((changes: Partial<GenOnProgram>) => {
    setDraft((d) => (d ? { ...d, ...changes } : d));
    setDirty(true);
  }, []);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const body: Partial<GenOnProgram> = {};
      for (const k of EDITABLE) (body as any)[k] = draft[k];
      const saved = await updateGenOnProgram(draft._id, body);
      setPrograms((list) => list.map((p) => (p._id === saved._id ? saved : p)));
      notifications.show({ color: "green", title: "Guardado", message: "El programa se actualizó." });
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo guardar", message: apiError(e, "") });
    } finally {
      setSaving(false);
    }
  };

  const create = async () => {
    try {
      const created = await createGenOnProgram({
        name: newName.trim(),
        organization_ids: organization?._id ? [organization._id] : [],
      });
      setPrograms((list) => [created, ...list]);
      setSelectedId(created._id);
      setCreating(false);
      setNewName("");
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo crear", message: apiError(e, "") });
    }
  };

  const remove = async () => {
    if (!draft) return;
    try {
      await deleteGenOnProgram(draft._id);
      const rest = programs.filter((p) => p._id !== draft._id);
      setPrograms(rest);
      setSelectedId(rest[0]?._id || null);
      setConfirmDelete(false);
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo borrar", message: apiError(e, "") });
    }
  };

  const tabProps = useMemo<GenOnTabProps | null>(
    () =>
      draft && catalog
        ? { program: draft, patch, catalog, templates, organizations }
        : null,
    [draft, catalog, templates, organizations, patch]
  );

  if (loading) return <Loader />;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <div>
          <Title order={2}>Gen.ON · Adherencia</Title>
          <Text c="dimmed" size="sm">
            Mensajes por WhatsApp según el segmento de cada inscrito (abandono,
            inactivos), con retos de conocimiento que completan actividades.
          </Text>
        </div>

        {error && (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        )}

        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" align="flex-end">
            <Group align="flex-end">
              <Select
                label="Programa"
                placeholder={programs.length ? "Elige un programa" : "Aún no hay programas"}
                data={programs.map((p) => ({ value: p._id, label: p.name }))}
                value={selectedId}
                onChange={(v) => {
                  if (dirty && !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")) return;
                  setSelectedId(v);
                }}
                w={320}
              />
              {draft && (
                <Badge color={MODE_COLORS[draft.mode]} size="lg" variant="light">
                  {MODE_LABELS[draft.mode]}
                </Badge>
              )}
            </Group>
            <Group>
              <Button variant="light" leftSection={<FaPlus />} onClick={() => setCreating(true)}>
                Nuevo programa
              </Button>
              {draft && (
                <>
                  <Button
                    color="red"
                    variant="subtle"
                    leftSection={<FaTrash />}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Borrar
                  </Button>
                  <Button
                    leftSection={<FaFloppyDisk />}
                    onClick={save}
                    loading={saving}
                    disabled={!dirty}
                  >
                    Guardar cambios
                  </Button>
                </>
              )}
            </Group>
          </Group>
          {dirty && (
            <Text size="xs" c="orange" mt="xs">
              Hay cambios sin guardar en el programa.
            </Text>
          )}
        </Paper>

        {!draft ? (
          <Alert color="blue" variant="light">
            Crea un programa para elegir las organizaciones y configurar sus
            flujos. Empieza apagado; pruébalo en simulación antes de activarlo.
          </Alert>
        ) : (
          tabProps && (
            <Tabs defaultValue="program" keepMounted={false}>
              <Tabs.List>
                <Tabs.Tab value="program">Programa</Tabs.Tab>
                <Tabs.Tab value="flows">Flujos</Tabs.Tab>
                <Tabs.Tab value="templates">Plantillas</Tabs.Tab>
                <Tabs.Tab value="courses">Cursos y retos</Tabs.Tab>
                <Tabs.Tab value="test">Pruebas</Tabs.Tab>
                <Tabs.Tab value="tracking">Seguimiento</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="program" pt="md">
                <ProgramTab {...tabProps} dirty={dirty} />
              </Tabs.Panel>
              <Tabs.Panel value="flows" pt="md">
                <FlowsTab {...tabProps} />
              </Tabs.Panel>
              <Tabs.Panel value="templates" pt="md">
                <TemplatesTab {...tabProps} reload={loadTemplates} />
              </Tabs.Panel>
              <Tabs.Panel value="courses" pt="md">
                <CoursesTab {...tabProps} />
              </Tabs.Panel>
              <Tabs.Panel value="test" pt="md">
                <TestTab {...tabProps} dirty={dirty} />
              </Tabs.Panel>
              <Tabs.Panel value="tracking" pt="md">
                <TrackingTab {...tabProps} />
              </Tabs.Panel>
            </Tabs>
          )
        )}
      </Stack>

      <Modal opened={creating} onClose={() => setCreating(false)} title="Nuevo programa">
        <Stack>
          <TextInput
            label="Nombre"
            placeholder="Piloto EndoCampus"
            value={newName}
            onChange={(e) => setNewName(e.currentTarget.value)}
          />
          <Text size="xs" c="dimmed">
            Se crea apagado, con los segmentos, flujos y textos del documento
            de Gen.ON, para la organización actual. Luego puedes sumar otras.
          </Text>
          <Group justify="flex-end">
            <Button onClick={create} disabled={!newName.trim()}>
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={confirmDelete} onClose={() => setConfirmDelete(false)} title="Borrar programa">
        <Stack>
          <Text size="sm">
            Se borra la configuración del programa. Los mensajes ya enviados
            siguen en los resultados.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button color="red" onClick={remove}>
              Borrar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
