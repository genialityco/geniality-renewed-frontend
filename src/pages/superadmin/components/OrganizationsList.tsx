import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Loader,
  Center,
  Text,
  Paper,
  Group,
  Button,
  Modal,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Badge,
  ActionIcon,
  Alert,
  Stack,
} from "@mantine/core";
import {
  fetchOrganizations,
  createOrganization,
  deleteOrganization,
} from "../../../services/organizationService";
import { createOrUpdateOrganizationUser } from "../../../services/organizationUserService";
import { useUser } from "../../../context/UserContext";
import { Organization } from "../../../services/types";

type FormState = {
  name: string;
  description: string;
  visibility: "PUBLIC" | "PRIVATE";
  accessType: "free" | "payment";
  days: number;
  price: number;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  visibility: "PUBLIC",
  accessType: "free",
  days: 30,
  price: 0,
};

export default function OrganizationsList() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const orgs = await fetchOrganizations();
      setOrganizations(orgs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setError(null);
    setModalOpened(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!userId) {
      setError("No se pudo identificar tu usuario. Vuelve a iniciar sesión.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createOrganization({
        name: form.name.trim(),
        description: form.description.trim(),
        visibility: form.visibility,
        access_settings: {
          type: form.accessType,
          days: form.days,
          price: form.accessType === "payment" ? form.price : 0,
        },
        author: userId,
      });

      // Vincula al usuario que crea la organización como su admin,
      // para que pueda entrar a /organization/:id/admin a configurarla.
      await createOrUpdateOrganizationUser({
        user_id: userId,
        organization_id: created._id,
        rol_id: "admin",
        position_id: "",
        properties: {},
      });

      setModalOpened(false);
      await loadOrganizations();
      navigate(`/organization/${created._id}/admin`);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || "No se pudo crear la organización."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar esta organización? Esta acción no se puede deshacer.")) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteOrganization(id);
      await loadOrganizations();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Paper shadow="sm" p="lg">
      <Group justify="space-between" mb="md">
        <Text fw={700} fz="xl">
          Organizaciones
        </Text>
        <Button onClick={openCreateModal}>+ Nueva organización</Button>
      </Group>

      {loading ? (
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      ) : organizations.length === 0 ? (
        <Center py="xl">
          <Text c="gray">No hay organizaciones para mostrar.</Text>
        </Center>
      ) : (
        <Table striped highlightOnHover withColumnBorders>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Visibilidad</Table.Th>
              <Table.Th>Acceso</Table.Th>
              <Table.Th>Descripción</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {organizations.map((org) => (
              <Table.Tr key={org._id}>
                <Table.Td>{org.name}</Table.Td>
                <Table.Td>
                  <Badge color={org.visibility === "PUBLIC" ? "teal" : "gray"}>
                    {org.visibility ?? "-"}
                  </Badge>
                </Table.Td>
                <Table.Td>{org.access_settings?.type ?? "-"}</Table.Td>
                <Table.Td>{org.description || "-"}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => navigate(`/organization/${org._id}/admin`)}
                    >
                      Configurar
                    </Button>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      loading={deletingId === org._id}
                      onClick={() => handleDelete(org._id)}
                    >
                      ✕
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Nueva organización"
        centered
      >
        <Stack>
          {error && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}

          <TextInput
            label="Nombre"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          />

          <Textarea
            label="Descripción"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.currentTarget.value })
            }
            autosize
            minRows={2}
          />

          <Select
            label="Visibilidad"
            data={[
              { value: "PUBLIC", label: "Pública" },
              { value: "PRIVATE", label: "Privada" },
            ]}
            value={form.visibility}
            onChange={(val) =>
              setForm({ ...form, visibility: (val as "PUBLIC" | "PRIVATE") ?? "PUBLIC" })
            }
          />

          <Select
            label="Tipo de acceso"
            data={[
              { value: "free", label: "Gratuito" },
              { value: "payment", label: "De pago" },
            ]}
            value={form.accessType}
            onChange={(val) =>
              setForm({ ...form, accessType: (val as "free" | "payment") ?? "free" })
            }
          />

          <NumberInput
            label="Días de acceso"
            min={0}
            value={form.days}
            onChange={(val) => setForm({ ...form, days: Number(val) || 0 })}
          />

          {form.accessType === "payment" && (
            <NumberInput
              label="Precio"
              min={0}
              value={form.price}
              onChange={(val) => setForm({ ...form, price: Number(val) || 0 })}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Crear organización
            </Button>
          </Group>

          <Text size="xs" c="dimmed">
            Tras crear la organización podrás configurar branding, tabs y las
            propiedades del formulario de registro desde "Configurar" →
            Ajustes.
          </Text>
        </Stack>
      </Modal>
    </Paper>
  );
}
