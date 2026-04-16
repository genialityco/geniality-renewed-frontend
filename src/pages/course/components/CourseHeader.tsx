import { Stack, Flex, Title, Divider, Burger } from "@mantine/core";
import { FaArrowLeft } from "react-icons/fa6";
import { Event } from "../../../services/types";

interface CourseHeaderProps {
  event: Event | null;
  opened: boolean;
  onToggle: () => void;
  onBack: () => void;
  onHomeClick: () => void;
  isMobile: boolean;
}

export function CourseHeader({
  event,
  opened,
  onToggle,
  onBack,
  onHomeClick,
  isMobile = false,
}: CourseHeaderProps) {
  if (!event) return null;

  const eventImage = event.styles?.event_image;

  if (isMobile) {
    return (
      <Stack gap={0} style={{ height: "100%", padding: "8px 12px" }}>
        <Flex align="center" gap="xs">
          <Burger opened={opened} onClick={onToggle} size="sm" />
          <img
            src={eventImage}
            alt="Evento"
            onClick={onHomeClick}
            style={{
              cursor: "pointer",
              maxHeight: 44,
              maxWidth: "100%",
              objectFit: "contain",
              flex: 1,
            }}
          />
        </Flex>
        <Flex align="center" gap="xs" pt={4}>
          <FaArrowLeft
            size={16}
            style={{ cursor: "pointer", flexShrink: 0, color: "#495057" }}
            onClick={onBack}
          />
          <Title
            order={5}
            style={{
              fontSize: "clamp(12px, 3vw, 15px)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "#212529",
            }}
          >
            {event.name}
          </Title>
        </Flex>
      </Stack>
    );
  }

  return (
    <Flex
      align="center"
      gap="md"
      style={{ height: "100%", padding: "0 20px" }}
    >
      <Burger
        opened={opened}
        onClick={onToggle}
        size="sm"
        onMouseEnter={() => !opened && onToggle()}
      />
      <img
        src={eventImage}
        alt="Evento"
        onClick={onHomeClick}
        style={{
          cursor: "pointer",
          maxHeight: 44,
          maxWidth: 130,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
      <Divider orientation="vertical" />
      <Flex align="center" gap="sm" style={{ flex: 1, minWidth: 0 }}>
        <FaArrowLeft
          size={16}
          style={{ cursor: "pointer", flexShrink: 0, color: "#495057" }}
          onClick={onBack}
        />
        <Title
          order={5}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "#212529",
          }}
        >
          {event.name}
        </Title>
      </Flex>
    </Flex>
  );
}
