import {
  Button,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  NumberInput,
  ActionIcon,
  Badge,
} from "@mantine/core";
import { FaPlus, FaTrash } from "react-icons/fa6";
import { VideoItem, VideoProvider, VideoStatus } from "../../services/types";
import { providerLabel } from "../../utils/videoEmbed";

interface Props {
  videos: VideoItem[];
  onChange: (videos: VideoItem[]) => void;
}

const PROVIDER_OPTIONS: { value: VideoProvider; label: string }[] = [
  { value: "vimeo", label: "Vimeo" },
  { value: "bunny", label: "Bunny" },
];

const STATUS_OPTIONS: { value: VideoStatus; label: string }[] = [
  { value: "active", label: "Activo" },
  { value: "inactive", label: "Inactivo" },
  { value: "processing", label: "Procesando" },
  { value: "error", label: "Error" },
];

function emptyVideo(priority: number): VideoItem {
  return {
    provider: "vimeo",
    video_id: "",
    priority,
    status: "active",
    meta: {},
  };
}

export default function ActivityVideosEditor({ videos, onChange }: Props) {
  const updateVideo = (index: number, patch: Partial<VideoItem>) => {
    const next = videos.map((v, i) => (i === index ? { ...v, ...patch } : v));
    onChange(next);
  };

  const updateMeta = (index: number, metaPatch: Record<string, any>) => {
    const next = videos.map((v, i) =>
      i === index ? { ...v, meta: { ...v.meta, ...metaPatch } } : v
    );
    onChange(next);
  };

  const addVideo = () => {
    onChange([...videos, emptyVideo(videos.length + 1)]);
  };

  const removeVideo = (index: number) => {
    onChange(videos.filter((_, i) => i !== index));
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Text fw={500} size="sm">
          Fuentes de video
        </Text>
        <Button
          size="xs"
          variant="light"
          leftSection={<FaPlus size={12} />}
          onClick={addVideo}
        >
          Agregar video
        </Button>
      </Group>

      {!videos.length && (
        <Text size="xs" c="dimmed">
          No hay videos configurados. Agrega al menos uno (Vimeo o Bunny).
        </Text>
      )}

      {videos.map((video, index) => (
        <Paper key={index} withBorder p="sm" radius="md">
          <Stack gap="xs">
            <Group justify="space-between">
              <Badge variant="light">{providerLabel(video.provider)}</Badge>
              <ActionIcon
                color="red"
                variant="subtle"
                size="sm"
                onClick={() => removeVideo(index)}
                title="Quitar video"
              >
                <FaTrash size={14} />
              </ActionIcon>
            </Group>

            <Group grow>
              <Select
                label="Proveedor"
                data={PROVIDER_OPTIONS}
                value={video.provider}
                onChange={(value) =>
                  value &&
                  updateVideo(index, {
                    provider: value as VideoProvider,
                    meta: {},
                  })
                }
                allowDeselect={false}
              />
              <TextInput
                label="Video ID"
                required
                placeholder={
                  video.provider === "vimeo" ? "Ej: 897778483" : "Ej: 53b33e48-..."
                }
                value={video.video_id}
                onChange={(e) =>
                  updateVideo(index, { video_id: e.currentTarget.value })
                }
              />
            </Group>

            {video.provider === "bunny" && (
              <>
                <TextInput
                  label="Library ID (Bunny)"
                  required
                  placeholder="Ej: 747699"
                  value={video.meta?.library_id || ""}
                  onChange={(e) =>
                    updateMeta(index, { library_id: e.currentTarget.value })
                  }
                />
                <TextInput
                  label="URL de miniatura (opcional)"
                  description="Bunny no permite derivarla solo del Library ID/Video ID; pega aquí la URL de thumbnail.jpg del video (Bunny Stream > video > Thumbnail)"
                  placeholder="https://xxxx.b-cdn.net/{video_id}/thumbnail.jpg"
                  value={video.meta?.thumbnail_url || ""}
                  onChange={(e) =>
                    updateMeta(index, { thumbnail_url: e.currentTarget.value })
                  }
                />
              </>
            )}

            {video.provider === "vimeo" && (
              <TextInput
                label="Hash (opcional, para videos no listados)"
                placeholder="Ej: 95d3ec7158"
                value={video.meta?.hash || ""}
                onChange={(e) => updateMeta(index, { hash: e.currentTarget.value })}
              />
            )}

            <Group grow>
              <NumberInput
                label="Prioridad"
                value={video.priority}
                min={0}
                onChange={(value) =>
                  updateVideo(index, { priority: Number(value) || 0 })
                }
              />
              <Select
                label="Estado"
                data={STATUS_OPTIONS}
                value={video.status}
                onChange={(value) =>
                  value && updateVideo(index, { status: value as VideoStatus })
                }
                allowDeselect={false}
              />
            </Group>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
