import { Modal, Stack, Text, Button, Group, ThemeIcon } from "@mantine/core";
import { IconCheck, IconTrophy } from "@tabler/icons-react";

interface Block {
  id: string;
  type: 'paragraph' | 'heading' | 'title';
  content: string;
}

interface CompletionModalProps {
  opened: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  blocks?: Block[];
  showCertificateButton?: boolean;
  onGetCertificate?: () => void;
}

export default function CompletionModal({
  opened,
  onClose,
  title,
  description,
  blocks,
  showCertificateButton,
  onGetCertificate,
}: CompletionModalProps) {
  // Si se pasan bloques, usarlos; si no, usar title/description
  const hasBlocks = blocks && blocks.length > 0;
  const displayTitle = title || (hasBlocks && blocks[0]?.content) || "¡Felicidades!";
  const displayDescription = description || (hasBlocks && blocks.length > 1 ? blocks[1]?.content : "");

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="md"
      withCloseButton={false}
    >
      <Stack align="center" gap="md">
        <ThemeIcon size={60} radius="md" variant="light" color="green">
          <IconTrophy size={32} />
        </ThemeIcon>

        <Stack gap="xs" align="center">
          <Text size="lg" fw={700} ta="center">
            {displayTitle}
          </Text>
          {displayDescription && (
            <Text size="sm" c="dimmed" ta="center">
              {displayDescription}
            </Text>
          )}
        </Stack>

        <Group justify="center">
          {showCertificateButton && onGetCertificate ? (
            <>
              <Button variant="default" onClick={onClose}>
                Continuar
              </Button>
              <Button
                onClick={onGetCertificate}
                leftSection={<IconCheck size={16} />}
              >
                Descargar certificado
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>Continuar</Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}
