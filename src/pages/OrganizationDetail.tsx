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
  Divider,
  Paper,
  Modal,
} from "@mantine/core";

import { fetchOrganizationById } from "../services/organizationService";
import { fetchEventsByOrganizer } from "../services/eventService";
import { getActivitiesByOrganization } from "../services/activityService";
import {
  searchSegments,
  TranscriptSearchResult,
} from "../services/transcriptSegmentsService";
import { fetchPaymentPlanByUserId } from "../services/paymentPlansService";
import { useUser } from "../context/UserContext";
// import { useAuthModal } from "../context/AuthModalContext";
import { usePaymentModal } from "../context/PaymentModalContext";

import { Organization, Event, Activity } from "../services/types";
import ActivityCard from "../components/ActivityCard";

export default function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userId } = useUser();
  // const { openAuthModal } = useAuthModal();
  const { openPaymentModal } = usePaymentModal();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para PaymentPlan
  const [, setPaymentPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Para la búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TranscriptSearchResult[]>(
    []
  );

  // Estado para la pestaña activa: "courses" o "activities"
  const [activeTab, setActiveTab] = useState("courses");

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
          const activityData = await getActivitiesByOrganization(id);
          console.log("Actividades obtenidas:", activityData);
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

  // Obtener PaymentPlan usando el userId
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        if (userId) {
          const planData = await fetchPaymentPlanByUserId(userId);
          setPaymentPlan(planData);
        }
      } catch (error) {
        console.error("Error fetching payment plan:", error);
      } finally {
        setPlanLoading(false);
      }
    };
    fetchPlan();
  }, [userId]);

  // Función para buscar texto en las transcripciones
  const handleSearch = async () => {
    setActiveTab("activities");
    try {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      const results = await searchSegments(searchQuery);
      console.log(results);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching segments:", error);
    }
  };

  // Cuando el usuario escribe, si hay texto se activa el tab de "activities"
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (loading) return <Loader />;
  if (!organization) return <Text>Organización no encontrada</Text>;

  // Determinar si el plan está activo: si PaymentPlan se obtuvo y la fecha actual es menor o igual a date_until
  const planIsActive = true;

  // Función para manejar click en un evento (curso)
  const handleCourseClick = (eventId: string) => {
    if (!userId) {
      setShowSubscriptionModal(true);
      // Si no está autenticado, muestra el modal de autenticación
      // openAuthModal();
    } else if (!planIsActive) {
      // Si el plan está vencido, muestra el modal de pago
      openPaymentModal();
    } else {
      // Si está autenticado y el plan activo, navega al curso
      navigate(`/course/${eventId}`);
    }
  };

  // Función para renderizar las pestañas
  const renderTabs = () => (
    <Tabs
      value={activeTab}
      onChange={(value: string | null) => {
        if (value !== null) {
          setActiveTab(value);
        }
      }}
    >
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
              <Grid.Col key={event._id} span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Card
                  style={{ height: "100%", cursor: "pointer" }}
                  onClick={() => handleCourseClick(event._id)}
                >
                  <Flex
                    direction="column"
                    justify="space-around"
                    style={{ height: "100%" }}
                  >
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
        </Flex>

        {searchQuery.trim() !== "" ? (
          <>
            <Text size="sm" mb="sm">
              Resultados de búsqueda para "{searchQuery}":
            </Text>
            {searchResults.length > 0 ? (
              <Grid mt="md" gutter="md">
                {searchResults.map((result) => {
                  const foundActivity = activities.find(
                    (act) => String(act._id) === String(result._id)
                  );
                  if (!foundActivity) return null;
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
            ) : (
              <Text>No se encontraron resultados.</Text>
            )}
          </>
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
  );

  return (
    <Container fluid style={{ padding: "20px", textAlign: "center" }}>
      <Paper
        shadow="md"
        radius="md"
        style={{
          backgroundImage: `url(${organization.styles.banner_image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          padding: "120px",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <Title style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.5)" }}>
          {organization.name}
        </Title>

        {!planIsActive && !planLoading && userId && (
          <Text
            c="red"
            fw={700}
            mt="md"
            style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.5)" }}
          >
            Tu membresía no está activa. Algunas funcionalidades podrían estar
            bloqueadas.
          </Text>
        )}
        <Divider mb="lg" />
      </Paper>

      <Flex
        justify="center"
        align="center"
        gap="md"
        style={{ margin: "20px 0" }}
      >
        <TextInput
          placeholder="Buscar texto en transcripciones..."
          value={searchQuery}
          onChange={handleSearchInputChange}
          style={{ width: 250 }}
        />
        <Button onClick={handleSearch}>Buscar</Button>
      </Flex>

      {renderTabs()}
      <Modal
        opened={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        title="Suscripción requerida"
        centered
        size="lg"
      >
        <Text mb="md">
          Para acceder al contenido seleccionado debes suscribirte a{" "}
          <strong>ENDOCAMPUS ACE</strong>. Esta suscripción tiene un costo de{" "}
          <strong>$50.000 COP</strong> o <strong>15 USD</strong>, y con ella
          tienes derecho a material académico desarrollado por la ACE (Congresos
          y simposios).
        </Text>
        <Text mb="xl">
          La suscripción tiene vigencia de <strong>1 año</strong> a partir de la
          fecha en que se realice el pago.
        </Text>
        <Button fullWidth onClick={() => navigate(`/pagos/${id}`)}>
          Comenzar
        </Button>
      </Modal>
    </Container>
  );
}
