// src/pages/admin/genon/AchievementsTab.tsx
import { useCallback, useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { FaPlus, FaTrash } from "react-icons/fa6";
import type { GenOnTabProps } from "./GenOnAdminPage";
import { apiError } from "../../../services/genonService";
import {
  AchievementDef,
  AchievementsConfig,
  AchievementsReport,
  AchievementType,
  fetchAchievementsReport,
} from "../../../services/genonAchievementsService";

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("es-CO", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

/**
 * Logros del estudiante: hitos por tipo y umbral que la plataforma le
 * muestra al conseguirlos (aviso flotante y pestaña «Mis logros» del
 * perfil). Se otorgan una vez por persona; el informe cuenta cuántos los
 * consiguieron y cuántos los vieron.
 */
export default function AchievementsTab({
  program,
  patch,
  catalog,
  dirty,
}: GenOnTabProps & { dirty: boolean }) {
  const cfg = program.achievements;
  const types = catalog.achievement_types || [];

  if (!cfg) {
    return (
      <Alert color="yellow" variant="light">
        El servidor aún no devuelve la configuración de logros. Actualiza el backend.
      </Alert>
    );
  }

  const set = (changes: Partial<AchievementsConfig>) =>
    patch({ achievements: { ...cfg, ...changes } });
  const setItem = (i: number, changes: Partial<AchievementDef>) =>
    set({ items: cfg.items.map((x, j) => (j === i ? { ...x, ...changes } : x)) });
  const typeOf = (key: AchievementType) => types.find((t) => t.key === key);

  const add = () =>
    set({
      items: [
        ...cfg.items,
        {
          id: `logro_${Date.now().toString(36)}`,
          enabled: true,
          type: "videosCompleted",
          threshold: 10,
          title: "Nuevo logro",
        },
      ],
    });

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <div>
            <Title order={4}>Logros del estudiante</Title>
            <Text size="sm" c="dimmed">
              Cada logro tiene un tipo y un umbral. Al cumplirlo, la persona ve una
              felicitación en la plataforma y el logro queda en «Mis logros» de su
              perfil. Cuenta lo que hace en cualquier curso del programa y se otorga
              una sola vez. Solo aplica con el programa en simulación o activo.
            </Text>
          </div>
          <Group gap="xl" align="flex-end">
            <Switch
              label="Logros activos"
              checked={cfg.enabled}
              onChange={(e) => set({ enabled: e.currentTarget.checked })}
            />
            <Switch
              label="Mostrar al estudiante"
              description="Aviso al conseguirlos y pestaña «Mis logros»"
              checked={cfg.show_to_student}
              onChange={(e) => set({ show_to_student: e.currentTarget.checked })}
            />
            <NumberInput
              label="Grupo de control (%)"
              description="Se les registra el logro, pero no lo ven"
              min={0}
              max={90}
              w={220}
              value={cfg.holdout_percent}
              onChange={(v) => set({ holdout_percent: Number(v) || 0 })}
            />
          </Group>
          {cfg.enabled && program.mode === "off" && (
            <Alert color="yellow" variant="light">
              El programa está apagado: los logros no se otorgan hasta pasarlo a
              simulación o activarlo.
            </Alert>
          )}
        </Stack>
      </Card>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={4}>Hitos</Title>
              <Text size="sm" c="dimmed">
                En la felicitación puedes usar {"{nombre}"} (Dr(a). y primer nombre),
                {" {umbral}"}, {"{valor}"} y {"{singular|plural}"} según el umbral.
                Cambiar la clave de un logro lo cuenta como uno nuevo.
              </Text>
            </div>
            <Button leftSection={<FaPlus />} variant="light" onClick={add} disabled={cfg.items.length >= 30}>
              Agregar logro
            </Button>
          </Group>

          {cfg.items.map((item, i) => {
            const t = typeOf(item.type);
            return (
              <Card key={i} withBorder radius="sm" p="sm" opacity={item.enabled ? 1 : 0.6}>
                <Stack gap="xs">
                  <Group gap="sm" align="flex-end" wrap="wrap">
                    <Switch
                      checked={item.enabled}
                      onChange={(e) => setItem(i, { enabled: e.currentTarget.checked })}
                      style={{ paddingBottom: 8 }}
                    />
                    <TextInput
                      label="Título"
                      value={item.title}
                      maxLength={60}
                      onChange={(e) => setItem(i, { title: e.currentTarget.value })}
                      style={{ flex: 2, minWidth: 180 }}
                    />
                    <Select
                      label="Tipo"
                      data={types.map((x) => ({ value: x.key, label: x.label }))}
                      value={item.type}
                      onChange={(v) => v && setItem(i, { type: v as AchievementType })}
                      allowDeselect={false}
                      style={{ flex: 2, minWidth: 200 }}
                    />
                    <NumberInput
                      label={item.type === "courseProgress" ? "Umbral (%)" : "Umbral"}
                      min={1}
                      max={item.type === "courseProgress" ? 100 : 1000}
                      value={item.threshold}
                      onChange={(v) => setItem(i, { threshold: Number(v) || 1 })}
                      w={110}
                    />
                    <TextInput
                      label="Clave"
                      value={item.id}
                      maxLength={40}
                      onChange={(e) =>
                        setItem(i, { id: e.currentTarget.value.replace(/[^\w-]/g, "_") })
                      }
                      w={160}
                    />
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => set({ items: cfg.items.filter((_, j) => j !== i) })}
                      style={{ marginBottom: 6 }}
                      aria-label="Quitar logro"
                    >
                      <FaTrash />
                    </ActionIcon>
                  </Group>
                  <Textarea
                    label="Felicitación"
                    autosize
                    minRows={1}
                    maxLength={280}
                    placeholder={t?.default_text}
                    value={item.text || ""}
                    onChange={(e) => setItem(i, { text: e.currentTarget.value })}
                  />
                </Stack>
              </Card>
            );
          })}
          {!cfg.items.length && (
            <Text size="sm" c="dimmed">
              Sin logros. Agrega uno para empezar.
            </Text>
          )}
        </Stack>
      </Card>

      <ReportCard programId={program._id} dirty={dirty} />
    </Stack>
  );
}

function ReportCard({ programId, dirty }: { programId: string; dirty: boolean }) {
  const [report, setReport] = useState<AchievementsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReport(await fetchAchievementsReport(programId));
    } catch (e) {
      setError(apiError(e, "No se pudo cargar el informe de logros"));
    } finally {
      setLoading(false);
    }
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card withBorder radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Title order={4}>Informe</Title>
            <Text size="sm" c="dimmed">
              Quiénes consiguieron cada logro y cuántos vieron la felicitación.
              {dirty ? " Guarda los cambios para verlos aquí." : ""}
            </Text>
          </div>
          <Button variant="default" onClick={load} loading={loading}>
            Actualizar
          </Button>
        </Group>
        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}
        {!report && loading && <Loader size="sm" />}
        {report && (
          <>
            <Table.ScrollContainer minWidth={560}>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Logro</Table.Th>
                    <Table.Th ta="right">Conseguido</Table.Th>
                    <Table.Th ta="right">Vieron el aviso</Table.Th>
                    <Table.Th ta="right">Control</Table.Th>
                    <Table.Th>Último</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {report.achievements.map((a) => (
                    <Table.Tr key={a.id}>
                      <Table.Td>
                        <Group gap={6}>
                          <Text size="sm">{a.title}</Text>
                          {!a.enabled && (
                            <Badge size="xs" color="gray" variant="light">
                              apagado
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td ta="right">{a.awarded}</Table.Td>
                      <Table.Td ta="right">{a.seen}</Table.Td>
                      <Table.Td ta="right">{a.holdout}</Table.Td>
                      <Table.Td>{formatDate(a.last)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>

            <Text fw={600} size="sm">
              Más recientes
            </Text>
            {report.recent.length ? (
              <Table.ScrollContainer minWidth={560}>
                <Table>
                  <Table.Tbody>
                    {report.recent.map((r) => (
                      <Table.Tr key={`${r.achievement_id}:${r.user_id}`}>
                        <Table.Td>{formatDate(r.created_at)}</Table.Td>
                        <Table.Td>
                          <Text size="sm">{r.name || "—"}</Text>
                          <Text size="xs" c="dimmed">
                            {r.email}
                          </Text>
                        </Table.Td>
                        <Table.Td>{r.title}</Table.Td>
                        <Table.Td>
                          {r.holdout ? (
                            <Badge size="xs" color="gray" variant="light">
                              control
                            </Badge>
                          ) : r.seen_at ? (
                            <Badge size="xs" color="green" variant="light">
                              visto
                            </Badge>
                          ) : (
                            <Badge size="xs" color="yellow" variant="light">
                              sin ver
                            </Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            ) : (
              <Text size="sm" c="dimmed">
                Aún nadie ha conseguido un logro.
              </Text>
            )}
          </>
        )}
      </Stack>
    </Card>
  );
}
