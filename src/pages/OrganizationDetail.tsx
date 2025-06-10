import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Container,
  Title,
  Text,
  Loader,
  Grid,
  Image,
  Flex,
  Tabs,
  TextInput,
  Button,
  Paper,
  Modal,
  Pagination,
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
import { getActivityById } from "../services/activityService";

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
  const [searching, setSearching] = useState(false); // Nuevo estado para loading de búsqueda

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

  // Nuevo: estados filtrados
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);

  // Estado para paginación
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit] = useState(12); // Puedes ajustar el límite por página
  const [activityTotal, setActivityTotal] = useState(0);

  // Nuevo: actividades encontradas por búsqueda de transcripción (cuando hay paginación)
  const [searchActivities, setSearchActivities] = useState<Activity[]>([]);

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

          // Obtener actividades de la organización paginadas
          const activityData = await getActivitiesByOrganization(
            id,
            activityPage,
            activityLimit
          );
          setActivities(activityData.results);
          setActivityTotal(activityData.total);

          // Inicialmente, sin búsqueda, muestra todo
          setFilteredEvents(sortedEvents);
          setFilteredActivities(activityData.results);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, activityPage, activityLimit]);

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

  // Función para buscar texto en las transcripciones y eventos/actividades
  const handleSearch = async () => {
    setActiveTab("activities");
    setActivityPage(1);
    setSearching(true); // Inicia loading
    const query = searchQuery.trim().toLowerCase();

    // Filtrar eventos por nombre
    const filteredEv = events.filter((ev) =>
      ev.name?.toLowerCase().includes(query)
    );
    setFilteredEvents(filteredEv);

    // Filtrar actividades por nombre solo al hacer clic en buscar
    let filteredActs = activities.filter((act) =>
      act.name?.toLowerCase().includes(query)
    );

    // Buscar en transcripciones solo si hay texto
    if (!query) {
      setFilteredActivities(filteredActs);
      setSearchResults([]);
      setSearchActivities([]);
      setActivityTotal(filteredActs.length);
      return;
    }
    try {
      const results = await searchSegments(searchQuery);
      setSearchResults(results);

      if (results.length > 0) {
        // Buscar las actividades por _id (pueden no estar en el array activities por paginación)
        const ids = results.map((r) => String(r._id));
        // Traer todas las actividades encontradas (peticiones paralelas)
        const uniqueIds = Array.from(new Set(ids));
        const activitiesFound = await Promise.all(
          uniqueIds.map((id) => getActivityById(id))
        );
        setSearchActivities(activitiesFound);
        setFilteredActivities(activitiesFound);
        setActivityTotal(activitiesFound.length);
      } else {
        setSearchActivities([]);
        setFilteredActivities([]);
        setActivityTotal(0);
      }
    } catch (error) {
      setSearchActivities([]);
      setFilteredActivities([]);
      setActivityTotal(0);
      console.error("Error searching segments:", error);
    } finally {
      setSearching(false); // Finaliza loading
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
        <Tabs.Tab value="courses">
          Eventos ({searchQuery.trim() ? filteredEvents.length : events.length})
        </Tabs.Tab>
        <Tabs.Tab value="activities">Actividades ({activityTotal})</Tabs.Tab>
      </Tabs.List>

      {/* Tab de Eventos */}
      <Tabs.Panel value="courses" pt="md">
        <Flex justify="flex-start">
          <Text>
            {searchQuery.trim() ? filteredEvents.length : events.length} eventos
            disponibles
          </Text>
        </Flex>
        {(searchQuery.trim() ? filteredEvents : events).length === 0 ? (
          <Text>No hay eventos disponibles.</Text>
        ) : (
          <Grid gutter="xs">
            {(searchQuery.trim() ? filteredEvents : events).map((event) => (
              <Grid.Col key={event._id} span={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Paper
                  p="xs"
                  onClick={() => handleCourseClick(event._id)}
                  style={{ cursor: "pointer" }}
                >
                  {(event.picture || event.styles?.event_image) && (
                    <Image
                      src={event.picture || event.styles.banner_image}
                      alt={event.name}
                      style={{ objectFit: "contain" }}
                    />
                  )}
                  <Title order={4} mt="xs" style={{ textAlign: "left" }}>
                    {event.name}
                  </Title>
                  <Text size="sm" c="gray" style={{ textAlign: "left" }}>
                    {event.created_at
                      ? new Date(event.created_at).toLocaleDateString(
                          "es-ES",
                          {}
                        )
                      : "Fecha no disponible"}
                  </Text>
                </Paper>
              </Grid.Col>
            ))}
          </Grid>
        )}
      </Tabs.Panel>

      {/* Tab de Actividades */}
      <Tabs.Panel value="activities" pt="md">
        <Flex justify="flex-start" align="center" gap="md">
          <Text>
            {searchQuery.trim() ? filteredActivities.length : activityTotal}{" "}
            actividades disponibles
          </Text>
        </Flex>
        {searching ? (
          <Flex justify="center" align="center" mt="md">
            <Text size="md" c="dimmed">
              Cargando resultados...
            </Text>
          </Flex>
        ) : searchResults.length > 0 && searchQuery.trim() !== "" ? (
          <>
            <Text size="sm" mb="sm">
              Resultados de búsqueda para "{searchQuery}":
            </Text>
            <Grid mt="md" gutter="md">
              {searchResults
                .slice(
                  (activityPage - 1) * activityLimit,
                  activityPage * activityLimit
                )
                .map((result) => {
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
                      />
                    </Grid.Col>
                  );
                })}
            </Grid>
            <Flex justify="center" mt="md">
              <Pagination
                value={activityPage}
                onChange={setActivityPage}
                total={Math.ceil(activityTotal / activityLimit)}
                size="sm"
              />
            </Flex>
          </>
        ) : searchQuery.trim() !== "" && searchResults.length === 0 ? (
          <>
            <Text size="sm" mb="sm">
              Resultados de búsqueda para "{searchQuery}":
            </Text>
            <Text>No se encontraron resultados.</Text>
          </>
        ) : (
          <>
            <Grid mt="md" gutter="md">
              {filteredActivities.length === 0 ? (
                <Grid.Col span={12}>
                  <Text>No hay actividades disponibles.</Text>
                </Grid.Col>
              ) : (
                filteredActivities.map((activity) => (
                  <Grid.Col
                    key={activity._id}
                    span={{ xs: 12, sm: 6, md: 6, lg: 6 }}
                  >
                    <ActivityCard activity={activity} />
                  </Grid.Col>
                ))
              )}
            </Grid>
            <Flex justify="center" mt="md">
              <Pagination
                value={activityPage}
                onChange={setActivityPage}
                total={Math.ceil(activityTotal / activityLimit)}
                size="sm"
              />
            </Flex>
          </>
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
        {/* <Title style={{ textShadow: "0px 2px 4px rgba(0,0,0,0.5)" }}>
          {organization.name}
        </Title> */}

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
          rightSection={
            searchQuery ? (
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                px={6}
                onClick={() => {
                  setSearchQuery("");
                  setFilteredEvents(events);
                  setFilteredActivities(activities);
                  setSearchResults([]);
                }}
                tabIndex={-1}
              >
                ×
              </Button>
            ) : null
          }
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
