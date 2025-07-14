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
  if (searchResults.length > 0 && searchQuery.trim() !== "") {
    return (
      <>
        <Text size="sm" mb="sm">
          Resultados de búsqueda para "{searchQuery}":
        </Text>
        <Grid mt="md" gutter="md">
          {searchPagedResults.map((result) => {
            const foundActivity = searchActivities.find(
              (act) => String(act._id) === String(result._id)
            );
            if (!foundActivity) return null;
            return (
              <Grid.Col
                key={foundActivity._id}
                span={searchQuery ? 12 : { xs: 12, sm: 6, md: 4, lg: 3 }}
              >
                <ActivityCard
                  activity={foundActivity}
                  matchedSegments={result.matchedSegments}
                  searchQuery={searchQuery}
                  organizationId={organizationId}
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
  // Normal
  return (
    <>
      <Grid mt="md" gutter="md">
        {activities.length === 0 ? (
          <Grid.Col span={12}>
            <Text>No hay actividades disponibles.</Text>
          </Grid.Col>
        ) : (
          activities.map((activity) => (
            <Grid.Col key={activity._id} span={{ xs: 12, sm: 6, md: 6, lg: 6 }}>
              <ActivityCard
                activity={activity}
                organizationId={organizationId}
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
