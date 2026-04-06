import { useEffect, useState } from "react";
import {
  Accordion,
  Badge,
  Box,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconFileText } from "@tabler/icons-react";
import {
  fetchSegmentsByActivityId,
  TranscriptSegment,
} from "../services/transcriptSegmentsService";

interface Props {
  activityId: string;
  onSeek: (startTime: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function ActivityTranscript({ activityId, onSeek }: Props) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSegmentsByActivityId(activityId)
      .then((data) => {
        const sorted = [...data].sort((a, b) => a.startTime - b.startTime);
        setSegments(sorted);
      })
      .catch(() => setSegments([]))
      .finally(() => setLoading(false));
  }, [activityId]);

  if (loading) {
    return (
      <Group mt="xs" gap="xs">
        <Loader size="xs" />
        <Text size="sm" c="dimmed">
          Cargando transcripción...
        </Text>
      </Group>
    );
  }

  if (!segments.length) return null;

  const totalDuration = segments[segments.length - 1]?.endTime ?? 0;

  return (
    <Accordion variant="contained" radius="md">
      <Accordion.Item value="transcript">
        <Accordion.Control icon={<IconFileText size={18} />}>
          <Group justify="space-between" pr="md" wrap="nowrap">
            <Text fw={600} size="sm">
              Transcripción del video
            </Text>
            <Text size="xs" c="dimmed">
              {segments.length} segmentos · {formatTime(totalDuration)} min
            </Text>
          </Group>
        </Accordion.Control>
        <Accordion.Panel p={0}>
          <ScrollArea h={380} offsetScrollbars px="xs" pb="xs">
            <Stack gap={2}>
              {segments.map((seg) => (
                <UnstyledButton
                  key={seg._id}
                  onClick={() => onSeek(seg.startTime)}
                  style={{ width: "100%", borderRadius: 6 }}
                >
                  <Box
                    px="sm"
                    py={8}
                    style={(theme) => ({
                      borderRadius: 6,
                      "&:hover": {
                        backgroundColor: theme.colors.blue[0],
                      },
                    })}
                  >
                    <Group align="flex-start" gap="sm" wrap="nowrap">
                      <Badge
                        variant="light"
                        color="blue"
                        size="sm"
                        style={{
                          minWidth: 48,
                          flexShrink: 0,
                          fontVariantNumeric: "tabular-nums",
                          cursor: "pointer",
                        }}
                      >
                        {formatTime(seg.startTime)}
                      </Badge>
                      <Text
                        size="sm"
                        style={{ lineHeight: 1.65, textAlign: "left" }}
                      >
                        {seg.text}
                      </Text>
                    </Group>
                  </Box>
                </UnstyledButton>
              ))}
            </Stack>
          </ScrollArea>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
