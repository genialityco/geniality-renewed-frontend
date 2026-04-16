import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AppShell,
  Text,
  Loader,
  Container,
  Flex,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";

import { useUser } from "../../context/UserContext";
import { useCourseData } from "./hooks/useCourseData";
import { useCourseProgress } from "./hooks/useCourseProgress";
import { useCourseSearch } from "./hooks/useCourseSearch";
import { CourseHeader } from "./components/CourseHeader";
import { CourseNavbar } from "./components/CourseNavbar";
import { CourseMainContent } from "./components/CourseMainContent";

/**
 * Componente principal para la página de detalle del curso
 * Maneja la navegación, búsqueda y visualización de contenido
 */
export default function CourseDetail() {
  const { eventId } = useParams<{ eventId: string }>();
  const { organizationId } = useParams<{ organizationId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userId } = useUser();
  const isMobile = useMediaQuery("(max-width: 48em)") ?? false;

  // States
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [opened, { toggle, close }] = useDisclosure(false);

  // Custom hooks para la lógica del curso
  const {
    event,
    modules,
    activities,
    hosts,
    quiz,
    userAttemptsList,
    loading,
  } = useCourseData(eventId || "", userId || "");

  const {
    courseProgress,
    activityAttendees,
  } = useCourseProgress(
    event,
    activities,
    userId || "",
    eventId || "",
    selectedActivity?._id || ""
  );

  // Handlers
  const handleActivitySelect = useCallback((activity: any) => {
    setSelectedActivity(activity);
    if (activity._id) setSearchParams({ activity: activity._id });
    if (isMobile) close();
  }, [isMobile, close, setSearchParams]);

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searchLoading,
    showSearchDropdown,
    setShowSearchDropdown,
    executeSearch,
  } = useCourseSearch(activities, hosts, event, handleActivitySelect);

  const handleBack = () => {
    if (searchParams.has("activity")) {
      setSearchParams({});
      setSelectedActivity(null);
    } else {
      navigate(`/organization/${organizationId}`);
    }
  };

  const handleBackHome = () => navigate(`/organization/${organizationId}`);

  // Cargar actividad desde URL
  useEffect(() => {
    const activityParam = searchParams.get("activity");
    if (activityParam && activities.length > 0) {
      const found = activities.find((a: any) => a._id === activityParam);
      if (found) setSelectedActivity(found);
    }
  }, [searchParams, activities.length]);

  // Loading state
  if (loading) {
    return (
      <Flex justify="center" align="center" h="60vh">
        <Loader size="lg" />
      </Flex>
    );
  }

  if (!event) {
    return <Text>Curso no encontrado</Text>;
  }

  // Renderizar
  return (
    <AppShell
      navbar={{
        width: { base: 280, sm: 300 },
        breakpoint: "sm",
        collapsed: { desktop: !opened, mobile: !opened },
      }}
      header={{ height: { base: 112, sm: 60 } }}
    >
      {/* HEADER */}
      <AppShell.Header style={{ borderBottom: "1px solid #e9ecef", backgroundColor: "#fff" }}>
        <CourseHeader
          event={event}
          opened={opened}
          onToggle={toggle}
          onBack={handleBack}
          onHomeClick={handleBackHome}
          isMobile={isMobile}
        />
      </AppShell.Header>

      {/* NAVBAR */}
      <AppShell.Navbar
        p="sm"
        style={{ borderRight: "1px solid #e9ecef" }}
        onMouseLeave={() => opened && close()}
      >
        <CourseNavbar
          modules={modules}
          activities={activities}
          hosts={hosts}
          activityAttendees={activityAttendees}
          onActivitySelect={handleActivitySelect}
          onClose={close}
        />
      </AppShell.Navbar>

      {/* MAIN */}
      <AppShell.Main style={{ backgroundColor: "#fafbfc" }}>
        <Container
          fluid
          px={{ base: "sm", sm: "md", md: "lg", lg: "xl" }}
          py="lg"
          maw={1000}
        >
          <CourseMainContent
            event={event}
            activities={activities}
            hosts={hosts}
            activityAttendees={activityAttendees}
            courseProgress={courseProgress}
            selectedActivity={selectedActivity}
            quiz={quiz}
            userAttempts={userAttemptsList}
            modules={modules}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchLoading={searchLoading}
            showSearchDropdown={showSearchDropdown}
            onActivitySelect={handleActivitySelect}
            onSearchChange={setSearchQuery}
            onSearchSubmit={executeSearch}
            onSearchClear={() => {
              setSearchQuery("");
              setShowSearchDropdown(false);
            }}
            onShowDropdownChange={setShowSearchDropdown}
            isMobile={isMobile}
          />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
