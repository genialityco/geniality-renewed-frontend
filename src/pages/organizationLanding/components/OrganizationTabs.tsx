import { useEffect } from "react";
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

interface TabTitles {
  courses?: string;
  activities?: string;
  exclusive?: string;
}

interface TabVisibility {
  courses?: boolean;
  activities?: boolean;
  exclusive?: boolean;
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
  tabVisibility,
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
  tabVisibility?: TabVisibility;
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

  // Visibilidad de cada pestaña. Por defecto (sin config) todas activadas.
  // La pestaña exclusiva además requiere membresía activa.
  const showCourses = tabVisibility?.courses !== false;
  const showActivities = tabVisibility?.activities !== false;
  const showExclusive = memberShipStatus && tabVisibility?.exclusive !== false;

  // Si la pestaña activa quedó oculta, pasar a la primera pestaña visible.
  useEffect(() => {
    const isActiveVisible =
      (activeTab === "courses" && showCourses) ||
      (activeTab === "activities" && showActivities) ||
      (activeTab === "exclusive" && showExclusive);
    if (isActiveVisible) return;
    const firstVisible = showCourses
      ? "courses"
      : showActivities
        ? "activities"
        : showExclusive
          ? "exclusive"
          : null;
    if (firstVisible && firstVisible !== activeTab) {
      setActiveTab(firstVisible);
    }
  }, [activeTab, showCourses, showActivities, showExclusive, setActiveTab]);

  return (
    <Box px={{ base: "sm", md: "xl" }} py="md">
      <Tabs
        value={activeTab}
        onChange={(value) => {
          if (value) setActiveTab(value);
        }}
      >
        <Tabs.List mb="md">
          {showCourses && (
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
          )}

          {showActivities && (
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
          )}

          {showExclusive && (
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
        </Tabs.List>

        {showCourses && (
          <Tabs.Panel value="courses">
            <EventsGrid
              events={eventSearchMode ? filteredSearchResults : regularEvents}
              onClick={handleCourseClick}
              memberShipStatus={memberShipStatus}
            />
          </Tabs.Panel>
        )}

        {showExclusive && (
          <Tabs.Panel value="exclusive">
            <EventsGrid
              events={exclusiveEvents}
              onClick={handleCourseClick}
              memberShipStatus={memberShipStatus}
            />
          </Tabs.Panel>
        )}

        {showActivities && (
          <Tabs.Panel value="activities">
            <ActivitiesGrid
              {...activityTabProps}
              onActivityClick={activityTabProps.onActivityClick}
              onFragmentClick={activityTabProps.onFragmentClick}
              onEventClick={activityTabProps.onEventClick}
            />
          </Tabs.Panel>
        )}
      </Tabs>
    </Box>
  );
}
