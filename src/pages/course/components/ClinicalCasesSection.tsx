import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { FaClockRotateLeft, FaStethoscope } from "react-icons/fa6";
import { AvailableCase, fetchAvailableCases } from "../../../services/clinicalCaseService";

interface Props {
  organizationId: string;
  eventId: string;
}

/** Casos clínicos habilitados del curso, con el estado del último intento. */
export default function ClinicalCasesSection({ organizationId, eventId }: Props) {
  const navigate = useNavigate();
  const [cases, setCases] = useState<AvailableCase[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchAvailableCases(organizationId, eventId)
      .then((data) => !cancelled && setCases(data))
      .catch(() => !cancelled && setCases([]));
    return () => {
      cancelled = true;
    };
  }, [organizationId, eventId]);

  if (!cases.length) return null;

  const base = `/organization/${organizationId}/course/${eventId}/clinical-case`;

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Group gap="xs">
          <FaStethoscope size={18} />
          <Text fw={700}>Casos clínicos</Text>
        </Group>
        <Text size="xs" c="dimmed">
          Resuelve el caso etapa por etapa: un tutor te guía con preguntas y al final ves tu
          porcentaje de acierto en diagnóstico y acciones.
        </Text>
        {cases.map((c) => {
          const last = c.last_session;
          const inProgress = last?.status === "in_progress";
          const completed = last?.status === "completed";
          return (
            <Group
              key={c._id}
              justify="space-between"
              wrap="nowrap"
              p="sm"
              style={{ border: "1px solid #e9ecef", borderRadius: 10 }}
            >
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={600} lineClamp={2}>
                  {c.title}
                </Text>
                {c.summary && (
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {c.summary}
                  </Text>
                )}
                <Group gap={6} mt={4}>
                  <Badge size="xs" variant="light">
                    {c.total_stages} etapas
                  </Badge>
                  {inProgress && (
                    <Badge size="xs" variant="light" color="yellow">
                      En curso · etapa {last!.stage}
                    </Badge>
                  )}
                  {completed && last!.scores && (
                    <Badge size="xs" variant="light" color="teal">
                      {last!.scores.diagnosis !== null && last!.scores.diagnosis !== undefined
                        ? `Dx ${last!.scores.diagnosis}% · `
                        : ""}
                      Acciones {last!.scores.actions ?? "—"}%
                    </Badge>
                  )}
                </Group>
              </div>
              <Stack gap={6} align="flex-end">
                <Button
                  size="xs"
                  variant={completed ? "light" : "filled"}
                  onClick={() =>
                    navigate(
                      completed ? `${base}/${c._id}?session=${last!._id}` : `${base}/${c._id}`
                    )
                  }
                >
                  {inProgress ? "Continuar" : completed ? "Ver resultado" : "Resolver caso"}
                </Button>
                {c.followup?.unlocked &&
                  (() => {
                    const fu = c.followup!.last_session;
                    const fuDone = fu?.status === "completed";
                    return (
                      <Button
                        size="xs"
                        variant={fuDone ? "light" : "filled"}
                        color="indigo"
                        leftSection={<FaClockRotateLeft size={11} />}
                        onClick={() =>
                          navigate(
                            fuDone
                              ? `${base}/${c._id}?session=${fu!._id}`
                              : `${base}/${c._id}?part=followup`
                          )
                        }
                      >
                        {fu?.status === "in_progress"
                          ? "Continuar seguimiento"
                          : fuDone
                            ? `Seguimiento ${fu?.scores?.followup ?? fu?.scores?.overall ?? "—"}%`
                            : `Seguimiento${c.followup!.horizon ? ` (${c.followup!.horizon})` : ""}`}
                      </Button>
                    );
                  })()}
              </Stack>
            </Group>
          );
        })}
      </Stack>
    </Paper>
  );
}
