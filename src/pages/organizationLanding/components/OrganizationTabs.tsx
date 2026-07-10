import { Tabs, Badge, Group, Text, Box } from "@mantine/core";
import { IconBook, IconVideo, IconStar, IconMessage } from "@tabler/icons-react";
import EventsGrid from "./EventsGrid";
import ActivitiesGrid from "./ActivitiesGrid";
import { Event } from "../../../services/types";

type ActivityTabProps = {
  activities: any[];
  searchResults: any[];
  searchQuery: string;
  searchPagedResults: any[];
  searchActivities: any[];
  activityPage: number;
  activityTotal: number;
  activityLimit: number;
  onPageChange: (page: number) => void;
  searching: boolean;
  organizationId: string;
  userId: string;
  userName: string;
  onActivityClick: (activityId: string, t?: number) => void;
  onFragmentClick: (
    activityId: string,
    startTime: number,
    matchedSegments: any[]
  ) => void;
  onEventClick: (eventId: string) => void;
};

interface TabTitles {
  courses?: string;
  activities?: string;
  exclusive?: string;
}

export default function OrganizationTabs({
  activeTab,
  setActiveTab,
  eventSearchMode,
  eventSearchResults,
  events,
  handleCourseClick,
  memberShipStatus,
  activityTabProps,
  tabTitles,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  eventSearchMode: boolean;
  eventSearchResults: Event[];
  events: Event[];
  handleCourseClick: (id: string) => void;
  memberShipStatus?: boolean;
  activityTabProps: ActivityTabProps;
  tabTitles?: TabTitles;
}) {
  const exclusiveEvents = events.filter(
    (event) => event.visibility === "EXCLUSIVE_FOR_MEMBERS"
  );
  const regularEvents = events.filter(
    (event) => event.visibility !== "EXCLUSIVE_FOR_MEMBERS"
  );
  const filteredSearchResults = eventSearchResults.filter(
    (event) => event.visibility !== "EXCLUSIVE_FOR_MEMBERS"
  );
  const visibleEventCount = eventSearchMode
    ? filteredSearchResults.length
    : regularEvents.length;

  // Usar títulos personalizados o valores por defecto
  const coursesLabel = tabTitles?.courses || "CURSOS";
  const activitiesLabel = tabTitles?.activities || "ACTIVIDADES";
  const exclusiveLabel = tabTitles?.exclusive || "MIEMBROS ACE";

  return (
    <Box px={{ base: "sm", md: "xl" }} py="md">
      <Tabs
        value={activeTab}
        onChange={(value) => {
          if (value) setActiveTab(value);
        }}
      >
        <Tabs.List mb="md">
          <Tabs.Tab
            value="courses"
            leftSection={<IconBook size={16} />}
          >
            <Group gap={6}>
              <Text size="sm">{coursesLabel}</Text>
              <Badge size="xs" variant="light" color="blue" radius="xl">
                {visibleEventCount}
              </Badge>
            </Group>
          </Tabs.Tab>

          <Tabs.Tab
            value="activities"
            leftSection={<IconVideo size={16} />}
          >
            <Group gap={6}>
              <Text size="sm">{activitiesLabel}</Text>
              <Badge size="xs" variant="light" color="blue" radius="xl">
                {activityTabProps.activityTotal}
              </Badge>
            </Group>
          </Tabs.Tab>

          {memberShipStatus && (
            <Tabs.Tab
              value="exclusive"
              leftSection={<IconStar size={16} />}
            >
              <Group gap={6}>
                <Text size="sm">{exclusiveLabel}</Text>
                <Badge size="xs" variant="light" color="orange" radius="xl">
                  {exclusiveEvents.length}
                </Badge>
              </Group>
            </Tabs.Tab>
          )}

          {memberShipStatus && (
            <Tabs.Tab
              value="chat"
              leftSection={<IconMessage size={16} />}
            >
              <Text size="sm">Chat</Text>
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="courses">
          <EventsGrid
            events={eventSearchMode ? filteredSearchResults : regularEvents}
            onClick={handleCourseClick}
            memberShipStatus={memberShipStatus}
          />
        </Tabs.Panel>

        {memberShipStatus && (
          <Tabs.Panel value="exclusive">
            <EventsGrid
              events={exclusiveEvents}
              onClick={handleCourseClick}
              memberShipStatus={memberShipStatus}
            />
          </Tabs.Panel>
        )}

        {memberShipStatus && (
          <Tabs.Panel value="chat">
            <Box p="md">
              <iframe
                src={`${import.meta.env.VITE_WIDGET_BASE_URL}/widget/gencampus?api_key=${import.meta.env.VITE_WIDGET_API_KEY}&user_id=${activityTabProps.userId}&user_name=${encodeURIComponent(activityTabProps.userName)}&org_id=${activityTabProps.organizationId}`}
                width="100%"
                height="600"
                frameBorder="0"
                style={{ borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,.15)" }}
                title="Chat"
              />
            </Box>
          </Tabs.Panel>
        )}

        <Tabs.Panel value="activities">
          <ActivitiesGrid
            {...activityTabProps}
            onActivityClick={activityTabProps.onActivityClick}
            onFragmentClick={activityTabProps.onFragmentClick}
            onEventClick={activityTabProps.onEventClick}
          />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
