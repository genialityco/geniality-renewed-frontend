import { useEffect, useState } from "react";
import { Activity, Host, Event } from "../../../services/types";
import { searchSegments } from "../../../services/transcriptSegmentsService";
import { SearchResult } from "../../organizationLanding/components/SearchBar";
import { getThumbnailUrl, getVimeoId } from "../helpers/courseDetailHelpers";

interface UseCourseSearchReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  searchLoading: boolean;
  showSearchDropdown: boolean;
  setShowSearchDropdown: (show: boolean) => void;
  executeSearch: () => Promise<void>;
}

export function useCourseSearch(
  activities: Activity[],
  hosts: Host[],
  event?: Event | null,
  onActivitySelect?: (activity: Activity) => void
): UseCourseSearchReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const getActivityThumbnail = (activity: Activity): string | undefined => {
    const vimeoId = getVimeoId(activity.video);
    const thumbnail = getThumbnailUrl(vimeoId);
    return thumbnail || undefined;
  };

  const runSearch = async (rawQuery: string) => {
    const trimmedQuery = rawQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setShowSearchDropdown(true);
    setSearchLoading(true);

    try {
      const query = trimmedQuery.toLowerCase();
      const results: SearchResult[] = [];

      // Búsqueda en información del curso
      if (event) {
        if (
          event.name?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query)
        ) {
          results.push({
            id: `event-${event._id}`,
            type: "default",
            title: `📖 ${event.name}`,
            subtitle: "Información del curso",
            onClick: () => {},
          });
        }
      }

      // Búsqueda en actividades del curso
      const matchedActivities = activities.filter(
        (act) =>
          act.name.toLowerCase().includes(query) ||
          act.description?.toLowerCase().includes(query) ||
          act.short_description?.toLowerCase().includes(query)
      );

      matchedActivities.forEach((activity) => {
        results.push({
          id: `activity-${activity._id}`,
          type: "activity",
          title: activity.name,
          subtitle: activity.short_description,
          image: getActivityThumbnail(activity),
          onClick: () => onActivitySelect?.(activity),
        });
      });

      // Búsqueda en conferencistas del curso
      const matchedHosts = hosts.filter(
        (host) =>
          host.name.toLowerCase().includes(query) ||
          host.description?.toLowerCase().includes(query) ||
          host.profession?.toLowerCase().includes(query)
      );

      matchedHosts.forEach((host) => {
        results.push({
          id: `host-${host._id}`,
          type: "host",
          title: host.name,
          subtitle: host.profession || undefined,
          image: host.image,
          badge: "Conferencista",
          onClick: () => {},
        });
      });

      // Búsqueda en transcript, restringida a actividades del curso
      try {
        const transcriptResults = await searchSegments(trimmedQuery, 1, 10, undefined);
        const courseActivityIds = new Set(activities.map((a) => String(a._id)));

        const filteredTranscripts = transcriptResults.data.filter((result) =>
          courseActivityIds.has(String(result._id))
        );

        filteredTranscripts.forEach((transcriptResult) => {
          const activity = activities.find(
            (a) => String(a._id) === String(transcriptResult._id)
          );
          if (activity) {
            const allSegments = transcriptResult.matchedSegments.map((seg) => ({
                segmentId: seg.segmentId,
                text: seg.text,
                startTime: seg.startTime,
                endTime: seg.endTime,
                score: seg.score,
              }));

            const firstSegmentStartTime =
              transcriptResult.matchedSegments[0]?.startTime || 0;

            results.push({
              id: `transcript-${transcriptResult._id}`,
              type: "transcript",
              title: activity.name,
              subtitle: `${transcriptResult.matchedSegments.length} coincidencia${
                transcriptResult.matchedSegments.length > 1 ? "s" : ""
              } en la transcripción`,
              image: getActivityThumbnail(activity),
              segments: allSegments,
              startTime: firstSegmentStartTime,
              onClick: () => onActivitySelect?.(activity),
            });
          }
        });
      } catch {
        console.error("Error searching transcripts");
      }

      setSearchResults(results);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void runSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activities, hosts, event, onActivitySelect]);

  const executeSearch = async () => {
    await runSearch(searchQuery);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    showSearchDropdown,
    setShowSearchDropdown,
    executeSearch,
  };
}
