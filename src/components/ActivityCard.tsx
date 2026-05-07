import { useNavigate } from "react-router-dom";
import {
  Box,
  Image,
  Text,
  Group,
  Highlight,
  UnstyledButton,
} from "@mantine/core";
import { IconClock } from "@tabler/icons-react";
import { Activity } from "../services/types";
import { useEffect, useState } from "react";

const ACTIVITY_PLACEHOLDER =
  "https://placehold.co/120x120/e9ecef/adb5bd?text=·";

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
  onEventClick?: (eventId: string) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
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

  let eventImage = ACTIVITY_PLACEHOLDER;
  if (typeof activity.event_id === "object" && activity.event_id !== null) {
    const ev = activity.event_id as any;
    eventImage =
      ev.picture ||
      ev.styles?.event_image ||
      ev.styles?.banner_image ||
      ACTIVITY_PLACEHOLDER;
  }

  const [imgSrc, setImgSrc] = useState<string>(eventImage);
  useEffect(() => setImgSrc(eventImage), [activity._id]);

  const eventName =
    typeof activity.event_id === "object" &&
    activity.event_id !== null &&
    "name" in activity.event_id
      ? (activity.event_id as any).name
      : null;

  const eventId =
    typeof activity.event_id === "object" && activity.event_id !== null
      ? (activity.event_id as any)._id || (activity.event_id as any).id
      : null;

  const goToActivity = () => {
    if (onCardClick) onCardClick(activity._id);
    else {
      navigate(
        `/organization/${organizationId}/activitydetail/${activity._id}`,
      );
    }
  };

  const goToEvent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!eventId) return;
    if (onEventClick) onEventClick(eventId);
    else navigate(`/organization/${organizationId}/course/${eventId}`);
  };

  return (
    <Box
      onClick={goToActivity}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderRadius: 8,
        cursor: "pointer",
        border: "1px solid #e9ecef",
        backgroundColor: "#fff",
        transition: "background 0.15s, box-shadow 0.15s",
        height: 230, // altura fija para todas
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f8f9fa";
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 2px 8px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fff";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
      }}
    >
      <Image
        src={imgSrc}
        alt={activity.name}
        fit="cover"
        radius={6}
        loading="lazy"
        onError={() => setImgSrc(ACTIVITY_PLACEHOLDER)}
        style={{ width: 72, height: 72, flexShrink: 0, objectFit: "cover" }}
      />

      <Box
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box>
          <Text fw={600} size="sm" lineClamp={2} style={{ lineHeight: 1.35 }}>
            {activity.name}
          </Text>

          {eventName && (
            <Text
              size="xs"
              c="blue"
              mt={3}
              lineClamp={1}
              style={{
                cursor: "pointer",
                textDecoration: "underline",
                width: "fit-content",
              }}
              onClick={goToEvent}
            >
              {eventName}
            </Text>
          )}
        </Box>

        <Box style={{ flex: 1, minHeight: 0 }}>
          {matchedSegments.length > 0 && (
            <Box
              mt={8}
              style={{
                borderTop: "1px solid #f1f3f5",
                paddingTop: 6,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <Text size="xs" fw={600} c="dimmed" mb={3}>
                Fragmentos:
              </Text>

              <Box style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
                {matchedSegments.map((seg) => (
                  <UnstyledButton
                    key={seg.segmentId}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onFragmentClick) {
                        onFragmentClick(seg);
                      } else {
                        navigate(
                          `/organization/${organizationId}/activitydetail/${activity._id}?t=${seg.startTime}` +
                            `&fragments=${encodeURIComponent(
                              JSON.stringify(matchedSegments),
                            )}`,
                        );
                      }
                    }}
                    style={{ width: "100%" }}
                  >
                    <Box px={4} py={3} mb={1} style={{ borderRadius: 4 }}>
                      <Group gap={4} mb={1}>
                        <IconClock size={11} color="#74c0fc" />
                        <Text size="xs" c="blue" fw={500}>
                          {formatTime(seg.startTime)} –{" "}
                          {formatTime(seg.endTime)}
                        </Text>
                      </Group>

                      <Highlight
                        highlight={searchQuery || ""}
                        size="xs"
                        c="dimmed"
                        lineClamp={2}
                      >
                        {seg.text}
                      </Highlight>
                    </Box>
                  </UnstyledButton>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ActivityCard;
