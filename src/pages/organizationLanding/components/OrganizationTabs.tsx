import { Tabs, Badge, Group, Text, Box } from "@mantine/core";
import { IconBook, IconVideo, IconStar } from "@tabler/icons-react";
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
  onActivityClick: (activityId: string, t?: number) => void;
  onFragmentClick: (
    activityId: string,
    startTime: number,
    matchedSegments: any[]
  ) => void;
  onEventClick: (eventId: string) => void;
};

export default function OrganizationTabs({
  activeTab,
  setActiveTab,
  eventSearchMode,
  eventSearchResults,
  events,
  handleCourseClick,
  memberShipStatus,
  activityTabProps,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  eventSearchMode: boolean;
  eventSearchResults: Event[];
  events: Event[];
  handleCourseClick: (id: string) => void;
  memberShipStatus?: boolean;
  activityTabProps: ActivityTabProps;
}) {
  const exclusiveEvents = events.filter(
    (event) => event.visibility === "EXCLUSIVE_FOR_MEMBERS"
  );
  const visibleEventCount = eventSearchMode
    ? eventSearchResults.length
    : events.length;

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
              <Text size="sm">Cursos</Text>
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
              <Text size="sm">Actividades</Text>
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
                <Text size="sm">Exclusivo miembros</Text>
                <Badge size="xs" variant="light" color="orange" radius="xl">
                  {exclusiveEvents.length}
                </Badge>
              </Group>
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="courses">
          <EventsGrid
            events={eventSearchMode ? eventSearchResults : events}
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
