import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Loader,
  Card,
  Grid,
  Image,
  Flex,
  Tabs,
  TextInput,
  Button,
} from "@mantine/core";

import { fetchOrganizationById } from "../services/organizationService";
import { fetchEventsByOrganizer } from "../services/eventService";
import { fetchActivitiesByOrganization } from "../services/activityService";
import {
  searchSegments,
  TranscriptSearchResult,
} from "../services/transcriptSegmentsService";

import { Organization, Event, Activity } from "../services/types";
import ActivityCard from "../components/ActivityCard";

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Para la búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TranscriptSearchResult[]>(
    []
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const orgData = await fetchOrganizationById(id);
          setOrganization(orgData);

          const eventData = await fetchEventsByOrganizer(id);
          // Ordenar por fecha descendente, opcional
          const sortedEvents = eventData.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          setEvents(sortedEvents);

          // Obtener actividades de la organización
          const activityData = await fetchActivitiesByOrganization(id);
          setActivities(activityData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Función para buscar texto en las transcripciones
  const handleSearch = async () => {
    try {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      const results = await searchSegments(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching segments:", error);
    }
  };

  if (loading) return <Loader />;
  if (!organization) return <Text>Organización no encontrada</Text>;

  return (
    <Container fluid style={{ padding: "20px", textAlign: "center" }}>
      <Title>{organization.name}</Title>

      <Tabs defaultValue="courses">
        <Tabs.List>
          <Tabs.Tab value="courses">Cursos ({events.length})</Tabs.Tab>
          <Tabs.Tab value="activities">
            Actividades ({activities.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab de Cursos */}
        <Tabs.Panel value="courses" pt="md">
          <Flex justify="flex-start">
            <Text>{events.length} cursos disponibles</Text>
          </Flex>
          {events.length === 0 ? (
            <Text>No hay cursos disponibles.</Text>
          ) : (
            <Grid mt="md" gutter="md">
              {events.map((event) => (
                <Grid.Col
                  key={event._id}
                  span={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                >
                  <Card
                    style={{ height: "100%", cursor: "pointer" }}
                    onClick={() => navigate(`/course/${event._id}`)}
                  >
                    <Flex
                      direction="column"
                      justify="space-around"
                      style={{ height: "100%" }}
                    >
                      {/* Manejo de la imagen */}
                      {(event.picture || event.styles?.event_image) && (
                        <Image
                          src={event.picture || event.styles.banner_image}
                          alt={event.name}
                          height={150}
                          style={{ objectFit: "cover" }}
                        />
                      )}

                      <Title order={4} style={{ textAlign: "left" }}>
                        {event.name}
                      </Title>
                    </Flex>
                  </Card>
                </Grid.Col>
              ))}
            </Grid>
          )}
        </Tabs.Panel>

        {/* Tab de Actividades */}
        <Tabs.Panel value="activities" pt="md">
          <Flex justify="flex-start" align="center" gap="md">
            <Text>{activities.length} actividades disponibles</Text>

            {/* Barra de búsqueda */}
            <TextInput
              placeholder="Buscar texto en transcripciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 250 }}
            />
            <Button onClick={handleSearch}>Buscar</Button>
          </Flex>

          {searchResults.length > 0 ? (
            <div style={{ marginTop: 20 }}>
              <Grid gutter="md">
                {searchResults.length > 0 ? (
                  <div style={{ marginTop: 20 }}>
                    <Text size="sm" mb="sm">
                      Resultados de búsqueda para "{searchQuery}":
                    </Text>
                    <Grid gutter="md">
                      {searchResults.map((result) => {
                        const foundActivity = activities.find(
                          (act) => act._id === result._id
                        );
                        if (!foundActivity) {
                          return null;
                        }

                        return (
                          <Grid.Col key={foundActivity._id} span={12}>
                            <ActivityCard
                              activity={foundActivity}
                              matchedSegments={result.matchedSegments}
                              searchQuery={searchQuery}
                            />
                          </Grid.Col>
                        );
                      })}
                    </Grid>
                  </div>
                ) : (
                  <Grid mt="md" gutter="md">
                    {activities.length === 0 ? (
                      <Text>No hay actividades disponibles.</Text>
                    ) : (
                      activities.map((activity) => (
                        <Grid.Col
                          key={activity._id}
                          span={{ xs: 12, sm: 6, md: 6, lg: 6 }}
                        >
                          <ActivityCard activity={activity} />
                        </Grid.Col>
                      ))
                    )}
                  </Grid>
                )}
              </Grid>
            </div>
          ) : (
            <Grid mt="md" gutter="md">
              {activities.length === 0 ? (
                <Text>No hay actividades disponibles.</Text>
              ) : (
                activities.map((activity) => (
                  <Grid.Col
                    key={activity._id}
                    span={{ xs: 12, sm: 6, md: 6, lg: 6 }}
                  >
                    <ActivityCard activity={activity} />
                  </Grid.Col>
                ))
              )}
            </Grid>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
