import { useState, useRef } from "react";
import {
  Stack,
  Group,
  Card,
  ActionIcon,
  Popover,
  Button,
  Text,
  Box,
  Modal,
  TextInput,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { v4 as uuidv4 } from "uuid";
import { ContentBlock, TextBlock, SLASH_COMMANDS } from "./types";
import { uploadImageToServer } from "../../services/fileUploadService";
import { notifications } from "@mantine/notifications";

interface NotionEditorProps {
  blocks: ContentBlock[];
  onBlocksChange: (blocks: ContentBlock[]) => void;
}

export default function NotionEditor({
  blocks,
  onBlocksChange,
}: NotionEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateBlock = (id: string, updatedBlock: ContentBlock) => {
    onBlocksChange(
      blocks.map((b) => (b.id === id ? updatedBlock : b))
    );
  };

  const deleteBlock = (id: string) => {
    if (blocks.length === 1) {
      // Siempre dejar al menos un bloque de texto
      onBlocksChange([
        {
          type: "text",
          id: uuidv4(),
          content: "",
          format: "plain",
          listType: "none",
        } as TextBlock,
      ]);
    } else {
      onBlocksChange(blocks.filter((b) => b.id !== id));
    }
  };

  const handleTextChange = (blockId: string, newContent: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block?.type !== "text") return;

    const textBlock = block as TextBlock;
    
    // Detectar "/" solo si el bloque está vacío o solo contiene "/"
    if (newContent === "/" || newContent === "/ ") {
      setShowSlashMenu(true);
      setPendingBlockId(blockId);
    } else if (showSlashMenu && !newContent.includes("/")) {
      setShowSlashMenu(false);
    } else if (!newContent.includes("/")) {
      setShowSlashMenu(false);
    }

    updateBlock(blockId, {
      ...textBlock,
      content: newContent,
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    blockId: string
  ) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block?.type !== "text") return;

    // Si presiona Enter, crear nuevo bloque
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      
      const newBlock: TextBlock = {
        type: "text",
        id: uuidv4(),
        content: "",
        format: "plain",
        listType: "none",
      };

      const currentIndex = blocks.findIndex((b) => b.id === blockId);
      const newBlocks = [...blocks];
      newBlocks.splice(currentIndex + 1, 0, newBlock);
      onBlocksChange(newBlocks);

      // Focus al nuevo bloque (con delay para que se renderice)
      setTimeout(() => {
        const textareas = containerRef.current?.querySelectorAll("textarea");
        if (textareas) {
          textareas[currentIndex + 1]?.focus();
        }
      }, 0);
    }
  };

  const handleSlashCommand = (command: typeof SLASH_COMMANDS[0]) => {
    if (!pendingBlockId) return;

    const block = blocks.find((b) => b.id === pendingBlockId);
    if (block?.type !== "text") return;

    const textBlock = block as TextBlock;

    // Remover el "/" del contenido antes de aplicar comando
    const contentWithoutSlash = textBlock.content.replace(/^\/\s?/, "");

    if (command.id === "image") {
      updateBlock(pendingBlockId, {
        ...textBlock,
        content: contentWithoutSlash,
      });
      setShowSlashMenu(false);
      setTimeout(() => fileInputRef.current?.click(), 0);
      return;
    } 
    
    if (command.id === "video") {
      updateBlock(pendingBlockId, {
        ...textBlock,
        content: contentWithoutSlash,
      });
      setShowSlashMenu(false);
      setVideoModalOpen(true);
      return;
    }

    // Aplicar formato a comando normal
    const action = command.action("");
    updateBlock(pendingBlockId, {
      ...textBlock,
      content: contentWithoutSlash,
      format: action.format || "plain",
      listType: action.listType || "none",
    });

    setShowSlashMenu(false);
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file || !pendingBlockId) return;

    try {
      const url = await uploadImageToServer(file, "quiz-blocks");
      const newBlock = {
        type: "image" as const,
        id: uuidv4(),
        url,
        caption: "",
      };

      const insertIndex = blocks.findIndex((b) => b.id === pendingBlockId) + 1;
      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex, 0, newBlock);

      // Agregar bloque de texto después de la imagen
      const textBlock: TextBlock = {
        type: "text",
        id: uuidv4(),
        content: "",
        format: "plain",
        listType: "none",
      };
      newBlocks.splice(insertIndex + 1, 0, textBlock);

      onBlocksChange(newBlocks);
      notifications.show({
        message: "Imagen cargada",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        message: "Error al cargar imagen",
        color: "red",
      });
    } finally {
      setPendingBlockId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleVideoSave = () => {
    if (!videoUrl || !pendingBlockId) return;

    const newBlock = {
      type: "video" as const,
      id: uuidv4(),
      url: videoUrl,
      caption: videoCaption,
    };

    const insertIndex = blocks.findIndex((b) => b.id === pendingBlockId) + 1;
    const newBlocks = [...blocks];
    newBlocks.splice(insertIndex, 0, newBlock);

    // Agregar bloque de texto después del video
    const textBlock: TextBlock = {
      type: "text",
      id: uuidv4(),
      content: "",
      format: "plain",
      listType: "none",
    };
    newBlocks.splice(insertIndex + 1, 0, textBlock);

    onBlocksChange(newBlocks);
    setVideoModalOpen(false);
    setVideoUrl("");
    setVideoCaption("");
    setPendingBlockId(null);
    notifications.show({
      message: "Video agregado",
      color: "green",
    });
  };

  return (
    <>
      <Card ref={containerRef} withBorder p="md" radius="md">
        <Stack gap="md">
          {blocks.map((block) => {
            if (block.type === "text") {
              const textBlock = block as TextBlock;
              const fontSize =
                textBlock.format === "h1"
                  ? "1.875rem"
                  : textBlock.format === "h2"
                    ? "1.25rem"
                    : textBlock.format === "h3"
                      ? "1.125rem"
                      : "1rem";

              return (
                <div
                  key={block.id}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                  }}
                >
                  <textarea
                    value={textBlock.content}
                    onChange={(e) =>
                      handleTextChange(block.id, e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, block.id)}
                    placeholder="Presiona '/' para opciones..."
                    style={{
                      flex: 1,
                      minHeight: "24px",
                      fontSize,
                      fontWeight:
                        ["h1", "h2", "h3"].includes(textBlock.format)
                          ? "bold"
                          : "normal",
                      fontStyle:
                        textBlock.format === "quote" ? "italic" : "normal",
                      fontFamily:
                        textBlock.format === "code"
                          ? "monospace"
                          : "inherit",
                      backgroundColor:
                        textBlock.format === "code" ? "#f3f4f6" : "transparent",
                      padding:
                        textBlock.format === "code" ? "0.5rem" : "0",
                      border: "none",
                      outline: "none",
                      borderLeft:
                        textBlock.format === "quote"
                          ? "4px solid #3b82f6"
                          : "none",
                      paddingLeft:
                        textBlock.format === "quote" ? "1rem" : "0",
                      resize: "none",
                    }}
                  />
                  {blocks.length > 1 && (
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      onClick={() => deleteBlock(block.id)}
                      mt="0.25rem"
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </div>
              );
            }

            if (block.type === "image") {
              return (
                <div
                  key={block.id}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                  }}
                >
                  <img
                    src={block.url}
                    alt="quiz"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "300px",
                      borderRadius: "8px",
                      flex: 1,
                    }}
                  />
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => deleteBlock(block.id)}
                    mt="0.25rem"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </div>
              );
            }

            if (block.type === "video") {
              return (
                <div
                  key={block.id}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    {block.url.includes("youtube.com") ||
                    block.url.includes("youtu.be") ? (
                      <iframe
                        src={block.url}
                        width="100%"
                        height="315"
                        style={{ borderRadius: "8px" }}
                        allowFullScreen
                      />
                    ) : block.url.includes("vimeo.com") ? (
                      <iframe
                        src={block.url}
                        width="100%"
                        height="315"
                        style={{ borderRadius: "8px" }}
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={block.url}
                        controls
                        style={{
                          maxWidth: "100%",
                          borderRadius: "8px",
                        }}
                      />
                    )}
                  </div>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    size="sm"
                    onClick={() => deleteBlock(block.id)}
                    mt="0.25rem"
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </div>
              );
            }

            return null;
          })}
        </Stack>
      </Card>

      {/* Menú slash */}
      {showSlashMenu && (
        <Popover
          position="bottom-start"
          withArrow
          shadow="md"
          opened={true}
          withinPortal
          styles={{
            dropdown: {
              maxHeight: "400px",
              overflowY: "auto",
              zIndex: 1000,
            },
          }}
        >
          <Popover.Target>
            <Box pos="absolute" w={0} h={0} />
          </Popover.Target>
          <Popover.Dropdown p="xs">
            <Stack gap="6px">
              {SLASH_COMMANDS.map((command) => (
                <Button
                  key={command.id}
                  onClick={() => handleSlashCommand(command)}
                  variant="light"
                  justify="flex-start"
                  fullWidth
                  h="auto"
                  p="xs"
                  styles={{ label: { width: "100%" } }}
                >
                  <Group justify="flex-start" gap="sm" w="100%">
                    <Text fw={600}>{command.icon}</Text>
                    <div>
                      <Text fw={500} size="sm">
                        {command.label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {command.description}
                      </Text>
                    </div>
                  </Group>
                </Button>
              ))}
            </Stack>
          </Popover.Dropdown>
        </Popover>
      )}

      {/* Modal video */}
      <Modal
        opened={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        title="Agregar video"
        centered
      >
        <Stack gap="md">
          <TextInput
            placeholder="URL de YouTube, Vimeo o video directo"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.currentTarget.value)}
            label="URL del video"
          />
          <TextInput
            placeholder="Descripción (opcional)"
            value={videoCaption}
            onChange={(e) => setVideoCaption(e.currentTarget.value)}
            label="Descripción"
          />
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setVideoModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleVideoSave}>Agregar</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handleImageUpload(e.target.files?.[0] || null)}
      />
    </>
  );
}
