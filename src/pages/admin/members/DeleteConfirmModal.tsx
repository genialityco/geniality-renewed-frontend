// src/pages/organization/components/DeleteConfirmModal.tsx
import { Modal, Text, Group, Button } from "@mantine/core";

export type DeleteConfirmModalProps = {
  opened: boolean;
  user?: {
    // ajusta si quieres mostrar más info
    user_id?: string | { _id?: unknown; email?: string; names?: string };
    properties?: { email?: string; names?: string; nombres?: string };
  } | null;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void; // se llama al presionar "Eliminar"
  onClose: () => void; // cerrar/cancelar
};

export default function DeleteConfirmModal({
  opened,
  user,
  loading = false,
  error = null,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const name =
    user?.properties?.nombres ??
    user?.properties?.names ??
    (typeof user?.user_id === "object" ? (user?.user_id as any)?.names : "") ??
    "—";
  const email =
    user?.properties?.email ??
    (typeof user?.user_id === "object" ? (user?.user_id as any)?.email : "") ??
    "—";

  return (
    <Modal
      opened={opened}
      onClose={loading ? () => {} : onClose}
      title="Confirmar eliminación"
      centered
      withCloseButton={!loading}
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <Text size="sm" mb="xs">
        ¿Seguro que deseas eliminar este usuario? Esta acción no se puede
        deshacer.
      </Text>

      <Text size="sm" c="dimmed" mb="sm">
        <b>Nombre:</b> {name}
        <br />
        <b>Email:</b> {email}
      </Text>

      {error && (
        <Text size="sm" c="red" mb="sm">
          {error}
        </Text>
      )}

      <Group justify="flex-end">
        <Button variant="default" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button color="red" onClick={onConfirm} loading={loading}>
          Eliminar
        </Button>
      </Group>
    </Modal>
  );
}
