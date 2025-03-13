import { useNavigate } from "react-router-dom";
import {
  Card,
  Image,
  Text,
  Title,
  Grid,
  Flex,
  Button,
  Highlight,
} from "@mantine/core";
import { Activity } from "../services/types";
import { generateTranscript } from "../services/activityService";
import { useState } from "react";

interface MatchedSegment {
  segmentId: string;
  text: string;
  startTime: number;
  endTime: number;
  score?: number;
}

interface ActivityCardProps {
  activity: Activity;
  matchedSegments?: MatchedSegment[];
  searchQuery?: string;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const secsString = secs < 10 ? `0${secs}` : secs.toString();
  return `${mins}:${secsString}`;
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  matchedSegments = [],
  searchQuery,
}) => {
  const navigate = useNavigate();
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  const vimeoId = activity.video ? activity.video.split("/").pop() : null;
  const thumbnail = vimeoId
    ? `https://vumbnail.com/${vimeoId}.jpg`
    : "https://via.placeholder.com/160x160?text=No+Video";

  const handleClickCard = (activityId: string) => {
    navigate(`/activitydetail/${activityId}`);
  };

  const handleGenerateTranscript = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    activityId: string
  ) => {
    event.stopPropagation();
    try {
      setLoadingTranscript(true);
      const result = await generateTranscript(activityId);
      console.log("Transcripción generada:", result);
    } catch (error) {
      console.error("Error al generar la transcripción:", error);
    } finally {
      setLoadingTranscript(false);
    }
  };

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      withBorder
      style={{ position: "relative", cursor: "pointer" }}
      onClick={() => handleClickCard(activity._id)}
    >
      <Grid gutter="md" align="center">
        <Grid.Col span={4}>
          <Image
            src={thumbnail}
            alt={activity.name}
            radius="md"
            height="auto"
            width="100%"
            fit="cover"
            loading="lazy"
          />
          <Button
            loading={loadingTranscript}
            onClick={(event) => handleGenerateTranscript(event, activity._id)}
            mt="xs"
          >
            G-Transcript
          </Button>
        </Grid.Col>

        <Grid.Col span={8}>
          <Flex direction="column" justify="space-between">
            <Title order={4}>{activity.name}</Title>
            <Text size="sm" c="dimmed">
              408k vistas • hace 1 año
            </Text>
            <Text size="sm" variant="gradient">
              Curso: {activity.event_id?.name || "Sin evento asignado"}
            </Text>
            {matchedSegments.length > 0 && (
              <div style={{ textAlign: "left", marginTop: "1rem" }}>
                <Text size="sm" fw="bold" mb="xs">
                  Fragmentos que coinciden:
                </Text>

                <div
                  style={{
                    maxHeight: 150,
                    overflowY: "auto",
                    paddingRight: 8,
                  }}
                >
                  {matchedSegments.map((seg) => (
                    <div
                      key={seg.segmentId}
                      style={{ marginBottom: 4, cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(
                          `/activitydetail/${activity._id}?t=${seg.startTime}&fragments=${encodeURIComponent(
                            JSON.stringify(matchedSegments)
                          )}`
                        );
                      }}
                    >
                      <Text size="sm">
                        <strong style={{ color: "teal" }}>
                          {formatTime(seg.startTime)} - {formatTime(seg.endTime)}:
                        </strong>{" "}
                        <Highlight highlight={searchQuery || ""} component="span">
                          {seg.text}
                        </Highlight>
                      </Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Flex>
        </Grid.Col>
      </Grid>
    </Card>
  );
};

export default ActivityCard;
