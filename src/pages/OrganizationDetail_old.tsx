import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
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
  Card,
} from "@mantine/core";

import { fetchOrganizationById } from "../services/organizationService";
import {
  fetchEventsByOrganizer,
  fetchEventByName,
} from "../services/eventService";
import { getActivitiesByOrganization } from "../services/activityService";
import {
  searchSegments,
  TranscriptSearchResult,
} from "../services/transcriptSegmentsService";
import { fetchPaymentPlanByUserId } from "../services/paymentPlansService";
import { useUser } from "../context/UserContext";
// import { useAuthModal } from "../context/AuthModalContext";
// import { usePaymentModal } from "../context/PaymentModalContext";
import { getActivityById } from "../services/activityService";

import { Organization, Event, Activity } from "../services/types";
import ActivityCard from "../components/ActivityCard";
import MembershipPayment from "../components/MembershipPayment";

function isMembershipExpired(paymentPlan: {
  date_until: string | number | Date;
}) {
  if (!paymentPlan || !paymentPlan.date_until) return true;
  const now = new Date();
  let until;
  // Puede ser string (ISO) o Date
  if (typeof paymentPlan.date_until === "string") {
    until = new Date(paymentPlan.date_until);
  } else {
    until = paymentPlan.date_until; // Date
  }
  return until < now;
}

export default function OrganizationDetail() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { userId } = useUser();
  // const { openAuthModal } = useAuthModal();
  // const { openPaymentModal } = usePaymentModal();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false); // Nuevo estado para loading de búsqueda

  // Estado para PaymentPlan
  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Para la búsqueda
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TranscriptSearchResult[]>(
    []
  );
  const [eventSearchResults, setEventSearchResults] = useState<Event[]>([]);
  const [eventSearchMode, setEventSearchMode] = useState(false);

  // Estado para la pestaña activa: "courses" o "activities"
  const [activeTab, setActiveTab] = useState("courses");

  // Nuevo: estados filtrados
  const [, setFilteredEvents] = useState<Event[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);

  // Estado para paginación
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit] = useState(12);
  const [activityTotal, setActivityTotal] = useState(0);
  const [searchActivities, setSearchActivities] = useState<Activity[]>([]);
  const [searchPagedResults, setSearchPagedResults] = useState<
    TranscriptSearchResult[]
  >([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (organizationId) {
          const orgData = await fetchOrganizationById(organizationId);
          setOrganization(orgData);

          const eventData = await fetchEventsByOrganizer(organizationId);
          const sortedEvents = eventData.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          setEvents(sortedEvents);

          // Obtener actividades de la organización paginadas
          const activityData = await getActivitiesByOrganization(
            organizationId,
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
  }, [organizationId, activityPage, activityLimit]);

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
    setSearching(true);
    const query = searchQuery.trim();

    // Buscar eventos por nombre usando el backend
    if (query) {
      setEventSearchMode(true);
      try {
        const events = await fetchEventByName(query);
        setEventSearchResults(
          Array.isArray(events) ? events : events ? [events] : []
        );
      } catch (error) {
        setEventSearchResults([]);
      }
    } else {
      setEventSearchMode(false);
      setEventSearchResults([]);
    }

    // Filtrar actividades por nombre solo al hacer clic en buscar
    let filteredActs = activities.filter((act) =>
      act.name?.toLowerCase().includes(query)
    );

    // Buscar en transcripciones solo si hay texto
    if (!query) {
      setFilteredActivities(filteredActs);
      setSearchResults([]);
      setSearchActivities([]);
      setSearchPagedResults([]);
      setActivityTotal(filteredActs.length);
      setSearching(false);
      return;
    }
    try {
      // Nuevo: usar paginación en el servicio de búsqueda
      const paged = await searchSegments(searchQuery, 1, activityLimit);
      setSearchResults(paged.data);
      setActivityTotal(paged.total);
      setSearchPagedResults(paged.data);

      if (paged.data.length > 0) {
        const ids = paged.data.map((r) => String(r._id));
        const uniqueIds = Array.from(new Set(ids));
        const activitiesFound = await Promise.all(
          uniqueIds.map((id) => getActivityById(id))
        );
        setSearchActivities(activitiesFound);
        setFilteredActivities(activitiesFound);
      } else {
        setSearchActivities([]);
        setFilteredActivities([]);
      }
    } catch (error) {
      setSearchActivities([]);
      setFilteredActivities([]);
      setSearchResults([]);
      setSearchPagedResults([]);
      setActivityTotal(0);
      console.error("Error searching segments:", error);
    } finally {
      setSearching(false);
    }
  };

  // Nuevo: paginación de resultados de búsqueda
  useEffect(() => {
    const fetchPagedSearch = async () => {
      if (!searchQuery.trim()) return;
      setSearching(true);
      try {
        const paged = await searchSegments(
          searchQuery,
          activityPage,
          activityLimit
        );
        setSearchResults(paged.data);
        setActivityTotal(paged.total);
        setSearchPagedResults(paged.data);

        if (paged.data.length > 0) {
          const ids = paged.data.map((r) => String(r._id));
          const uniqueIds = Array.from(new Set(ids));
          const activitiesFound = await Promise.all(
            uniqueIds.map((id) => getActivityById(id))
          );
          setSearchActivities(activitiesFound);
          setFilteredActivities(activitiesFound);
        } else {
          setSearchActivities([]);
          setFilteredActivities([]);
        }
      } catch (error) {
        setSearchActivities([]);
        setFilteredActivities([]);
        setSearchResults([]);
        setSearchPagedResults([]);
        setActivityTotal(0);
      } finally {
        setSearching(false);
      }
    };
    // Solo si hay búsqueda activa
    if (searchQuery.trim()) {
      fetchPagedSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityPage, activityLimit]);

  // Cuando el usuario escribe, solo actualiza el valor, pero si borra todo, recarga la información inicial
  const handleSearchInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (value.trim() === "") {
      setEventSearchMode(false);
      setEventSearchResults([]);
      setSearchResults([]);
      setSearchActivities([]);
      setSearchPagedResults([]);
      setActivityPage(1);

      // Recargar eventos y actividades completos (paginados)
      if (organizationId) {
        setLoading(true);
        try {
          const orgData = await fetchOrganizationById(organizationId);
          setOrganization(orgData);

          const eventData = await fetchEventsByOrganizer(organizationId);
          const sortedEvents = eventData.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
          setEvents(sortedEvents);
          setFilteredEvents(sortedEvents);

          const activityData = await getActivitiesByOrganization(
            organizationId,
            1, // página 1
            activityLimit
          );
          setActivities(activityData.results);
          setFilteredActivities(activityData.results);
          setActivityTotal(activityData.total);
        } catch (error) {
          setEvents([]);
          setFilteredEvents([]);
          setActivities([]);
          setFilteredActivities([]);
          setActivityTotal(0);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  // Cuando se limpia el input, salir de modo búsqueda de eventos y recargar todas las actividades y eventos
  const handleClearSearch = async () => {
    setSearchQuery("");
    setEventSearchMode(false);
    setEventSearchResults([]);
    setSearchResults([]);
    setSearchActivities([]);
    setSearchPagedResults([]);
    setActivityPage(1);

    // Recargar eventos y actividades completos (paginados)
    if (organizationId) {
      setLoading(true);
      try {
        const orgData = await fetchOrganizationById(organizationId);
        setOrganization(orgData);

        const eventData = await fetchEventsByOrganizer(organizationId);
        const sortedEvents = eventData.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setEvents(sortedEvents);
        setFilteredEvents(sortedEvents);

        const activityData = await getActivitiesByOrganization(
          organizationId,
          1, // página 1
          activityLimit
        );
        setActivities(activityData.results);
        setFilteredActivities(activityData.results);
        setActivityTotal(activityData.total);
      } catch (error) {
        setEvents([]);
        setFilteredEvents([]);
        setActivities([]);
        setFilteredActivities([]);
        setActivityTotal(0);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading)
    return (
      <Flex
        justify="center"
        align="center"
        style={{
          minHeight: "60vh",
          width: "100vw",
          flexDirection: "column",
        }}
      >
        <Loader size="xl" color="blue" variant="dots" />
        <Text mt="md" size="lg" c="dimmed">
          Cargando información...
        </Text>
      </Flex>
    );
  if (!organization) return <Text>Organización no encontrada</Text>;

  // Función para manejar click en un evento (curso)
  const handleCourseClick = async (eventId: string) => {
    if (!userId) {
      setShowSubscriptionModal(true);
      // Si no está autenticado, muestra el modal de autenticación
      // openAuthModal();
    } else if (!paymentPlan || isMembershipExpired(paymentPlan)) {
      // Si el plan está vencido, muestra el modal de pago
      // openPaymentModal();
      // navigate(`/organization/${organizationId}/pagos`);
    } else {
      // Si está autenticado y el plan activo, navega al curso
      navigate(`/organization/${organizationId}/course/${eventId}`);
    }
  };

  // --- Mensaje de membresía según estado ---

  let membershipStatus = null;

  if (!planLoading && userId) {
    if (!paymentPlan) {
      membershipStatus = (
        <Card>
          <Text fw={700} mt="md">
            📚 Bienvenido, solo te falta un paso para empezar a disfrutar de
            contenidos exclusivos, cursos, conferencias y herramientas diseñadas
            para llevar tu conocimiento al siguiente nivel.
          </Text>
          <MembershipPayment />
        </Card>
      );
    } else if (isMembershipExpired(paymentPlan)) {
      membershipStatus = (
        <Card>
          <Text c="red" fw={700} mt="md">
            Tu membresía está vencida. Para acceder al contenido debes renovar
            tu pago.
          </Text>
          <MembershipPayment />
        </Card>
      );
    }
  }

  // Función para renderizar las pestañas
  const renderTabs = () => (
    <Tabs
      value={activeTab}
      onChange={(value: string | null) => {
        if (value !== null) {
          setActiveTab(value);
        }
      }}
      m="lg"
    >
      <Tabs.List>
        <Tabs.Tab value="courses">
          Eventos ({eventSearchMode ? eventSearchResults.length : events.length}
          )
        </Tabs.Tab>
        <Tabs.Tab value="activities">Actividades ({activityTotal})</Tabs.Tab>
      </Tabs.List>

      {/* Tab de Eventos */}
      <Tabs.Panel value="courses" pt="md">
        {(
          eventSearchMode
            ? eventSearchResults.length === 0
            : events.length === 0
        ) ? (
          <Text>No hay eventos disponibles.</Text>
        ) : (
          <Grid gutter="xs">
            {(eventSearchMode ? eventSearchResults : events).map((event) => (
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
                      organizationId={organizationId as string}
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
                    <ActivityCard activity={activity} organizationId={organizationId as string} />
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
    <div style={{ textAlign: "center" }}>
      <Image
        src={organization.styles.banner_image}
        alt={organization.name}
        mt="md"
      />

      {membershipStatus}

      <Flex
        justify="center"
        align="center"
        gap="md"
        style={{ margin: "20px 0" }}
      >
        <TextInput
          placeholder="Buscar en actividades y eventos.."
          value={searchQuery}
          onChange={handleSearchInputChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          style={{ width: 250 }}
          rightSection={
            searchQuery ? (
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                px={6}
                onClick={handleClearSearch}
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
        <Button
          fullWidth
          onClick={() => navigate(`/organization/${organizationId}/pagos`)}
        >
          Comenzar
        </Button>
      </Modal>
    </div>
  );
}
