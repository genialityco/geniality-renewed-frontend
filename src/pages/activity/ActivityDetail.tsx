import { useParams, useSearchParams } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Card,
  Flex,
  Paper,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { Activity } from "../../services/types";
import { fetchActivityById } from "../../services/activityService";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const secsString = secs < 10 ? `0${secs}` : secs.toString();
  return `${mins}:${secsString}`;
}

const ActivityDetail: React.FC = () => {
  const { activityId } = useParams<{ activityId: string }>();
  const [searchParams] = useSearchParams();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [videoTime, setVideoTime] = useState<number | null>(null);
  const [fragments, setFragments] = useState<
    { startTime: number; text: string }[]
  >([]);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!activityId) return;
      const response = await fetchActivityById(activityId);
      setActivity(response);
    };
    fetchActivity();
  }, [activityId]);

  useEffect(() => {
    const timeParam = searchParams.get("t");
    if (timeParam) {
      setVideoTime(parseFloat(timeParam));
    }
    const fragmentsParam = searchParams.get("fragments");
    if (fragmentsParam) {
      setFragments(JSON.parse(decodeURIComponent(fragmentsParam)));
    }
  }, [searchParams]);

  if (!activity) {
    return (
      <Text ta="center" size="lg" color="gray">
        Cargando actividad...
      </Text>
    );
  }

  const vimeoId = activity.video ? activity.video.split("/").pop() : null;

  return (
    <Container>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack p="md">
          <Title order={2} ta="center">
            {activity.name}
          </Title>
          <Text size="sm" c="dimmed" ta="center">
            408k vistas • hace 1 año
          </Text>
          {vimeoId && (
            <Paper shadow="xs" radius="md" withBorder>
              <iframe
                width="100%"
                height="400"
                src={`https://player.vimeo.com/video/${vimeoId}${
                  videoTime !== null ? `#t=${videoTime}s` : ""
                }`}
                frameBorder="0"
                allow="autoplay; fullscreen"
                allowFullScreen
              ></iframe>
            </Paper>
          )}
          <Text ta="justify">{activity.description}</Text>
        </Stack>
      </Card>

      {fragments.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" withBorder mt="lg">
          <Title order={4} mb="md">
            Fragmentos encontrados
          </Title>
          <Flex direction="column" gap="xs">
            {fragments.map((fragment, index) => (
              <Button
                key={index}
                variant="light"
                color="blue"
                onClick={() => setVideoTime(fragment.startTime)}
                style={{ textAlign: "left" }}
              >
                ⏳ {formatTime(fragment.startTime)} - {fragment.text}
              </Button>
            ))}
          </Flex>
        </Card>
      )}
    </Container>
  );
};

export default ActivityDetail;
