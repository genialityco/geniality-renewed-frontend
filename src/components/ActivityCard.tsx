import { useNavigate } from "react-router-dom";
import { Card, Image, Text, Title, Grid, Flex, Highlight } from "@mantine/core";
import { Activity } from "../services/types";
import { useEffect, useState } from "react";

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
  organizationId: string;
  onCardClick?: (activityId: string) => void;
  onFragmentClick?: (seg: MatchedSegment) => void;
  onEventClick?: (eventId: string) => void; // 👈 Nuevo
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
  organizationId,
  onCardClick,
  onFragmentClick,
  onEventClick,
}) => {
  const navigate = useNavigate();

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Imagen
  let eventImage: string = "https://via.placeholder.com/160x160?text=No+Video";
  if (typeof activity.event_id === "object" && activity.event_id !== null) {
    const eventObj = activity.event_id as any;
    eventImage =
      eventObj.picture ||
      eventObj.styles?.event_image ||
      eventObj.styles?.banner_image ||
      eventImage;
  }
  const [_imgSrc, setImgSrc] = useState<string>(eventImage);
  useEffect(() => setImgSrc(eventImage), [activity._id]);

  const fallbackGoToActivity = (activityId: string) => {
    navigate(`/organization/${organizationId}/activitydetail/${activityId}`);
  };

  const fallbackGoToEvent = (eventId: string) => {
    navigate(`/organization/${organizationId}/course/${eventId}`);
  };

  return (
    <Card
      shadow="sm"
      radius="xs"
      withBorder
      style={{ position: "relative", cursor: "pointer" }}
      onClick={() =>
        onCardClick
          ? onCardClick(activity._id)
          : fallbackGoToActivity(activity._id)
      }
    >
      <Grid gutter="md" align="center">
        <Grid.Col span={4}>
          <Image
            src={_imgSrc}
            alt={activity.name}
            radius="xs"
            height="auto"
            width="100%"
            fit="contain"
            loading="lazy"
            onError={() =>
              setImgSrc("https://via.placeholder.com/160x160?text=No+Video")
            }
          />
        </Grid.Col>

        <Grid.Col span={8}>
          <Flex direction="column" ta="left" justify="space-between">
            <Title order={4}>{activity.name}</Title>

            <Text size="sm" variant="gradient">
              Evento:{" "}
              {typeof activity.event_id === "object" &&
              activity.event_id !== null &&
              "name" in activity.event_id ? (
                <span
                  style={{
                    color: "#228be6",
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const eventId =
                      (activity.event_id as any)._id ||
                      (activity.event_id as any).id ||
                      "";
                    if (!eventId) return;
                    if (onEventClick) {
                      onEventClick(eventId); // 👈 El padre decide (modal o navegar)
                    } else {
                      fallbackGoToEvent(eventId); // fallback directo
                    }
                  }}
                >
                  {(activity.event_id as any).name}
                </span>
              ) : (
                "Sin evento asignado"
              )}
            </Text>

            {matchedSegments.length > 0 && (
              <div style={{ textAlign: "left", marginTop: "1rem" }}>
                <Text size="sm" fw="bold" mb="xs">
                  Fragmentos que coinciden:
                </Text>

                <div
                  style={{ maxHeight: 150, overflowY: "auto", paddingRight: 8 }}
                >
                  {matchedSegments.map((seg) => (
                    <div
                      key={seg.segmentId}
                      style={{
                        marginBottom: 5,
                        cursor: "pointer",
                        padding: 4,
                        borderRadius: 4,
                        backgroundColor:
                          seg.segmentId === selectedId
                            ? "rgba(45,212,191,0.2)"
                            : seg.segmentId === hoveredId
                            ? "rgba(45,212,191,0.1)"
                            : "transparent",
                        transition: "background-color 0.2s",
                      }}
                      onMouseEnter={() => setHoveredId(seg.segmentId)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(seg.segmentId);
                        if (onFragmentClick) {
                          onFragmentClick(seg); // 👈 El padre decide
                        } else {
                          navigate(
                            `/organization/${organizationId}/activitydetail/${activity._id}?t=${seg.startTime}` +
                              `&fragments=${encodeURIComponent(
                                JSON.stringify(matchedSegments)
                              )}`
                          );
                        }
                      }}
                    >
                      <Text size="sm">
                        <strong style={{ color: "teal" }}>
                          {formatTime(seg.startTime)} -{" "}
                          {formatTime(seg.endTime)}:
                        </strong>{" "}
                        <Highlight
                          highlight={searchQuery || ""}
                          component="span"
                        >
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
