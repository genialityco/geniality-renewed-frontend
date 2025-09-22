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
} from "@mantine/core";
import {
  fetchOrganizationById,
  updateOrganization,
} from "../../../services/organizationService";
import type { UserProperty } from "../../../services/types";
// import { PropertyType } from "../../../services/types";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [propsList, setPropsList] = useState<UserProperty[]>([]);

  // Cargar y dejar el estado ya normalizado y en orden visual
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
        // default visible=true si no viene
        setPropsList(
          normalized.map((p) => ({
            ...p,
            visible: p.visible !== false,
            description: (p as any).description ?? "", // 👈 asegura que exista
          }))
        );
      })
      .catch(() => setError("No se pudo cargar la organización"))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  const handleChange = (
    i: number,
    patch: Partial<UserProperty> & { description?: string }
  ) => {
    setPropsList((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  };

  // ↑ / ↓ : intercambia posiciones y normaliza pesos/índices
  const moveRow = (i: number, dir: -1 | 1) => {
    setPropsList((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return normalizeOrderWeights(next);
    });
  };

  // Añadir al final y normalizar
  const addProperty = () => {
    setPropsList((prev) => {
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
          description: "", // 👈 nuevo
          order_weight: (prev.length || 0) + 1,
          index: prev.length || 0,
        } as UserProperty & { description?: string },
      ];
      return normalizeOrderWeights(next);
    });
  };

  // Eliminar y normalizar
  const removeProperty = (i: number) => {
    setPropsList((prev) =>
      normalizeOrderWeights(prev.filter((_, idx) => idx !== i))
    );
  };

  // Guardar
  const save = async () => {
    setSaving(true);
    setError(null);
    setOk(null);
    try {
      // Validación simple
      for (const p of propsList) {
        if (!p.name || !p.label) {
          throw new Error("Todos los campos deben tener 'name' y 'label'.");
        }
        if (/\s/.test(p.name)) {
          throw new Error(`'name' no debe contener espacios: ${p.name}`);
        }
      }

      // payload directo con description (opcional)
      const payload = { user_properties: normalizeOrderWeights(propsList) };
      await updateOrganization(organizationId, payload as any);
      setOk("Configuración guardada correctamente.");
    } catch (e: any) {
      setError(e?.message || "No se pudo guardar la configuración.");
    } finally {
      setSaving(false);
    }
  };

  // Render: NO ordenar aquí; respetamos el orden del estado
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

  if (loading) return <Loader />;

  return (
    <Stack>
      <Title order={3}>Configuración de Mi Organización</Title>

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
