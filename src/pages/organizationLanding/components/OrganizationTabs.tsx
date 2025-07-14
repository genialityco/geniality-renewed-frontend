import { Tabs } from "@mantine/core";
import EventsGrid from "./EventsGrid";
import ActivitiesGrid from "./ActivitiesGrid";
import { Event } from "../../../services/types";
// import { TranscriptSearchResult } from "../services/transcriptSegmentsService";

export default function OrganizationTabs({
  activeTab,
  setActiveTab,
  eventSearchMode,
  eventSearchResults,
  events,
  handleCourseClick,
  activityTabProps
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  eventSearchMode: boolean;
  eventSearchResults: Event[];
  events: Event[];
  handleCourseClick: (id: string) => void;
  activityTabProps: any;
}) {
  return (
    <Tabs value={activeTab} onChange={value => { if (value) setActiveTab(value); }} m="lg">
      <Tabs.List>
        <Tabs.Tab value="courses">
          Eventos ({eventSearchMode ? eventSearchResults.length : events.length})
        </Tabs.Tab>
        <Tabs.Tab value="activities">Actividades ({activityTabProps.activityTotal})</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="courses" pt="md">
        <EventsGrid
          events={eventSearchMode ? eventSearchResults : events}
          onClick={handleCourseClick}
        />
      </Tabs.Panel>
      <Tabs.Panel value="activities" pt="md">
        <ActivitiesGrid {...activityTabProps} />
      </Tabs.Panel>
    </Tabs>
  );
}
