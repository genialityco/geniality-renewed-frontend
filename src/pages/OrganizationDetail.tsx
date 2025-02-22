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
} from "@mantine/core";
import { fetchOrganizationById } from "../services/organizationService";
import { fetchEventsByOrganizer } from "../services/eventService";
import { Organization } from "../services/types";
import { Event } from "../services/types";

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const orgData = await fetchOrganizationById(id);
          setOrganization(orgData);

          const eventData = await fetchEventsByOrganizer(id);
          const sortedEvents = eventData.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          setEvents(sortedEvents);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) return <Loader />;
  if (!organization) return <Text>Organización no encontrada</Text>;

  return (
    <Container
      fluid
      style={{
        padding: "20px",
        textAlign: "center",
      }}
    >
      {/* Nombre de la Organización */}
      <Title>{organization.name}</Title>

      {/* Lista de Eventos */}
      <Flex justify="flex-start">
        <Text>{events.length} cursos disponibles</Text>
      </Flex>
      {events.length === 0 ? (
        <Text>No hay eventos disponibles.</Text>
      ) : (
        <Grid mt="md" gutter="md">
          {events.map((event) => (
            <Grid.Col key={event._id} span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
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
    </Container>
  );
}
