import {
  SimpleGrid,
  Card,
  Stack,
  Box,
  ThemeIcon,
  Tooltip,
  Text,
  Badge,
  Image,
  Avatar,
  Group,
} from "@mantine/core";
import { FaCircleCheck, FaPause, FaPlay } from "react-icons/fa6";
import { Activity, Host } from "../services/types";
import { getActivityProgress } from "../services/activityAttendeeService";
import { useState, useEffect } from "react";

function getVimeoId(videoUrl: string | null | undefined): string | null {
  if (!videoUrl) return null;
  const match = videoUrl.match(/(?:vimeo\.com\/|video\/)(\d+)/);
  return match ? match[1] : null;
}

interface VimeoThumbnailProps {
  vimeoId: string;
  activityName: string;
}

function VimeoThumbnail({ vimeoId, activityName }: VimeoThumbnailProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    const fetchThumbnail = async () => {
      try {
        const response = await fetch(
          `https://vimeo.com/api/v2/video/${vimeoId}.json`
        );
        if (response.ok) {
          const data = await response.json();
          setThumbnail(data[0]?.thumbnail_large || data[0]?.thumbnail_url || null);
        }
      } catch (error) {
        console.error(`Error fetching Vimeo thumbnail for ${vimeoId}:`, error);
      }
    };

    if (vimeoId) {
      fetchThumbnail();
    }
  }, [vimeoId]);

  return thumbnail ? (
    <Image
      src={thumbnail}
      alt={activityName}
      fit="contain"
      style={{ width: "100%", height: "100%" }}
    />
  ) : null;
}

interface ActivityGridProps {
  activities: Activity[];
  activityAttendees?: any[];
  selectedActivityId?: string;
  onActivitySelect: (activity: Activity) => void;
  loading?: boolean;
  hosts?: Host[];
}

export default function ActivityGrid({
  activities,
  activityAttendees = [],
  selectedActivityId,
  onActivitySelect,
  loading = false,
  hosts = [],
}: ActivityGridProps) {
  if (loading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {[1, 2, 3].map((i) => (
          <Card key={i} h={620} />
        ))}
      </SimpleGrid>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="lg">
      {activities.map((activity, index) => {
        const progress =
          activityAttendees.length > 0
            ? getActivityProgress(activityAttendees, activity._id)
            : 0;
        const isDone = progress === 100;
        const inProgress = progress > 0 && progress < 100;
        const isSelected = selectedActivityId === activity._id;

        // Get hosts for this activity
        const activityHosts = hosts.filter((h) =>
          h.activities_ids?.includes(activity._id),
        );

        return (
          <Tooltip
            key={activity._id}
            label={activity.name}
            multiline
            w={200}
            position="bottom"
          >
            <Card
              onClick={() => onActivitySelect(activity)}
              style={{
                cursor: "pointer",
                border: isSelected ? "3px solid #667eea" : "1px solid #e0e0e0",
                transform: isSelected ? "scale(1.02)" : "scale(1)",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                height: "100%",
              }}
              withBorder
              radius="lg"
              shadow={isSelected ? "lg" : "sm"}
              p={0}
              mih={360}
              className="hover-lift"
            >
              {/* Thumbnail con video o color de fondo */}
              <Box
                style={{
                  position: "relative",
                  width: "100%",
                  height: 160,
                  backgroundColor: "#f0f0f0",
                  borderRadius:
                    "var(--mantine-radius-lg) var(--mantine-radius-lg) 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {/* Mostrar thumbnail de video si existe */}
                {activity.video && getVimeoId(activity.video) && (
                  <VimeoThumbnail
                    vimeoId={getVimeoId(activity.video)!}
                    activityName={activity.name}
                  />
                )}

                {/* Botón play siempre al centro */}
                <ThemeIcon
                  size="xl"
                  radius="xl"
                  variant="filled"
                  color="dark"
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "rgba(0,0,0,0.65)",
                    border: "2px solid rgba(255,255,255,0.35)",
                  }}
                >
                  <FaPlay size={16} style={{ marginLeft: 2 }} />
                </ThemeIcon>

                {/* Check abajo izquierda cuando ya está completada */}
                {isDone && (
                  <ThemeIcon
                    size="md"
                    radius="xl"
                    color="green"
                    variant="filled"
                    style={{
                      position: "absolute",
                      left: 8,
                      bottom: 8,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                    }}
                  >
                    <FaCircleCheck size={12} />
                  </ThemeIcon>
                )}

                {/* Pausa chiquita abajo derecha cuando está en progreso */}
                {inProgress && !isDone && (
                  <ThemeIcon
                    size="sm"
                    radius="xl"
                    color="yellow"
                    variant="filled"
                    style={{
                      position: "absolute",
                      right: 8,
                      bottom: 8,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                    }}
                  >
                    <FaPause size={9} />
                  </ThemeIcon>
                )}

                {/* Número de actividad */}
                <Box
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: "rgba(0, 0, 0, 0.8)",
                    color: "white",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {index + 1}
                </Box>
              </Box>

              {/* Content */}
              <Stack p="md" gap="xs" style={{ flex: 1, justifyContent: "space-between" }}>
                <div>
                  <Text
                    size="md"
                    fw={700}
                    style={{ color: isDone ? "#228be6" : "#212529", lineHeight: 1.4, wordWrap: "break-word" }}
                  >
                    {activity.name}
                  </Text>

                  {/* Conferencistas */}
                  {activityHosts.length > 0 && (
                    <Group gap={6} mt={8} wrap="wrap">
                      {activityHosts.slice(0, 2).map((host) => (
                        <Group key={host._id} gap={4} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                          <Avatar
                            src={host.image}
                            alt={host.name}
                            size={24}
                            radius="xl"
                            style={{ flexShrink: 0 }}
                          />
                          <Text size="xs" fw={500} lineClamp={1} style={{ lineHeight: 1.2 }}>
                            {host.name}
                          </Text>
                        </Group>
                      ))}
                      {activityHosts.length > 2 && (
                        <Badge size="xs" variant="light" radius="md">
                          +{activityHosts.length - 2}
                        </Badge>
                      )}
                    </Group>
                  )}

                  {activity.short_description && (
                    <Text
                      size="xs"
                      c="dimmed"
                      lineClamp={2}
                      mt={4}
                      style={{ lineHeight: 1.3 }}
                    >
                      {activity.short_description}
                    </Text>
                  )}
                </div>

                {/* Progress bar para In Progress */}
                {inProgress && (
                  <Box>
                    <Box
                      style={{
                        height: 6,
                        backgroundColor: "#e0e0e0",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        style={{
                          height: "100%",
                          width: `${progress}%`,
                          backgroundColor: "#f59f00",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </Box>
                    <Text size="xs" c="dimmed" mt={4} fw={500}>
                      {Math.round(progress)}% completado
                    </Text>
                  </Box>
                )}

                {/* Status badge */}
                <Box style={{ marginTop: "auto" }}>
                  {isDone && (
                    <Badge
                      size="sm"
                      color="green"
                      variant="filled"
                      w="fit-content"
                      radius="md"
                    >
                      ✓ Completada
                    </Badge>
                  )}
                  {inProgress && (
                    <Badge
                      size="sm"
                      color="yellow"
                      variant="filled"
                      w="fit-content"
                      radius="md"
                    >
                      ⏳ En progreso
                    </Badge>
                  )}
                  {!isDone && !inProgress && (
                    <Badge
                      size="sm"
                      color="gray"
                      variant="light"
                      w="fit-content"
                      radius="md"
                    >
                      Nuevo
                    </Badge>
                  )}
                </Box>
              </Stack>
            </Card>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
