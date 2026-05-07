import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader, Flex, Text } from "@mantine/core";
//import { Modal, Button, Alert } from "@mantine/core";

//import { IconAlertCircle } from "@tabler/icons-react";

import { fetchOrganizationById } from "../../services/organizationService";
import {
  fetchEventsByOrganizer,
  fetchEventByName,
} from "../../services/eventService";
import {
  getActivitiesByOrganization,
  getActivityById,
} from "../../services/activityService";
import {
  searchSegments,
  TranscriptSearchResult,
} from "../../services/transcriptSegmentsService";
import { fetchPaymentPlanByUserId } from "../../services/paymentPlansService";
import { fetchOrganizationUserByUserId } from "../../services/organizationUserService";
import { useUser } from "../../context/UserContext";
import { useOrganization } from "../../context/OrganizationContext";
import { Organization, Event, Activity } from "../../services/types";

import OrganizationBanner from "./components/OrganizationBanner";
import MembershipStatus from "./components/MembershipStatus";
import SearchBar from "./components/SearchBar";
import OrganizationTabs from "./components/OrganizationTabs";
import SubscriptionModal from "./components/SubscriptionModal";
import {
  trackActivityClick,
  trackCourseClick,
  trackOpenPaywall,
  trackSearch,
  trackSubscriptionStart,
} from "../../utils/analytics";

const PAYWALL_ORGANIZATION_ID = "63f552d916065937427b3b02";

function isMembershipExpired(paymentPlan: {
  date_until: string | number | Date;
}) {
  if (!paymentPlan || !paymentPlan.date_until) return true;
  const now = new Date();
  let until;
  if (typeof paymentPlan.date_until === "string") {
    until = new Date(paymentPlan.date_until);
  } else {
    until = paymentPlan.date_until;
  }
  return until < now;
}

export default function OrganizationLanding() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const navigate = useNavigate();
  const { userId, name } = useUser();
  const { organization: contextOrganization } = useOrganization();
  const shouldShowPaywallMessage = organizationId === PAYWALL_ORGANIZATION_ID;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  // const [showVideoIssuesModal, setShowVideoIssuesModal] = useState(false);
  // const [showVideoIssuesBanner, setShowVideoIssuesBanner] = useState(false);

  const [memberShipStatus, setMemberShipStatus] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TranscriptSearchResult[]>(
    [],
  );
  const [eventSearchResults, setEventSearchResults] = useState<Event[]>([]);
  const [eventSearchMode, setEventSearchMode] = useState(false);

  const [activeTab, setActiveTab] = useState("courses");

  const [, setFilteredEvents] = useState<Event[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);

  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit] = useState(12);
  const [activityTotal, setActivityTotal] = useState(0);
  const [searchActivities, setSearchActivities] = useState<Activity[]>([]);
  const [searchPagedResults, setSearchPagedResults] = useState<
    TranscriptSearchResult[]
  >([]);

  const openPaywall = () => {
    trackOpenPaywall(organizationId);
    if (shouldShowPaywallMessage) {
      setShowSubscriptionModal(true);
      return;
    }
    navigate(`/organization/${organizationId}/iniciar-sesion`);
  };

  // -------- DATA FETCHING -----------
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (organizationId) {
          const orgData = await fetchOrganizationById(organizationId);
          setOrganization(orgData);

          const eventData = await fetchEventsByOrganizer(organizationId);
          const sortedEvents = eventData.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setEvents(sortedEvents);

          const activityData = await getActivitiesByOrganization(
            organizationId,
            activityPage,
            activityLimit,
          );
          setActivities(activityData.results);
          setActivityTotal(activityData.total);

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

  // Fetch memberShipStatus del usuario
  useEffect(() => {
    const fetchMemberShipStatus = async () => {
      try {
        if (userId) {
          const orgUser = await fetchOrganizationUserByUserId(userId);
          setMemberShipStatus(orgUser?.memberShipStatus ?? false);
        }
      } catch (error) {
        console.error("Error fetching organization user:", error);
        setMemberShipStatus(false);
      }
    };
    fetchMemberShipStatus();
  }, [userId]);

  // Mostrar modal de problemas con videos cuando el usuario inicia sesión
  // useEffect(() => {
  //   if (userId && !localStorage.getItem("videoIssuesModalShown")) {
  //     setShowVideoIssuesModal(true);
  //     localStorage.setItem("videoIssuesModalShown", "true");
  //   }
  //   if (userId) {
  //     setShowVideoIssuesBanner(true);
  //   }
  // }, [userId]);

  // ----------- SEARCH LOGIC ------------
  const handleSearch = async () => {
    trackSearch(searchQuery.trim(), organizationId);
    setActiveTab("activities");
    setActivityPage(1);
    setSearching(true);
    const query = searchQuery.trim();

    if (query) {
      setEventSearchMode(true);
      try {
        const events = await fetchEventByName(query);
        const eventList = Array.isArray(events)
          ? events
          : events
            ? [events]
            : [];
        setEventSearchResults(
          organizationId
            ? eventList.filter(
                (event) =>
                  String(event.organizer_id) === String(organizationId),
              )
            : eventList,
        );
      } catch {
        setEventSearchResults([]);
      }
    } else {
      setEventSearchMode(false);
      setEventSearchResults([]);
    }

    let filteredActs = activities.filter((act) =>
      act.name?.toLowerCase().includes(query),
    );

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
      const paged = await searchSegments(
        searchQuery,
        1,
        activityLimit,
        organizationId,
      );
      setSearchResults(paged.data);
      setActivityTotal(paged.total);
      setSearchPagedResults(paged.data);

      if (paged.data.length > 0) {
        const ids = paged.data.map((r) => String(r._id));
        const uniqueIds = Array.from(new Set(ids));
        const activitiesFound = await Promise.all(
          uniqueIds.map((id) => getActivityById(id)),
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

  // Paginación de búsqueda
  useEffect(() => {
    const fetchPagedSearch = async () => {
      if (!searchQuery.trim()) return;
      setSearching(true);
      try {
        const paged = await searchSegments(
          searchQuery,
          activityPage,
          activityLimit,
          organizationId,
        );
        setSearchResults(paged.data);
        setActivityTotal(paged.total);
        setSearchPagedResults(paged.data);

        if (paged.data.length > 0) {
          const ids = paged.data.map((r) => String(r._id));
          const uniqueIds = Array.from(new Set(ids));
          const activitiesFound = await Promise.all(
            uniqueIds.map((id) => getActivityById(id)),
          );
          setSearchActivities(activitiesFound);
          setFilteredActivities(activitiesFound);
        } else {
          setSearchActivities([]);
          setFilteredActivities([]);
        }
      } catch {
        setSearchActivities([]);
        setFilteredActivities([]);
        setSearchResults([]);
        setSearchPagedResults([]);
        setActivityTotal(0);
      } finally {
        setSearching(false);
      }
    };
    if (searchQuery.trim()) {
      fetchPagedSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityPage, activityLimit]);

  // Cuando se limpia el input, recargar todo (reset)
  const handleSearchInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
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

      if (organizationId) {
        setLoading(true);
        try {
          const orgData = await fetchOrganizationById(organizationId);
          setOrganization(orgData);

          const eventData = await fetchEventsByOrganizer(organizationId);
          const sortedEvents = eventData.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setEvents(sortedEvents);
          setFilteredEvents(sortedEvents);

          const activityData = await getActivitiesByOrganization(
            organizationId,
            1,
            activityLimit,
          );
          setActivities(activityData.results);
          setFilteredActivities(activityData.results);
          setActivityTotal(activityData.total);
        } catch {
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

  const handleClearSearch = async () => {
    setSearchQuery("");
    setEventSearchMode(false);
    setEventSearchResults([]);
    setSearchResults([]);
    setSearchActivities([]);
    setSearchPagedResults([]);
    setActivityPage(1);

    if (organizationId) {
      setLoading(true);
      try {
        const orgData = await fetchOrganizationById(organizationId);
        setOrganization(orgData);

        const eventData = await fetchEventsByOrganizer(organizationId);
        const sortedEvents = eventData.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setEvents(sortedEvents);
        setFilteredEvents(sortedEvents);

        const activityData = await getActivitiesByOrganization(
          organizationId,
          1,
          activityLimit,
        );
        setActivities(activityData.results);
        setFilteredActivities(activityData.results);
        setActivityTotal(activityData.total);
      } catch {
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

  // ----------- EVENTS/ACTIVITIES TABS CALLBACKS --------------
  const handleCourseClick = async (eventId: string) => {
    trackCourseClick(eventId);
    if (!userId) {
      openPaywall();
    } else if (!paymentPlan || isMembershipExpired(paymentPlan)) {
      // Navega a pagos o muestra modal según UX deseada
      // openPaymentModal();
    } else {
      navigate(`/organization/${organizationId}/course/${eventId}`);
    }
  };

  const handleActivityClick = (activityId: string, t?: number) => {
    trackActivityClick(activityId);
    if (!userId) {
      openPaywall(); // <- NO navegar, solo mostrar modal
      return;
    }
    // si hay sesión, navega normal (puedes añadir chequeo de membresía si quieres)
    const base = `/organization/${organizationId}/activitydetail/${activityId}`;
    navigate(typeof t === "number" ? `${base}?t=${t}` : base);
  };

  const handleNameEventClick = (eventId: string) => {
    trackCourseClick(eventId);
    if (!userId) {
      openPaywall();
      return;
    }
    // si hay sesión (puedes añadir chequeo de membresía si quieres)
    navigate(`/organization/${organizationId}/course/${eventId}`);
  };

  // ----------- RENDERING --------------
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

  return (
    <div>
      {/* {showVideoIssuesBanner && (
        <Alert
          icon={<IconAlertCircle />}
          color="yellow"
          title="Aviso"
          onClose={() => setShowVideoIssuesBanner(false)}
          style={{ margin: 0 }}
        >
          Estamos teniendo dificultades en la visualización de los videos, estamos trabajando en ello.
        </Alert>
      )} */}

      <OrganizationBanner organization={organization} />

      <MembershipStatus
        loading={planLoading}
        userId={userId}
        paymentPlan={paymentPlan}
        isExpired={isMembershipExpired}
      />

      <SearchBar
        value={searchQuery}
        onChange={handleSearchInputChange}
        onSearch={handleSearch}
        onClear={handleClearSearch}
      />

      <OrganizationTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        eventSearchMode={eventSearchMode}
        eventSearchResults={eventSearchResults}
        events={events}
        handleCourseClick={handleCourseClick}
        memberShipStatus={memberShipStatus}
        // courseAttendees prop removed - not used by EventsGrid
        tabTitles={contextOrganization?.tab_titles}
        activityTabProps={{
          activities: filteredActivities,
          searchResults,
          searchQuery,
          searchPagedResults,
          searchActivities,
          activityPage,
          activityTotal,
          activityLimit,
          onPageChange: setActivityPage,
          searching,
          organizationId: organizationId!,
          userId: userId || "",
          userName: name || "",
          onActivityClick: handleActivityClick,
          onFragmentClick: (
            activityId: string,
            startTime: number,
            matchedSegments: any[],
          ) => {
            if (!userId) {
              openPaywall();
              return;
            }
            navigate(
              `/organization/${organizationId}/activitydetail/${activityId}?t=${startTime}&fragments=${encodeURIComponent(
                JSON.stringify(matchedSegments),
              )}`,
            );
          },
          onEventClick: handleNameEventClick,
        }}
      />

      <SubscriptionModal
        opened={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onStart={() => {
          trackSubscriptionStart(organizationId);
          navigate(
            shouldShowPaywallMessage
              ? `/organization/${organizationId}/iniciar-sesion?payment=1`
              : `/organization/${organizationId}/iniciar-sesion`,
          );
        }}
        organizationId={organizationId}
      />

      {/* <Modal
        opened={showVideoIssuesModal}
        onClose={() => setShowVideoIssuesModal(false)}
        title="Aviso Importante"
        centered
      >
        <Flex direction="column" gap="md">
          <Text>
            Estamos teniendo dificultades en la visualización de los videos, estamos trabajando en ello.
          </Text>
          <Button
            onClick={() => setShowVideoIssuesModal(false)}
            fullWidth
            variant="filled"
          >
            Entendido
          </Button>
        </Flex>
      </Modal> */}
    </div>
  );
}
