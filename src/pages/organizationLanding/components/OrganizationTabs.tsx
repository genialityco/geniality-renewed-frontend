import { Tabs } from "@mantine/core";
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
  onFragmentClick: (activityId: string, startTime: number, matchedSegments: any[]) => void;
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

  return (
    <Tabs
      value={activeTab}
      onChange={(value) => { if (value) setActiveTab(value); }}
      m="lg"
    >
      <Tabs.List>
        <Tabs.Tab value="courses">
          Eventos ({eventSearchMode ? eventSearchResults.length : events.length})
        </Tabs.Tab>
        {memberShipStatus && (
          <Tabs.Tab value="exclusive">
            Contenido exclusivo ({exclusiveEvents.length})
          </Tabs.Tab>
        )}
        <Tabs.Tab value="activities">
          Actividades ({activityTabProps.activityTotal})
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="courses" pt="md">
        <EventsGrid
          events={eventSearchMode ? eventSearchResults : events}
          onClick={handleCourseClick}
          memberShipStatus={memberShipStatus}
        />
      </Tabs.Panel>

      {memberShipStatus && (
        <Tabs.Panel value="exclusive" pt="md">
          <EventsGrid
            events={exclusiveEvents}
            onClick={handleCourseClick}
            memberShipStatus={memberShipStatus}
          />
        </Tabs.Panel>
      )}

      <Tabs.Panel value="activities" pt="md">
        <ActivitiesGrid
          {...activityTabProps}
          onActivityClick={activityTabProps.onActivityClick}
          onFragmentClick={activityTabProps.onFragmentClick}
          onEventClick={activityTabProps.onEventClick}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
