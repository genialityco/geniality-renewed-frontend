import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  FileInput,
  Group,
  Image,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { FaPencil, FaPlus, FaTrash } from "react-icons/fa6";
import { Host } from "../../../services/types";
import {
  fetchHostsByEventId,
  createHost,
  updateHost,
  deleteHost,
} from "../../../services/hostsService";
import { uploadImageToFirebase } from "../../../utils/uploadImageToFirebase";

interface Props {
  organizationId?: string;
  eventId?: string;
}

export default function AdminHosts({ eventId }: Props) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  // filtro
  const [q, setQ] = useState("");

  // crear
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cProfession, setCProfession] = useState("");
  const [cDesc, setCDesc] = useState("");
  const [cPublished, setCPublished] = useState(true);
  const [cOrder, setCOrder] = useState<number | "">("");
  const [cIndex, setCIndex] = useState<number | "">("");
  const [cFile, setCFile] = useState<File | null>(null);
  const [cPreview, setCPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // editar
  const [editOpen, setEditOpen] = useState(false);
  const [current, setCurrent] = useState<Host | null>(null);
  const [eName, setEName] = useState("");
  const [eProfession, setEProfession] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [ePublished, setEPublished] = useState(true);
  const [eOrder, setEOrder] = useState<number | "">("");
  const [eIndex, setEIndex] = useState<number | "">("");
  const [eFile, setEFile] = useState<File | null>(null);
  const [ePreview, setEPreview] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // eliminar
  const [delOpen, setDelOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Host | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetchHostsByEventId(eventId)
      .then(setHosts)
      .finally(() => setLoading(false));
  }, [eventId]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return hosts;
    return hosts.filter((h) =>
      [h.name, h.profession, h.description]
        .filter(Boolean)
        .some((v) => (v || "").toLowerCase().includes(term))
    );
  }, [hosts, q]);

  // ----- Crear -----
  const handleCreate = async () => {
    if (!eventId || !cName.trim()) return;
    if (!cFile) {
      alert("Selecciona una imagen (JPG/PNG, máx. 5MB).");
      return;
    }
    if (cFile.size > 5 * 1024 * 1024) {
      alert("La imagen supera 5MB.");
      return;
    }
    if (!cFile.type.startsWith("image/")) {
      alert("El archivo debe ser una imagen.");
      return;
    }

    try {
      setCreating(true);
      const imageUrl = await uploadImageToFirebase(cFile, `hosts/${eventId}`);

      const payload: Partial<Host> = {
        name: cName.trim(),
        image: imageUrl,
        description_activity: false,
        description: cDesc.trim(),
        profession: cProfession.trim(),
        published: cPublished,
        order: Number.isFinite(cOrder) ? (cOrder as number) : 0,
        index: Number.isFinite(cIndex) ? (cIndex as number) : 0,
        event_id: eventId as any,
        activities_ids: [],
      };

      const created = await createHost(payload);
      setHosts((prev) => [created, ...prev]);
      // reset
      setCName("");
      setCProfession("");
      setCDesc("");
      setCPublished(true);
      setCOrder("");
      setCIndex("");
      setCFile(null);
      setCPreview(null);
      setCreateOpen(false);
    } catch (err) {
      console.error(err);
      alert("No se pudo crear el host.");
    } finally {
      setCreating(false);
    }
  };

  // ----- Editar (abrir) -----
  const openEdit = (h: Host) => {
    setCurrent(h);
    setEName(h.name || "");
    setEProfession(h.profession || "");
    setEDesc(h.description || "");
    setEPublished(!!h.published);
    setEOrder(typeof h.order === "number" ? h.order : "");
    setEIndex(typeof h.index === "number" ? h.index : "");
    setEFile(null);
    setEPreview(null);
    setEditOpen(true);
  };

  // ----- Guardar edición -----
  const handleUpdate = async () => {
    if (!current?._id) return;

    try {
      setUpdating(true);
      let imageUrl = current.image;

      if (eFile) {
        if (eFile.size > 5 * 1024 * 1024) {
          alert("La imagen supera 5MB.");
          setUpdating(false);
          return;
        }
        if (!eFile.type.startsWith("image/")) {
          alert("El archivo debe ser una imagen.");
          setUpdating(false);
          return;
        }
        imageUrl = await uploadImageToFirebase(eFile, `hosts/${current.event_id}`);
      }

      const patch: Partial<Host> = {
        name: eName.trim(),
        image: imageUrl,
        description: eDesc.trim(),
        profession: eProfession.trim(),
        published: ePublished,
        order: Number.isFinite(eOrder) ? (eOrder as number) : 0,
        index: Number.isFinite(eIndex) ? (eIndex as number) : 0,
      };

      const updated = await updateHost(current._id as any, patch as any);
      setHosts((prev) => prev.map((x) => (x._id === updated._id ? updated : x)));
      setEditOpen(false);
      setCurrent(null);
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar el host.");
    } finally {
      setUpdating(false);
    }
  };

  // ----- Eliminar -----
  const handleDelete = async () => {
    if (!toDelete?._id) return;
    try {
      setDeleting(true);
      await deleteHost(toDelete._id as any);
      setHosts((prev) => prev.filter((x) => x._id !== toDelete._id));
      setDelOpen(false);
      setToDelete(null);
    } catch (err) {
      console.error(err);
      alert("No se pudo eliminar el host.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <Loader mt="xl" mx="auto" />;

  return (
    <Container fluid>
      <Group justify="space-between" mb="md">
        <Title order={2}>Hosts / Speakers</Title>
        <Button leftSection={<FaPlus />} onClick={() => setCreateOpen(true)}>
          Nuevo host
        </Button>
      </Group>

      <Paper withBorder p="md" mb="md" radius="lg">
        <TextInput
          label="Buscar"
          placeholder="Filtra por nombre, profesión o descripción"
          value={q}
          onChange={(e) => setQ(e.currentTarget.value)}
        />
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
        {filtered.map((h) => (
          <Card key={h._id} withBorder shadow="sm" radius="md">
            {h.image ? (
              <Image src={h.image} alt={h.name} h={160} radius="md" fit="cover" />
            ) : (
              <Paper h={160} radius="md" withBorder bg="gray.1" />
            )}

            <Stack gap={6} mt="sm">
              <Group justify="space-between">
                <Text fw={600}>{h.name}</Text>
                <Badge color={h.published ? "teal" : "gray"}>
                  {h.published ? "Publicado" : "Oculto"}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {h.profession || "—"}
              </Text>
              <Text size="sm" lineClamp={2}>
                {h.description || "Sin descripción"}
              </Text>
              <Group gap="xs">
                <Badge variant="light">Order: {h.order ?? 0}</Badge>
                <Badge variant="light">Index: {h.index ?? 0}</Badge>
                <Badge variant="light">Activities: {h.activities_ids?.length ?? 0}</Badge>
              </Group>
            </Stack>

            <Group mt="md" justify="flex-end">
              <Tooltip label="Editar">
                <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(h)}>
                  <FaPencil />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Eliminar">
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={() => {
                    setToDelete(h);
                    setDelOpen(true);
                  }}
                >
                  <FaTrash />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Modal crear */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear host"
        centered
      >
        <Stack>
          <TextInput
            label="Nombre"
            value={cName}
            onChange={(e) => setCName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Profesión / Rol"
            value={cProfession}
            onChange={(e) => setCProfession(e.currentTarget.value)}
            placeholder="Ej: Data Scientist"
          />
          <TextInput
            label="Descripción"
            value={cDesc}
            onChange={(e) => setCDesc(e.currentTarget.value)}
            placeholder="Bio o resumen"
          />
          <Group grow>
            <TextInput
              label="Order (opcional)"
              type="number"
              value={cOrder}
              onChange={(e) =>
                setCOrder(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value))
              }
            />
            <TextInput
              label="Index (opcional)"
              type="number"
              value={cIndex}
              onChange={(e) =>
                setCIndex(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value))
              }
            />
          </Group>
          <Switch
            label="Publicado"
            checked={cPublished}
            onChange={(e) => setCPublished(e.currentTarget.checked)}
          />
          <FileInput
            label="Imagen (JPG/PNG, máx. 5MB)"
            placeholder="Selecciona una imagen"
            accept="image/*"
            value={cFile}
            onChange={(file) => {
              setCFile(file);
              setCPreview(file ? URL.createObjectURL(file) : null);
            }}
            clearable
          />
          {cPreview && (
            <Image src={cPreview} alt="Preview" radius="md" w={160} h={160} fit="cover" />
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button loading={creating} onClick={handleCreate}>
              Crear
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal editar */}
      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Editar host${current ? `: ${current.name}` : ""}`}
        centered
      >
        <Stack>
          <TextInput
            label="Nombre"
            value={eName}
            onChange={(e) => setEName(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Profesión / Rol"
            value={eProfession}
            onChange={(e) => setEProfession(e.currentTarget.value)}
          />
          <TextInput
            label="Descripción"
            value={eDesc}
            onChange={(e) => setEDesc(e.currentTarget.value)}
          />
          <Group grow>
            <TextInput
              label="Order"
              type="number"
              value={eOrder}
              onChange={(e) =>
                setEOrder(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value))
              }
            />
            <TextInput
              label="Index"
              type="number"
              value={eIndex}
              onChange={(e) =>
                setEIndex(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value))
              }
            />
          </Group>
          <Switch
            label="Publicado"
            checked={ePublished}
            onChange={(e) => setEPublished(e.currentTarget.checked)}
          />
          {current?.image && !eFile && (
            <Image src={current.image} alt={current.name} radius="md" w={160} h={160} fit="cover" />
          )}
          <FileInput
            label="Reemplazar imagen (opcional)"
            placeholder="Selecciona una imagen"
            accept="image/*"
            value={eFile}
            onChange={(file) => {
              setEFile(file);
              setEPreview(file ? URL.createObjectURL(file) : null);
            }}
            clearable
          />
          {ePreview && <Image src={ePreview} alt="Preview" radius="md" w={160} h={160} fit="cover" />}

          <Group justify="flex-end" mt="sm">
            <Button variant="light" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button loading={updating} onClick={handleUpdate}>
              Guardar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal eliminar */}
      <Modal
        opened={delOpen}
        onClose={() => setDelOpen(false)}
        title="Eliminar host"
        centered
      >
        <Text mb="md">
          ¿Seguro que deseas eliminar el host <b>{toDelete?.name}</b>?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDelOpen(false)}>
            Cancelar
          </Button>
          <Button color="red" loading={deleting} onClick={handleDelete} leftSection={<FaTrash />}>
            Eliminar
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
