import { useState, useRef } from "react";
import {
  Box,
  Popover,
  Stack,
  Text,
  Group,
  Textarea,
  Button,
  Badge,
  ActionIcon,
  Menu,
} from "@mantine/core";
import { IconTrash, IconPhoto, IconVideo } from "@tabler/icons-react";
import { TextBlock, ListType, TextFormat, SLASH_COMMANDS } from "./types";
import styles from "./SlashCommandEditor.module.css";

interface SlashCommandEditorProps {
  block: TextBlock;
  onUpdate: (block: TextBlock) => void;
  onDelete: () => void;
  onAddImage: () => void;
  onAddVideo: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function SlashCommandEditor({
  block,
  onUpdate,
  onDelete,
  onAddImage,
  onAddVideo,
  onKeyDown,
}: SlashCommandEditorProps) {
  const [content, setContent] = useState(block.content);
  const [format, setFormat] = useState<TextFormat>(block.format);
  const [listType, setListType] = useState<ListType>(block.listType);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detectar "/" para mostrar menú
  const handleChange = (value: string) => {
    setContent(value);

    // Detectar "/" en la última palabra
    const lastChar = value[value.length - 1];
    const lastWord = value.split(" ").pop() || "";

    if (lastChar === "/" && value.length > 0) {
      setShowSlashMenu(true);
    } else if (lastWord === "" || !lastWord.startsWith("/")) {
      setShowSlashMenu(false);
    }
  };

  const handleCommandSelect = (command: typeof SLASH_COMMANDS[0]) => {
    const action = command.action(content);

    // Manejar comandos especiales de inserción
    if (action.type === "insert-image") {
      setShowSlashMenu(false);
      // Remover el "/" del contenido
      const contentWithoutSlash = content.replace(/\/$/, "");
      setContent(contentWithoutSlash);
      onUpdate({
        ...block,
        content: contentWithoutSlash,
      });
      // Disparar el diálogo de imagen
      setTimeout(() => onAddImage(), 0);
      return;
    }

    if (action.type === "insert-video") {
      setShowSlashMenu(false);
      // Remover el "/" del contenido
      const contentWithoutSlash = content.replace(/\/$/, "");
      setContent(contentWithoutSlash);
      onUpdate({
        ...block,
        content: contentWithoutSlash,
      });
      // Disparar el diálogo de video
      setTimeout(() => onAddVideo(), 0);
      return;
    }

    // Manejar comandos de formato
    // Remover el "/" del contenido
    const contentWithoutSlash = content.replace(/\/$/, "");

    const newContent = action.text ? contentWithoutSlash + action.text : contentWithoutSlash;
    const newFormat = action.format || format;
    const newListType = action.listType || listType;

    setContent(newContent);
    setFormat(newFormat);
    setListType(newListType);
    setShowSlashMenu(false);

    // Actualizar el bloque
    onUpdate({
      ...block,
      content: newContent,
      format: newFormat,
      listType: newListType,
    });

    // Focus en el textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const pos = newContent.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleSave = () => {
    onUpdate({
      ...block,
      content,
      format,
      listType,
    });
  };

  const getNormalizeStyles = () => {
    switch (format) {
      case "h1":
        return "text-2xl font-bold";
      case "h2":
        return "text-xl font-bold";
      case "h3":
        return "text-lg font-bold";
      case "quote":
        return "pl-4 border-l-4 border-blue-500 italic text-gray-600";
      case "code":
        return "font-mono bg-gray-100 p-2 rounded text-sm";
      default:
        return "text-base";
    }
  };

  return (
    <Box className={styles.blockContainer}>
      <Group justify="space-between" mb="xs">
        <Badge size="lg" variant="light">
          {format === "h1" && "H1"}
          {format === "h2" && "H2"}
          {format === "h3" && "H3"}
          {format === "quote" && "Cita"}
          {format === "code" && "Código"}
          {format === "plain" && listType === "bullet" && "Lista"}
          {format === "plain" && listType === "ordered" && "Lista"}
          {format === "plain" && listType === "none" && "Texto"}
        </Badge>

        <Group gap="xs">
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon size="sm" variant="subtle">
                <Text size="lg">⋯</Text>
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={onAddImage}>
                <Group gap="xs">
                  <IconPhoto size={16} />
                  <span>Agregar imagen</span>
                </Group>
              </Menu.Item>
              <Menu.Item onClick={onAddVideo}>
                <Group gap="xs">
                  <IconVideo size={16} />
                  <span>Agregar video</span>
                </Group>
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <ActionIcon
            color="red"
            variant="subtle"
            size="sm"
            onClick={onDelete}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Box pos="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleChange(e.currentTarget.value)}
          onKeyDown={(e) => {
            // Si hay prop onKeyDown personalizado (para Enter crear bloques), llamarlo
            if (onKeyDown) {
              onKeyDown(e);
            }
          }}
          onBlur={handleSave}
          placeholder="Escribe '/' para ver opciones..."
          minRows={2}
          maxRows={8}
          className={getNormalizeStyles()}
          styles={{
            input: {
              fontSize: format === "h1" ? "1.875rem" : 
                      format === "h2" ? "1.25rem" : 
                      format === "h3" ? "1.125rem" : "1rem",
              fontWeight: ["h1", "h2", "h3"].includes(format) ? "bold" : "normal",
              fontStyle: format === "quote" ? "italic" : "normal",
              paddingLeft: format === "quote" ? "1rem" : undefined,
              borderLeftWidth: format === "quote" ? "4px" : undefined,
              borderLeftColor: format === "quote" ? "#3b82f6" : undefined,
              fontFamily: format === "code" ? "monospace" : "inherit",
              backgroundColor: format === "code" ? "#f3f4f6" : undefined,
              padding: format === "code" ? "0.5rem" : undefined,
              borderRadius: format === "code" ? "0.375rem" : undefined,
            },
          }}
        />

        {/* Menú de comandos slash */}
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
                    onClick={() => handleCommandSelect(command)}
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
      </Box>
    </Box>
  );
}
