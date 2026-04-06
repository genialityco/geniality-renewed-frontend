import { Grid, Text, Pagination, Flex } from "@mantine/core";
import { Activity } from "../../../services/types";
import { TranscriptSearchResult } from "../../../services/transcriptSegmentsService";
import ActivityCard from "../../../components/ActivityCard";

export default function ActivitiesGrid({
  activities,
  searchResults,
  searchQuery,
  searchPagedResults,
  searchActivities,
  activityPage,
  activityTotal,
  activityLimit,
  onPageChange,
  searching,
  organizationId,
  onActivityClick,
  onFragmentClick,
  onEventClick, // 👈 NUEVO
}: {
  activities: Activity[];
  searchResults: TranscriptSearchResult[];
  searchQuery: string;
  searchPagedResults: TranscriptSearchResult[];
  searchActivities: Activity[];
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
  onEventClick: (eventId: string) => void; // 👈 NUEVO
}) {
  if (searching) {
    return (
      <Flex justify="center" align="center" mt="md">
        <Text size="md" c="dimmed">
          Cargando resultados...
        </Text>
      </Flex>
    );
  }

  // Vista de búsqueda con segmentos
  if (searchResults.length > 0 && searchQuery.trim() !== "") {
    return (
      <>
        <Text size="sm" mb="sm">
          Resultados de búsqueda para "{searchQuery}":
        </Text>
        <Grid mt="sm" gutter="xs">
          {searchPagedResults.map((result) => {
            const foundActivity = searchActivities.find(
              (act) => String(act._id) === String(result._id)
            );
            if (!foundActivity) return null;

            return (
              <Grid.Col key={foundActivity._id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                <ActivityCard
                  activity={foundActivity}
                  matchedSegments={result.matchedSegments}
                  searchQuery={searchQuery}
                  organizationId={organizationId}
                  onCardClick={() => onActivityClick(foundActivity._id)}
                  onFragmentClick={(seg) =>
                    onFragmentClick(
                      foundActivity._id,
                      seg.startTime,
                      result.matchedSegments
                    )
                  }
                  onEventClick={onEventClick} // 👈 pasa tal cual
                />
              </Grid.Col>
            );
          })}
        </Grid>
        <Flex justify="center" mt="md">
          <Pagination
            value={activityPage}
            onChange={onPageChange}
            total={Math.ceil(activityTotal / activityLimit)}
            size="sm"
          />
        </Flex>
      </>
    );
  }

  // Vista normal
  return (
    <>
      <Grid mt="sm" gutter="xs">
        {activities.length === 0 ? (
          <Grid.Col span={12}>
            <Text c="dimmed">No hay actividades disponibles.</Text>
          </Grid.Col>
        ) : (
          activities.map((activity) => (
            <Grid.Col key={activity._id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
              <ActivityCard
                activity={activity}
                organizationId={organizationId}
                onCardClick={() => onActivityClick(activity._id)}
                onEventClick={onEventClick} 
              />
            </Grid.Col>
          ))
        )}
      </Grid>
      <Flex justify="center" mt="md">
        <Pagination
          value={activityPage}
          onChange={onPageChange}
          total={Math.ceil(activityTotal / activityLimit)}
          size="sm"
        />
      </Flex>
    </>
  );
}
