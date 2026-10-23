// src/pages/admin/genon/TemplatesTab.tsx
import { useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  List,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { FaPaperPlane, FaPen, FaPlus, FaRotateRight, FaTrash } from "react-icons/fa6";
import {
  GenOnTemplate,
  GenOnTemplateButton,
  apiError,
  createGenOnTemplate,
  submitGenOnTemplate,
  syncGenOnTemplates,
  updateGenOnTemplate,
} from "../../../services/genonService";
import type { GenOnTabProps } from "./GenOnAdminPage";
import { VariablesHint } from "./FlowsTab";

const STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Borrador", color: "gray" },
  PENDING: { label: "En revisión", color: "yellow" },
  APPROVED: { label: "Aprobada", color: "green" },
  REJECTED: { label: "Rechazada", color: "red" },
  PAUSED: { label: "Pausada por Meta", color: "orange" },
  DISABLED: { label: "Deshabilitada", color: "red" },
};

/** Estado en Meta; si hay una versión aprobada anterior, también lo dice. */
export function TemplateStatusBadge({ template }: { template: GenOnTemplate }) {
  const s = STATUS[template.meta_status] || STATUS.DRAFT;
  const usesPrevious =
    template.approved && template.meta_status !== "APPROVED";
  return (
    <Tooltip
      label={`Se envía la versión aprobada v${template.approved?.version}`}
      disabled={!usesPrevious}
    >
      <Group gap={4} wrap="nowrap">
        <Badge color={s.color} variant="light" size="sm">
          {s.label}
        </Badge>
        {usesPrevious && (
          <Badge color="green" variant="outline" size="sm">
            v{template.approved!.version} activa
          </Badge>
        )}
      </Group>
    </Tooltip>
  );
}

const renderExample = (text: string, catalog: GenOnTabProps["catalog"]) =>
  text.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/g, (_, key) =>
    catalog.variables.find((v) => v.key === key)?.example ?? `{{${key}}}`
  );

export default function TemplatesTab({
  templates,
  catalog,
  program,
  reload,
}: GenOnTabProps & { reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<Partial<GenOnTemplate> | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const used = new Set(
    Object.values(program.flows || {}).flatMap((steps) =>
      (steps || []).flatMap((s) => s.variants.map((v) => v.template_key))
    )
  );

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing._id) await updateGenOnTemplate(editing._id, editing);
      else await createGenOnTemplate(editing);
      await reload();
      setEditing(null);
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo guardar", message: apiError(e, "") });
    } finally {
      setSaving(false);
    }
  };

  const submit = async (t: GenOnTemplate) => {
    setBusy(t._id);
    try {
      const res = await submitGenOnTemplate(t._id);
      notifications.show({
        color: "green",
        title: "Enviada a Meta",
        message: `${res.meta_name}: ${STATUS[res.meta_status]?.label || res.meta_status}. Meta suele responder en minutos u horas.`,
      });
      await reload();
    } catch (e) {
      notifications.show({ color: "red", title: "Meta no la recibió", message: apiError(e, "") });
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await syncGenOnTemplates();
      notifications.show({
        color: "green",
        title: "Estados actualizados",
        message: `${res.updated} de ${res.total} plantillas enviadas.`,
      });
      await reload();
    } catch (e) {
      notifications.show({ color: "red", title: "No se pudo consultar Meta", message: apiError(e, "") });
    } finally {
      setSyncing(false);
    }
  };

  const actionOptions = [
    { value: "challenge", label: "Empezar el reto" },
    ...(program.replies || []).map((r) => ({
      value: `reply:${r.key}`,
      label: `Responder: ${r.label}`,
    })),
  ];

  return (
    <Stack gap="lg">
      <Alert color="blue" variant="light">
        Los mensajes que inicia Gen.ON son plantillas de WhatsApp aprobadas por
        Meta. Se crean como "utilidad", pero Meta puede reclasificarlas como
        marketing (más costosas y con tope por persona); la categoría final
        aparece en la tabla. Las plantillas son de toda la cuenta de WhatsApp,
        no solo de este programa.
      </Alert>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          Editar una plantilla que ya está en Meta crea una versión nueva en
          borrador; mientras se aprueba, se sigue enviando la anterior.
        </Text>
        <Group>
          <Button
            variant="light"
            leftSection={<FaRotateRight />}
            onClick={sync}
            loading={syncing}
          >
            Actualizar estado desde Meta
          </Button>
          <Button
            leftSection={<FaPlus />}
            onClick={() =>
              setEditing({ key: "", label: "", body: "", footer: "", buttons: [], category: "UTILITY" })
            }
          >
            Nueva plantilla
          </Button>
        </Group>
      </Group>

      <Card withBorder radius="md" p={0}>
        <ScrollArea>
          <Table striped highlightOnHover miw={900}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Plantilla</Table.Th>
                <Table.Th>Estado en Meta</Table.Th>
                <Table.Th>Categoría</Table.Th>
                <Table.Th>Texto</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {templates.map((t) => (
                <Table.Tr key={t._id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {t.label}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t.meta_name || t.key} · v{t.version}
                      {used.has(t.key) ? "" : " · no se usa en este programa"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <TemplateStatusBadge template={t} />
                    {t.rejected_reason && (
                      <Text size="xs" c="red">
                        {t.rejected_reason}
                      </Text>
                    )}
                    {t.errors.length > 0 && (
                      <Tooltip label={t.errors.join(" ")} multiline maw={360}>
                        <Text size="xs" c="red">
                          {t.errors.length} problema(s) para Meta
                        </Text>
                      </Tooltip>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{t.meta_category || t.category}</Text>
                    {t.meta_category && t.meta_category !== t.category && (
                      <Text size="xs" c="orange">
                        Meta la cambió desde {t.category}
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td maw={380}>
                    <Text size="xs" lineClamp={3}>
                      {t.body}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      <ActionIcon variant="subtle" onClick={() => setEditing(structuredClone(t))}>
                        <FaPen />
                      </ActionIcon>
                      {(t.meta_status === "DRAFT" || t.meta_status === "REJECTED") && (
                        <Button
                          size="compact-sm"
                          leftSection={<FaPaperPlane />}
                          loading={busy === t._id}
                          disabled={t.errors.length > 0}
                          onClick={() => submit(t)}
                        >
                          Enviar a Meta
                        </Button>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      <Modal
        opened={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? "Editar plantilla" : "Nueva plantilla"}
        size="xl"
      >
        {editing && (
          <Stack>
            {editing._id && editing.meta_status !== "DRAFT" && (
              <Alert color="yellow" variant="light">
                Esta plantilla ya está en Meta. Si cambias el texto o los
                botones, se crea la versión v{(editing.version || 1) + 1} en
                borrador y habrá que enviarla a revisión.
              </Alert>
            )}
            <Group grow>
              {!editing._id && (
                <TextInput
                  label="Clave"
                  description="Minúsculas y guiones bajos; la usan los flujos"
                  value={editing.key}
                  onChange={(e) => setEditing({ ...editing, key: e.currentTarget.value })}
                />
              )}
              <TextInput
                label="Nombre"
                value={editing.label}
                onChange={(e) => setEditing({ ...editing, label: e.currentTarget.value })}
              />
              <Select
                label="Categoría"
                data={[
                  { value: "UTILITY", label: "Utilidad" },
                  { value: "MARKETING", label: "Marketing" },
                ]}
                value={editing.category}
                onChange={(v) => setEditing({ ...editing, category: v as any })}
                allowDeselect={false}
              />
            </Group>
            <Textarea
              label="Texto"
              description="No puede empezar ni terminar con una variable; los enlaces van en un botón."
              autosize
              minRows={4}
              maxLength={1024}
              value={editing.body}
              onChange={(e) => setEditing({ ...editing, body: e.currentTarget.value })}
            />
            <VariablesHint catalog={catalog} />
            <TextInput
              label="Pie (opcional, sin variables)"
              maxLength={60}
              value={editing.footer}
              onChange={(e) => setEditing({ ...editing, footer: e.currentTarget.value })}
            />
            <ButtonsEditor
              buttons={editing.buttons || []}
              onChange={(buttons) => setEditing({ ...editing, buttons })}
              actionOptions={actionOptions}
            />
            <Card withBorder bg="gray.0" p="sm">
              <Text size="xs" c="dimmed" mb={4}>
                Vista previa con datos de ejemplo
              </Text>
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {renderExample(editing.body || "", catalog)}
              </Text>
              {editing.footer && (
                <Text size="xs" c="dimmed" mt={4}>
                  {editing.footer}
                </Text>
              )}
              {(editing.buttons || []).length > 0 && (
                <List size="xs" mt={6}>
                  {(editing.buttons || []).map((b, i) => (
                    <List.Item key={i}>
                      [{b.type === "URL" ? "Enlace" : "Respuesta"}] {b.text}
                    </List.Item>
                  ))}
                </List>
              )}
            </Card>
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button onClick={save} loading={saving}>
                Guardar
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function ButtonsEditor({
  buttons,
  onChange,
  actionOptions,
}: {
  buttons: GenOnTemplateButton[];
  onChange: (b: GenOnTemplateButton[]) => void;
  actionOptions: { value: string; label: string }[];
}) {
  const set = (i: number, changes: Partial<GenOnTemplateButton>) =>
    onChange(buttons.map((b, j) => (j === i ? { ...b, ...changes } : b)));
  return (
    <Stack gap={6}>
      <Text size="sm" fw={500}>
        Botones
      </Text>
      <Text size="xs" c="dimmed">
        Respuestas rápidas (hasta 10) y enlaces (hasta 2), agrupados. El enlace
        lleva a la actividad pendiente de la persona. Toda plantilla debería
        ofrecer "No recibir más mensajes".
      </Text>
      {buttons.map((b, i) => (
        <Group key={i} gap="xs">
          <Select
            size="xs"
            w={140}
            data={[
              { value: "QUICK_REPLY", label: "Respuesta" },
              { value: "URL", label: "Enlace" },
            ]}
            value={b.type}
            onChange={(v) =>
              set(i, {
                type: v as GenOnTemplateButton["type"],
                action: v === "URL" ? undefined : b.action || "challenge",
              })
            }
            allowDeselect={false}
          />
          <TextInput
            size="xs"
            w={220}
            maxLength={25}
            placeholder="Texto (máx. 25)"
            value={b.text}
            onChange={(e) => set(i, { text: e.currentTarget.value })}
          />
          {b.type === "QUICK_REPLY" && (
            <Select
              size="xs"
              w={280}
              data={actionOptions}
              value={b.action || null}
              onChange={(v) => set(i, { action: v || undefined })}
            />
          )}
          <ActionIcon
            size="sm"
            variant="subtle"
            color="red"
            onClick={() => onChange(buttons.filter((_, j) => j !== i))}
          >
            <FaTrash />
          </ActionIcon>
        </Group>
      ))}
      {buttons.length < 10 && (
        <Button
          size="compact-xs"
          variant="subtle"
          w="fit-content"
          onClick={() =>
            onChange([...buttons, { type: "QUICK_REPLY", text: "", action: "challenge" }])
          }
        >
          + botón
        </Button>
      )}
    </Stack>
  );
}
