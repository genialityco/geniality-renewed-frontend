import { useEffect, useState } from "react";
import {
  Stack,
  Textarea,
  Button,
  Group,
  Alert,
  Loader,
  Text,
  Box,
  Tabs,
  ActionIcon,
  Card,
  Badge,
} from "@mantine/core";
import { IconAlertCircle, IconCheck, IconTrash, IconPlus } from "@tabler/icons-react";
import {
  fetchCompletionMessagesByType,
  createCompletionMessage,
  updateCompletionMessage,
  deleteCompletionMessage,
  CompletionMessage,
  CompletionMessageType,
} from "../../../../services/completionMessagesService";

type Props = { organizationId: string };

const MESSAGE_TYPES = [
  {
    value: CompletionMessageType.MODULO_INICIO,
    label: "🚀 Inicio de Módulo",
    description: "Cuando empieza un nuevo módulo (primera actividad)",
  },
  {
    value: CompletionMessageType.MODULO_PROGRESO,
    label: "⏳ Progreso",
    description: "Cuando va avanzando en el módulo",
  },
  {
    value: CompletionMessageType.MODULO_FINAL,
    label: "🎉 Último Módulo Finalizado",
    description: "Cuando termina la última actividad del último módulo",
  },
];

const DEFAULT_MESSAGES: Record<CompletionMessageType, string> = {
  [CompletionMessageType.MODULO_INICIO]:
    "¡Bienvenido a este nuevo módulo! Esperamos que disfrutes el contenido.",
  [CompletionMessageType.MODULO_PROGRESO]:
    "¡Vas muy bien! Sigue con el siguiente video para continuar aprendiendo.",
  [CompletionMessageType.MODULO_FINAL]:
    "¡Felicidades! Has completado el último módulo. ¡Eres increíble!",
};

// Insertar variable en textarea
const insertVariable = (variable: string, inputState: [string, (val: string) => void]) => {
  const [value, setValue] = inputState;
  setValue(value + variable);
};

const VARIABLES = [
  { label: "Actividad", value: "{{activity_name}}" },
  { label: "Módulo", value: "{{module_name}}" },
  { label: "Curso", value: "{{course_name}}" },
  { label: "Restantes", value: "{{remaining}}" },
  { label: "Progreso", value: "{{progress}}" },
];

export default function CompletionMessagesForm({ organizationId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>(
    CompletionMessageType.MODULO_INICIO
  );

  const [messages, setMessages] = useState<Record<CompletionMessageType, CompletionMessage[]>>({
    [CompletionMessageType.MODULO_INICIO]: [],
    [CompletionMessageType.MODULO_PROGRESO]: [],
    [CompletionMessageType.MODULO_FINAL]: [],
  });

  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newMessageType, setNewMessageType] = useState<CompletionMessageType | null>(null);
  const [newMessageContent, setNewMessageContent] = useState("");

  // Cargar mensajes
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const results: Record<CompletionMessageType, CompletionMessage[]> = {
          [CompletionMessageType.MODULO_INICIO]: [],
          [CompletionMessageType.MODULO_PROGRESO]: [],
          [CompletionMessageType.MODULO_FINAL]: [],
        };

        for (const type of Object.values(CompletionMessageType)) {
          const msgs = await fetchCompletionMessagesByType(organizationId, type as CompletionMessageType);
          results[type as CompletionMessageType] = msgs;
        }

        setMessages(results);
      } catch (err) {
        console.error("Error loading completion messages:", err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [organizationId]);

  // Agregar nuevo mensaje - modo edición
  const handleStartNewMessage = (type: CompletionMessageType) => {
    setNewMessageType(type);
    setNewMessageContent(DEFAULT_MESSAGES[type]);
  };

  // Guardar nuevo mensaje
  const handleSaveNewMessage = async () => {
    if (!newMessageType) return;
    setSaving(true);
    setError(null);
    try {
      const newMessage = await createCompletionMessage({
        organization_id: organizationId,
        type: newMessageType,
        blocks: [
          {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: "paragraph",
            content: newMessageContent,
          },
        ],
        active: true,
        order: messages[newMessageType].length + 1,
      });

      setMessages((prev) => ({
        ...prev,
        [newMessageType]: [...prev[newMessageType], newMessage],
      }));

      setOk(`Nuevo mensaje agregado`);
      setNewMessageType(null);
      setNewMessageContent("");
    } catch (e: any) {
      setError(e?.message || "No se pudo agregar el mensaje");
    } finally {
      setSaving(false);
    }
  };

  // Actualizar mensaje
  const handleUpdateMessage = async (id: string, content: string, type: CompletionMessageType) => {
    setSaving(true);
    setError(null);
    try {
      await updateCompletionMessage(id, {
        blocks: [
          {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: "paragraph",
            content,
          },
        ],
      });

      setMessages((prev) => ({
        ...prev,
        [type]: prev[type].map((msg) =>
          msg._id === id
            ? {
                ...msg,
                blocks: [
                  {
                    id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    type: "paragraph",
                    content,
                  },
                ],
              }
            : msg
        ),
      }));

      setOk("Mensaje actualizado");
      setEditingMessage(null);
    } catch (e: any) {
      setError(e?.message || "No se pudo actualizar el mensaje");
    } finally {
      setSaving(false);
    }
  };

  // Eliminar mensaje
  const handleDeleteMessage = async (id: string, type: CompletionMessageType) => {
    setSaving(true);
    setError(null);
    try {
      await deleteCompletionMessage(id);
      setMessages((prev) => ({
        ...prev,
        [type]: prev[type].filter((msg) => msg._id !== id),
      }));
      setOk("Mensaje eliminado");
    } catch (e: any) {
      setError(e?.message || "No se pudo eliminar el mensaje");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <Stack gap="md">
      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
          {error}
        </Alert>
      )}
      {ok && (
        <Alert
          icon={<IconCheck size={16} />}
          color="green"
          variant="light"
          onClose={() => setOk(null)}
          withCloseButton
        >
          {ok}
        </Alert>
      )}

      <Alert color="blue" variant="light">
        <Text size="sm">
          Configura múltiples mensajes para cada situación. El sistema mostrará uno aleatoriamente.
          Si no hay mensajes configurados, se mostrará un mensaje por defecto.
        </Text>
      </Alert>

      <Tabs value={activeTab} onChange={setActiveTab} orientation="vertical">
        <Tabs.List>
          {MESSAGE_TYPES.map((type) => (
            <Tabs.Tab
              key={type.value}
              value={type.value}
            >
              <Group gap={8} wrap="nowrap">
                <Text size="sm">{type.label}</Text>
                <Badge size="xs" variant="dot" color="blue">
                  {messages[type.value as CompletionMessageType].length}
                </Badge>
              </Group>
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {MESSAGE_TYPES.map((type) => (
          <Tabs.Panel key={type.value} value={type.value}>
            <Stack gap="md">
              <Box>
                <Text fw={500} size="sm" mb={8}>
                  {type.label}
                </Text>
                <Text size="xs" c="dimmed" mb={12}>
                  {type.description}
                </Text>
              </Box>

              <Alert color="blue" variant="light">
                <Text size="xs">
                  <strong>Variables disponibles:</strong> {'{{activity_name}}'} - nombre de la actividad, {'{{module_name}}'} - nombre del módulo, {'{{remaining}}'} - actividades restantes, {'{{progress}}'} - porcentaje de progreso
                </Text>
              </Alert>

              {/* Lista de mensajes */}
              {messages[type.value as CompletionMessageType].map((msg) => (
                <Card key={msg._id} withBorder padding="md">
                  {editingMessage === msg._id ? (
                    <>
                      <Box mb="md">
                        <Text size="xs" fw={500} mb="xs">Variables:</Text>
                        <Group gap="xs" wrap="wrap">
                          {VARIABLES.map((v) => (
                            <Button
                              key={v.value}
                              variant="light"
                              size="xs"
                              onClick={() => insertVariable(v.value, [editContent, setEditContent])}
                            >
                              {v.label}
                            </Button>
                          ))}
                        </Group>
                      </Box>
                      <Textarea
                        label="Editar mensaje"
                        value={editContent}
                        onChange={(e) => setEditContent(e.currentTarget.value)}
                        autosize
                        minRows={3}
                        maxRows={6}
                        mb="md"
                      />
                      <Group justify="flex-end" gap="xs">
                        <Button
                          variant="light"
                          size="xs"
                          onClick={() => setEditingMessage(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="xs"
                          onClick={() =>
                            handleUpdateMessage(
                              msg._id!,
                              editContent,
                              type.value as CompletionMessageType
                            )
                          }
                          loading={saving}
                        >
                          Guardar
                        </Button>
                      </Group>
                    </>
                  ) : (
                    <>
                      <Text size="sm" mb={12}>
                        {msg.blocks[0]?.content || "Sin contenido"}
                      </Text>
                      <Group justify="flex-end" gap="xs">
                        <Button
                          variant="light"
                          size="xs"
                          onClick={() => {
                            setEditingMessage(msg._id!);
                            setEditContent(msg.blocks[0]?.content || "");
                          }}
                        >
                          Editar
                        </Button>
                        <ActionIcon
                          color="red"
                          variant="light"
                          size="sm"
                          onClick={() =>
                            handleDeleteMessage(msg._id!, type.value as CompletionMessageType)
                          }
                          loading={saving}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </>
                  )}
                </Card>
              ))}

              {/* Botón agregar o formulario nuevo */}
              {newMessageType === type.value ? (
                <Card withBorder padding="md" bg="blue.0">
                  <Stack gap="md">
                    <Box>
                      <Text size="xs" fw={500} mb="xs">Variables:</Text>
                      <Group gap="xs" wrap="wrap">
                        {VARIABLES.map((v) => (
                          <Button
                            key={v.value}
                            variant="light"
                            size="xs"
                            onClick={() => insertVariable(v.value, [newMessageContent, setNewMessageContent])}
                          >
                            {v.label}
                          </Button>
                        ))}
                      </Group>
                    </Box>
                    <Textarea
                      label="Nuevo mensaje"
                      value={newMessageContent}
                      onChange={(e) => setNewMessageContent(e.currentTarget.value)}
                      autosize
                      minRows={3}
                      maxRows={6}
                    />
                    <Group justify="flex-end" gap="xs">
                      <Button
                        variant="light"
                        size="sm"
                        onClick={() => {
                          setNewMessageType(null);
                          setNewMessageContent("");
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveNewMessage}
                        loading={saving}
                      >
                        Guardar
                      </Button>
                    </Group>
                  </Stack>
                </Card>
              ) : (
                <Button
                  variant="light"
                  leftSection={<IconPlus size={16} />}
                  onClick={() => handleStartNewMessage(type.value as CompletionMessageType)}
                  loading={saving}
                >
                  Agregar otro mensaje
                </Button>
              )}
            </Stack>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Stack>
  );
}
