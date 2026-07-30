import { useEffect, useState } from "react";
import {
  Stack,
  Box,
  Text,
  Image,
  Title,
  Button,
  Divider,
  Group,
  Badge,
  SimpleGrid,
  Avatar,
  Modal,
  Accordion,
  Progress,
} from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import ActivityDetailWithTracker from "../../../components/ActivityDetailWithTracker";
import CourseProgressCard from "../../../components/CourseProgressCard";
import ActivityGrid from "../../../components/ActivityGrid";
import { CourseFooter } from "./CourseFooter";
import { CourseDescription } from "./CourseDescription";
import SearchBar, { SearchResult } from "../../organizationLanding/components/SearchBar";
import { Activity, Host, Event } from "../../../services/types";
import {
  getActivityProgress,
  getModuleAverageProgress,
  getModuleCompletionPercent,
  getProgressColor,
  isExamUnlocked,
  isExamPassed,
  isModuleExamUnlocked,
  getModuleQuiz,
  getCertificateGate,
  quizIdOf,
  sortActivitiesByDate,
  sortModulesByOrder,
} from "../helpers/courseDetailHelpers";
import { FaLock, FaCircleCheck } from "react-icons/fa6";
import { useUser } from "../../../context/UserContext";
import {
  generateCertificate,
  getCertificateDeliveryUrls,
  getCertificateTemplateByEvent,
  GeneratedCertificate,
  CertificateTemplate,
} from "../../../services/certificateService";

interface CourseMainContentProps {
  event: Event | null;
  activities: Activity[];
  hosts: Host[];
  activityAttendees: any[];
  courseProgress: number;
  selectedActivity: Activity | null;
  quiz: any;
  quizzes: any[];
  bestScoreByQuiz: Record<string, number | false>;
  userAttempts: any[];
  modules: any[];
  lockedActivityIds?: Set<string>;
  searchQuery: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  showSearchDropdown: boolean;
  onActivitySelect: (activity: Activity) => void;
  onSearchChange: (query: string) => void;
  onSearchSubmit: () => Promise<void>;
  onSearchClear: () => void;
  onShowDropdownChange: (show: boolean) => void;
  isMobile: boolean;
}

export function CourseMainContent({
  event,
  activities,
  hosts,
  activityAttendees,
  courseProgress,
  selectedActivity,
  quiz,
  quizzes,
  bestScoreByQuiz,
  userAttempts,
  modules,
  lockedActivityIds,
  searchQuery,
  searchResults,
  searchLoading,
  showSearchDropdown,
  onActivitySelect,
  onSearchChange,
  onSearchSubmit,
  onSearchClear,
  onShowDropdownChange,
  isMobile = false,
}: CourseMainContentProps) {
  const navigate = useNavigate();
  const { organizationId, eventId } = useParams();
  const { userId, name } = useUser();
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [hostModalOpened, setHostModalOpened] = useState(false);
  const [videoStartTime, setVideoStartTime] = useState<number | null>(null);
  const [examLockedOpened, setExamLockedOpened] = useState(false);
  const [certLockedOpened, setCertLockedOpened] = useState(false);
  const [modExamLockedMsg, setModExamLockedMsg] = useState<string | null>(null);
  const [certificateTemplate, setCertificateTemplate] =
    useState<CertificateTemplate | null>(null);
  const [generatingCert, setGeneratingCert] = useState(false);
  const [generatedCert, setGeneratedCert] =
    useState<GeneratedCertificate | null>(null);

  // Cargar la plantilla del certificado del curso (si existe).
  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    getCertificateTemplateByEvent(eventId)
      .then((tpl) => {
        if (!cancelled) setCertificateTemplate(tpl);
      })
      .catch(() => {
        if (!cancelled) setCertificateTemplate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Banner superior del curso. Nota: NO se usa `styles.event_image` como
  // respaldo, porque ese campo está reservado exclusivamente al logo del header
  // del curso (CourseHeader). Así el logo del header y el banner son
  // independientes.
  const bannerSrc = event?.styles?.banner_image || event?.picture;

  if (selectedActivity) {
    return (
      <Stack gap="lg">
        {/* Banner (mismo header que en el listado del curso) */}
        {bannerSrc && (
          <Box style={{ borderRadius: 16, overflow: "hidden" }}>
            <Image src={bannerSrc} fit="contain" w="100%" h="auto" />
          </Box>
        )}

        <ActivityDetailWithTracker
          activity={selectedActivity}
          eventId={event?._id || ""}
          shareUrl={`${window.location.origin}/organization/${organizationId}/course/${eventId}?activity=${selectedActivity._id}`}
          activities={activities}
          activityAttendees={activityAttendees}
          courseId={event?._id || ""}
          courseName={event?.name || ""}
          videoTime={videoStartTime}
          isLinear={!!event?.is_linear}
        />

        {/* Footer del curso (imagen configurada en el evento) */}
        <CourseFooter event={event} />
      </Stack>
    );
  }

  const qid = quiz?._id || quiz?.id;
  const attempted = userAttempts.some((a) => a.userId);

  // Compuerta del examen: por defecto siempre disponible. Si el admin activó
  // el requisito de avance mínimo, el botón sigue visible pero muestra el
  // mensaje configurado hasta alcanzar el porcentaje requerido.
  const examUnlocked = isExamUnlocked(event, courseProgress);
  const examRequired = Number.isFinite(event?.exam_min_progress)
    ? Number(event?.exam_min_progress)
    : 100;
  const examLockedMessage = !event?.exam_gating_enabled
    ? "El examen está bloqueado hasta que el administrador configure sus requisitos."
    : (event?.exam_locked_message || "").trim() ||
      `Debes completar al menos el ${examRequired}% del curso para realizar el examen. Vas en ${courseProgress}%.`;

  const goToQuiz = () => {
    navigate(
      attempted
        ? `/organization/${organizationId}/course/${eventId}/quiz/${qid}/result`
        : `/organization/${organizationId}/course/${eventId}/quiz/${qid}`
    );
  };
  const completedCount = activities.filter(
    (activity) => getActivityProgress(activityAttendees, activity._id) >= 100
  ).length;

  // ── Certificado ──────────────────────────────────────────────────────
  const quizzesExist = quizzes.length > 0;
  const certGate = getCertificateGate({
    event,
    quizzes,
    bestScoreByQuiz,
    completedActivities: completedCount,
  });
  // % promedio de aprobación para el campo del certificado.
  const numericScores = quizzes
    .map((q: any) => bestScoreByQuiz[quizIdOf(q)])
    .filter((s): s is number => typeof s === "number");
  const avgApprovalPercentage = numericScores.length
    ? Math.round(numericScores.reduce((a, b) => a + b, 0) / numericScores.length)
    : 100;
  // Mostrar el CTA de certificado cuando existe plantilla y existe al menos
  // un examen del curso (general o de módulo).
  const showCertificateCTA = !!certificateTemplate && quizzesExist;
  // El certificado se desbloquea según las reglas del admin.
  // Por defecto (sin configuración activa) queda bloqueado.
  const certUnlocked = certGate.unlocked;
  const certificateLockedMessage =
    (event?.certificate_locked_message || "").trim() ||
    certGate.message ||
    "El certificado aún no está disponible. El administrador debe configurar los requisitos para desbloquearlo.";

  const ensureCertificate = async (): Promise<GeneratedCertificate | null> => {
    if (generatedCert) return generatedCert;
    if (!certificateTemplate || !eventId) return null;
    try {
      setGeneratingCert(true);
      const data: Record<string, string | number> = {};
      certificateTemplate.fields.forEach((field) => {
        if (field.dataSource === "userName") data[field.name] = name || "Participante";
        else if (field.dataSource === "eventName") data[field.name] = event?.name || "Evento";
        else if (field.dataSource === "approvalPercentage")
          data[field.name] = `${avgApprovalPercentage}%`;
        else if (field.defaultValue) data[field.name] = field.defaultValue;
      });
      const generated = await generateCertificate({
        eventId,
        format: certificateTemplate.format,
        data,
        userId: userId || undefined,
      });
      setGeneratedCert(generated);
      return generated;
    } catch {
      return null;
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleOpenCertificate = async (mode: "view" | "download") => {
    if (!certUnlocked) {
      setCertLockedOpened(true);
      return;
    }
    const cert = await ensureCertificate();
    if (!cert) return;
    const { viewUrl, downloadUrl } = getCertificateDeliveryUrls(cert);
    window.open(
      mode === "view" ? viewUrl : downloadUrl,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const orderedModules = sortModulesByOrder(modules);
  const moduleIds = new Set(orderedModules.map((module) => module._id));

  const orderedActivitiesForLearning =
    orderedModules.length > 0
      ? [
          ...orderedModules.flatMap((module) =>
            sortActivitiesByDate(
              activities.filter(
                (activity: Activity) => activity.module_id === module._id
              )
            )
          ),
          ...sortActivitiesByDate(
            activities.filter(
              (activity: Activity) =>
                !activity.module_id || !moduleIds.has(activity.module_id)
            )
          ),
        ]
      : sortActivitiesByDate(activities);

  const handleStartLearning = () => {
    if (!orderedActivitiesForLearning.length) return;

    const inProgressActivities = orderedActivitiesForLearning.filter(
      (activity) => {
        const progress = getActivityProgress(activityAttendees, activity._id);
        return progress > 0 && progress < 100;
      }
    );

    const lastInProgress = inProgressActivities.at(-1);

    const lastCompletedIndex = orderedActivitiesForLearning
      .map((activity) => getActivityProgress(activityAttendees, activity._id))
      .reduce(
        (lastIndex, progress, index) => (progress >= 100 ? index : lastIndex),
        -1
      );

    const nextAfterLastCompleted =
      lastCompletedIndex >= 0 &&
      lastCompletedIndex < orderedActivitiesForLearning.length - 1
        ? orderedActivitiesForLearning[lastCompletedIndex + 1]
        : null;

    const firstPending = orderedActivitiesForLearning.find((activity) => {
      const progress = getActivityProgress(activityAttendees, activity._id);
      return progress < 100;
    });

    onActivitySelect(
      nextAfterLastCompleted ||
        lastInProgress ||
        firstPending ||
        orderedActivitiesForLearning[0]
    );
  };

  return (
    <Stack gap="lg">
      {/* Banner */}
      {bannerSrc && (
        <Box style={{ borderRadius: 16, overflow: "hidden" }}>
          <Image src={bannerSrc} fit="cover" mah={280} w="100%" />
        </Box>
      )}

      {/* Título */}
      <Box>
        <Title order={2} size="h2" mb="xs">
          {event?.name}
        </Title>
        <CourseDescription description={event?.description} />
      </Box>

      {/* Progreso */}
      <CourseProgressCard
        courseProgress={courseProgress}
        completedActivities={completedCount}
        totalActivities={activities.length}
        courseName={event?.name || ""}
        onStartLearning={handleStartLearning}
      />

      {/* Quiz CTA */}
      {quiz && qid && (() => {
        // El examen queda bloqueado solo si aún no se ha intentado y no se
        // alcanzó el avance requerido. Ver resultados siempre está disponible.
        const locked = !attempted && !examUnlocked;
        return (
          <Button
            fullWidth
            size="md"
            variant={attempted ? "light" : locked ? "default" : "filled"}
            color={attempted ? "teal" : "blue"}
            leftSection={locked ? <FaLock size={14} /> : undefined}
            onClick={() => {
              if (locked) {
                setExamLockedOpened(true);
                return;
              }
              goToQuiz();
            }}
          >
            {attempted
              ? "Ver mis resultados del examen →"
              : locked
                ? "Realizar examen (bloqueado)"
                : "Realizar examen →"}
          </Button>
        );
      })()}

      {/* Certificado CTA (cursos con exámenes de módulo o con reglas activas) */}
      {showCertificateCTA &&
        (certUnlocked ? (
          <Group grow>
            <Button
              size="md"
              variant="light"
              color="grape"
              loading={generatingCert}
              onClick={() => handleOpenCertificate("view")}
            >
              Ver certificado
            </Button>
            <Button
              size="md"
              color="grape"
              loading={generatingCert}
              onClick={() => handleOpenCertificate("download")}
            >
              Descargar certificado
            </Button>
          </Group>
        ) : (
          <Button
            fullWidth
            size="md"
            variant="default"
            leftSection={<FaLock size={14} />}
            onClick={() => setCertLockedOpened(true)}
          >
            Certificado
          </Button>
        ))}

      {/* Búsqueda */}
      <SearchBar
        value={searchQuery}
        onChange={(e) => {
          onSearchChange(e.currentTarget.value);
          if (e.currentTarget.value.trim()) {
            onShowDropdownChange(true);
          } else {
            onShowDropdownChange(false);
            setVideoStartTime(null);
          }
        }}
        onSearch={() => {
          void onSearchSubmit();
        }}
        onClear={() => {
          onSearchClear();
          onShowDropdownChange(false);
          setVideoStartTime(null);
        }}
        results={searchResults}
        loading={searchLoading}
        onResultSelect={(result) => {
          if (result.type === "transcript" && result.startTime !== undefined) {
            setVideoStartTime(result.startTime);
          } else {
            setVideoStartTime(null);
          }
          onShowDropdownChange(false);
        }}
        showDropdown={showSearchDropdown}
        onShowDropdownChange={onShowDropdownChange}
      />

      {/* Módulos o Actividades */}
      {modules.length > 0 ? (
        <>
          <Group justify="space-between" align="center" mb="lg">
            <Text fw={800} size="xl">
              📖 Módulos
            </Text>
            <Badge size="lg" variant="light" color="blue" radius="md">
              {modules.length} módulos
            </Badge>
          </Group>
          <Accordion variant="separated" multiple radius="lg">
            {orderedModules.map((module) => {
              const modActivities = activities.filter(
                (a: Activity) => a.module_id === module._id
              );
              if (modActivities.length === 0) return null;

              const avgProgress = getModuleAverageProgress(
                modActivities,
                activityAttendees
              );
              const color = getProgressColor(avgProgress);

              return (
                <Accordion.Item value={module._id} key={module._id}>
                  <Accordion.Control>
                    <Group justify="space-between" gap="md" wrap="nowrap">
                      <Text fw={700} size="sm">
                        📖 {module.module_name}
                      </Text>
                      <Group gap="xs" wrap="nowrap">
                        <Text size="xs" c="dimmed">
                          {modActivities.length} actividades
                        </Text>
                        <Badge size="sm" variant="light" color={color}>
                          {avgProgress === 100
                            ? "Completado"
                            : avgProgress > 0
                              ? `${Math.round(avgProgress)}%`
                              : "Nuevo"}
                        </Badge>
                      </Group>
                    </Group>
                    <Progress
                      value={avgProgress}
                      size={3}
                      color={color}
                      mt={6}
                      radius="xl"
                    />
                  </Accordion.Control>
                  <Accordion.Panel pt="md">
                    {/* Examen del módulo (si existe) */}
                    {(() => {
                      const modQuiz = getModuleQuiz(quizzes, module._id);
                      if (!modQuiz) return null;
                      const mqId = quizIdOf(modQuiz);
                      const best = bestScoreByQuiz[mqId] ?? false;
                      const passed = isExamPassed(modQuiz, best);
                      const attemptedMod = best !== false;
                      const quizBase = `/organization/${organizationId}/course/${eventId}/quiz/${mqId}`;

                      // Compuerta: bloqueado hasta ver las actividades del módulo.
                      const modCompletion = getModuleCompletionPercent(
                        modActivities,
                        activityAttendees
                      );
                      const modLocked =
                        !attemptedMod &&
                        !isModuleExamUnlocked(event, modCompletion);
                      const modRequired = Number.isFinite(
                        event?.module_exam_min_progress
                      )
                        ? Number(event?.module_exam_min_progress)
                        : 100;
                      const modLockedMessage =
                        !event?.module_exam_gating_enabled
                          ? "El examen del módulo está bloqueado hasta que el administrador configure sus requisitos."
                          : (event?.module_exam_locked_message || "").trim() ||
                            `Completa al menos el ${modRequired}% de las actividades de este módulo para presentar su examen (llevas ${modCompletion}%).`;

                      return (
                        <Group
                          justify="space-between"
                          wrap="nowrap"
                          mb="md"
                          p="sm"
                          style={{
                            border: "1px solid #e9ecef",
                            borderRadius: 10,
                            backgroundColor: passed ? "#f0fdf4" : "#f8f9fa",
                          }}
                        >
                          <Group gap="xs" wrap="nowrap">
                            <Text fw={600} size="sm">
                              📝 Examen del módulo
                            </Text>
                            {passed ? (
                              <Badge
                                color="teal"
                                variant="light"
                                leftSection={<FaCircleCheck size={11} />}
                              >
                                Aprobado
                              </Badge>
                            ) : attemptedMod ? (
                              <Badge color="yellow" variant="light">
                                Intentado
                              </Badge>
                            ) : modLocked ? (
                              <Badge
                                color="gray"
                                variant="light"
                                leftSection={<FaLock size={10} />}
                              >
                                Bloqueado
                              </Badge>
                            ) : null}
                          </Group>
                          {modLocked ? (
                            <Button
                              size="xs"
                              variant="default"
                              leftSection={<FaLock size={12} />}
                              onClick={() =>
                                setModExamLockedMsg(modLockedMessage)
                              }
                            >
                              Examen del módulo
                            </Button>
                          ) : (
                            <Button
                              size="xs"
                              variant={attemptedMod ? "light" : "filled"}
                              color={passed ? "teal" : "blue"}
                              onClick={() =>
                                navigate(
                                  attemptedMod ? `${quizBase}/result` : quizBase
                                )
                              }
                            >
                              {attemptedMod
                                ? "Ver resultados"
                                : "Realizar examen del módulo"}
                            </Button>
                          )}
                        </Group>
                      );
                    })()}

                    <ActivityGrid
                      activities={modActivities}
                      activityAttendees={activityAttendees}
                      selectedActivityId={undefined}
                      onActivitySelect={onActivitySelect}
                      hosts={hosts}
                      lockedActivityIds={lockedActivityIds}
                    />
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </>
      ) : (
        <>
          <Group justify="space-between" align="center" mb="lg">
            <Text fw={800} size="xl">
              ▶ Actividades
            </Text>
            <Badge size="lg" variant="light" color="blue" radius="md">
              {activities.length} actividades
            </Badge>
          </Group>
          <ActivityGrid
            activities={activities}
            activityAttendees={activityAttendees}
            selectedActivityId={undefined}
            onActivitySelect={onActivitySelect}
            hosts={hosts}
            lockedActivityIds={lockedActivityIds}
          />
        </>
      )}

      {/* Conferencistas */}
      {hosts.length > 0 && (
        <>
          <Divider my="xl" />
          <Box>
            <Group justify="space-between" align="center" mb="md">
              <Text fw={700} size="lg">
                🎤 Conferencistas
              </Text>
              <Text size="xs" c="dimmed">
                {hosts.length} conferencistas
              </Text>
            </Group>
            <SimpleGrid
              cols={{ base: 2, xs: 3, sm: 4, md: 5 }}
              spacing="md"
            >
              {hosts.map((host) => (
                <Box
                  key={host._id}
                  onClick={() => {
                    setSelectedHost(host);
                    setHostModalOpened(true);
                  }}
                  style={{
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: "#fff",
                    border: "1px solid #e9ecef",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow =
                      "0 8px 16px rgba(0, 0, 0, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 4px rgba(0, 0, 0, 0.1)";
                  }}
                >
                  <Stack align="center" gap={8}>
                    <Avatar
                      src={host.image}
                      alt={host.name}
                      size={isMobile ? 96 : 120}
                      radius="xl"
                      style={{
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                        border: "3px solid #e7f5ff",
                      }}
                    />
                    <Text
                      size="sm"
                      ta="center"
                      fw={600}
                      lineClamp={2}
                      style={{ lineHeight: 1.3 }}
                    >
                      {host.name}
                    </Text>
                    {host.profession && (
                      <Text
                        size="xs"
                        c="blue"
                        ta="center"
                        lineClamp={1}
                        fw={500}
                      >
                        {host.profession}
                      </Text>
                    )}
                    <Badge size="sm" variant="light">
                      Ver perfil →
                    </Badge>
                  </Stack>
                </Box>
              ))}
            </SimpleGrid>
          </Box>
        </>
      )}

      {/* Footer del curso (imagen configurada en el evento) */}
      <CourseFooter event={event} />

      {/* Modal: examen bloqueado por avance insuficiente */}
      <Modal
        opened={examLockedOpened}
        onClose={() => setExamLockedOpened(false)}
        title={
          <Group gap="xs">
            <FaLock size={16} />
            <Text fw={700}>Examen bloqueado</Text>
          </Group>
        }
        centered
        radius="lg"
      >
        <Stack gap="md">
          <Text style={{ lineHeight: 1.6 }}>{examLockedMessage}</Text>
          <Progress
            value={courseProgress}
            size="lg"
            radius="xl"
            color={courseProgress >= examRequired ? "green" : "blue"}
          />
          <Text size="sm" c="dimmed">
            Avance actual: {courseProgress}% · Requerido: {examRequired}%
          </Text>
          <Button fullWidth onClick={() => setExamLockedOpened(false)}>
            Entendido
          </Button>
        </Stack>
      </Modal>

      {/* Modal: examen de módulo bloqueado */}
      <Modal
        opened={!!modExamLockedMsg}
        onClose={() => setModExamLockedMsg(null)}
        title={
          <Group gap="xs">
            <FaLock size={16} />
            <Text fw={700}>Examen de módulo bloqueado</Text>
          </Group>
        }
        centered
        radius="lg"
      >
        <Stack gap="md">
          <Text style={{ lineHeight: 1.6 }}>
            {modExamLockedMsg ||
              "Este examen de módulo está bloqueado por requisitos de avance."}
          </Text>
          <Button fullWidth onClick={() => setModExamLockedMsg(null)}>
            Entendido
          </Button>
        </Stack>
      </Modal>

      {/* Modal: certificado bloqueado por reglas */}
      <Modal
        opened={certLockedOpened}
        onClose={() => setCertLockedOpened(false)}
        title={
          <Group gap="xs">
            <FaLock size={16} />
            <Text fw={700}>Certificado bloqueado</Text>
          </Group>
        }
        centered
        radius="lg"
      >
        <Stack gap="md">
          <Text style={{ lineHeight: 1.6 }}>{certificateLockedMessage}</Text>
          {certGate.pending.length > 0 && (
            <Stack gap={4}>
              {certGate.pending.map((p, i) => (
                <Text key={i} size="sm" c="dimmed">
                  • {p}
                </Text>
              ))}
            </Stack>
          )}
          <Button fullWidth onClick={() => setCertLockedOpened(false)}>
            Entendido
          </Button>
        </Stack>
      </Modal>

      {/* Host Modal */}
      <Modal
        opened={hostModalOpened}
        onClose={() => setHostModalOpened(false)}
        title="Perfil del Conferencista"
        size="lg"
        centered
        radius="lg"
      >
        {selectedHost && (
          <Stack gap="xl">
            <Group gap="lg" align="flex-start">
              <Avatar src={selectedHost.image} size={140} radius="xl" />
              <Stack gap="md" style={{ flex: 1 }}>
                <div>
                  <Text fw={900} size="lg">
                    {selectedHost.name}
                  </Text>
                  {selectedHost.profession && (
                    <Badge size="xl" variant="light" color="blue" mt="md">
                      {selectedHost.profession}
                    </Badge>
                  )}
                </div>
                {selectedHost.description && (
                  <Text size="md" style={{ lineHeight: 1.8 }}>
                    {selectedHost.description}
                  </Text>
                )}
              </Stack>
            </Group>
            {activities
              .filter((a) => selectedHost.activities_ids?.includes(a._id))
              .length > 0 && (
              <>
                <Divider />
                <div>
                  <Text fw={800} size="md" mb="lg" tt="uppercase" c="dimmed">
                    🎥 Actividades (
                    {
                      activities.filter((a) =>
                        selectedHost.activities_ids?.includes(a._id)
                      ).length
                    }
                    )
                  </Text>
                  <Stack gap="md">
                    {activities
                      .filter((a) =>
                        selectedHost.activities_ids?.includes(a._id)
                      )
                      .map((activity) => {
                        const progress =
                          activityAttendees.find(
                            (a: any) => a.activity_id === activity._id
                          )?.progress || 0;
                        const isDone = progress === 100;
                        const color = getProgressColor(progress);

                        return (
                          <Box
                            key={activity._id}
                            onClick={() => {
                              onActivitySelect(activity);
                              setHostModalOpened(false);
                            }}
                            p="lg"
                            style={{
                              borderRadius: 10,
                              backgroundColor: isDone ? "#f0fdf4" : "#fafbfc",
                              border: `2px solid ${isDone ? "#dcfce7" : "#e9ecef"}`,
                              transition: "all 0.2s ease",
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#e7f5ff";
                              e.currentTarget.style.borderColor = "#74c0fc";
                              e.currentTarget.style.transform = "translateY(-3px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = isDone
                                ? "#f0fdf4"
                                : "#fafbfc";
                              e.currentTarget.style.borderColor = isDone
                                ? "#dcfce7"
                                : "#e9ecef";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                          >
                            <Group justify="space-between" align="center">
                              <Text size="md" fw={700} lineClamp={2}>
                                {activity.name}
                              </Text>
                              <Badge color={color} size="md" variant="light">
                                {isDone
                                  ? "✓ Completada"
                                  : progress > 0
                                    ? `${Math.round(progress)}%`
                                    : "Nueva"}
                              </Badge>
                            </Group>
                            {progress > 0 && (
                              <Progress
                                value={progress}
                                size="sm"
                                color={color}
                                mt="sm"
                                radius="xl"
                              />
                            )}
                          </Box>
                        );
                      })}
                  </Stack>
                </div>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
