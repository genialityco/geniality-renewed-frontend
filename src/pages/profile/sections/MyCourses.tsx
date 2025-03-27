import { useEffect, useState } from "react";
import {
  Text,
  Card,
  Loader,
  Stack,
  Image,
  ScrollArea,
  Box,
} from "@mantine/core";
import { useUser } from "../../../context/UserContext";
import { fetchCourseAttendeesByUser } from "../../../services/courseAttendeeService";
import { CourseAttendee } from "../../../services/types";

const MyCourses = () => {
  const { userId } = useUser();
  const [courses, setCourses] = useState<CourseAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        <ScrollArea type="scroll" offsetScrollbars scrollbarSize={8}>
          <Box style={{ display: "flex", gap: 16, paddingBottom: 8 }}>
            {courses.map((course) => (
              <Card
                key={course._id}
                shadow="lg"
                padding="0"
                style={{ width: 200, minWidth: 200 }}
                radius="md"
              >
                {course.event_id?.styles?.event_image && (
                  <Image
                    src={course.event_id.styles.event_image}
                    alt={course.event_id.name}
                    height={120}
                    radius="md"
                    style={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
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
      )}
    </Stack>
  );
};

export default MyCourses;
