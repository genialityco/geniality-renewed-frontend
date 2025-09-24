import { useEffect, useState, useRef } from "react";
import {
  Text,
  Card,
  Loader,
  Stack,
  Image,
  ScrollArea,
  Box,
  ActionIcon,
} from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useUser } from "../../../context/UserContext";
import { fetchCourseAttendeesByUser } from "../../../services/courseAttendeeService";
import { CourseAttendee } from "../../../services/types";

const MyCourses = () => {
  const { userId } = useUser();
  const [courses, setCourses] = useState<CourseAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: -220, // Ancho de la tarjeta + gap
        behavior: "smooth",
      });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: 220, // Ancho de la tarjeta + gap
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const myCourses = await fetchCourseAttendeesByUser(userId as string);
        setCourses(myCourses);
      } catch (err: any) {
        console.error("Error al cargar cursos:", err);
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [userId]);

  useEffect(() => {
    checkScrollButtons();

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkScrollButtons);
      return () =>
        scrollElement.removeEventListener("scroll", checkScrollButtons);
    }
  }, [courses]);

  if (loading) return <Loader />;
  if (error) return <Text c="red">Error cargando cursos: {error}</Text>;

  return (
    <Stack pt="md">
      <Text size="xl" fw={700}>
        Mis Cursos
      </Text>

      {courses.length === 0 ? (
        <Text>No estás inscrito en ningún curso.</Text>
      ) : (
        <Box style={{ position: "relative" }}>
          {/* Botón izquierdo */}
          <ActionIcon
            variant="filled"
            size="lg"
            radius="xl"
            style={{
              position: "absolute",
              left: -12,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              opacity: canScrollLeft ? 1 : 0.3,
              pointerEvents: canScrollLeft ? "auto" : "none",
              transition: "opacity 0.2s ease",
            }}
            onClick={scrollLeft}
            disabled={!canScrollLeft}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>

          {/* Botón derecho */}
          <ActionIcon
            variant="filled"
            size="lg"
            radius="xl"
            style={{
              position: "absolute",
              right: -12,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              opacity: canScrollRight ? 1 : 0.3,
              pointerEvents: canScrollRight ? "auto" : "none",
              transition: "opacity 0.2s ease",
            }}
            onClick={scrollRight}
            disabled={!canScrollRight}
          >
            <IconChevronRight size={18} />
          </ActionIcon>

          {/* ScrollArea */}
          <ScrollArea
            type="scroll"
            offsetScrollbars
            scrollbarSize={8}
            viewportRef={scrollRef}
          >
            <Box style={{ display: "flex", gap: 16, paddingBottom: 8 }}>
              {courses.map((course) => (
                <Card
                  key={course._id}
                  shadow="lg"
                  padding="0"
                  style={{ width: 200, minWidth: 200 }}
                  radius="md"
                >
                  {course.event_id?.styles?.banner_image && (
                    <Image
                      src={course.event_id.styles.banner_image}
                      alt={course.event_id.name}
                      height={120}
                      radius="md"
                      style={{
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                      }}
                    />
                  )}
                  <Stack p="sm" gap={4}>
                    <Text fw={600} size="sm" truncate="end">
                      {course.event_id?.name || "Curso sin título"}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Progreso: {course.progress ?? 0}%
                    </Text>
                  </Stack>
                </Card>
              ))}
            </Box>
          </ScrollArea>
        </Box>
      )}
    </Stack>
  );
};

export default MyCourses;
