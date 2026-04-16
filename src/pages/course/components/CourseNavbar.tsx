import { ScrollArea, Stack, Group, Text, Accordion, Badge } from "@mantine/core";
import { IconBook } from "@tabler/icons-react";
import { FaListUl, FaUsers } from "react-icons/fa6";
import { Module, Activity, Host } from "../../../services/types";
import ActivityRow from "../../../components/ActivityCard";
import {
  getModuleAverageProgress,
  sortModulesByOrder,
} from "../helpers/courseDetailHelpers";
import { Avatar } from "@mantine/core";

interface CourseNavbarProps {
  modules: Module[];
  activities: Activity[];
  hosts: Host[];
  activityAttendees: any[];
  onActivitySelect: (activity: Activity) => void;
  onClose: () => void;
}

export function CourseNavbar({
  modules,
  activities,
  hosts,
  activityAttendees,
  onActivitySelect,
  onClose,
}: CourseNavbarProps) {
  const orderedModules = sortModulesByOrder(modules);

  return (
    <ScrollArea h="100%" type="auto">
      <Stack gap="xs" pb="md">
        {/* Módulos */}
        {modules.length > 0 && (
          <>
            <Group gap={6} px="xs" pt="xs">
              <IconBook size={14} color="#868e96" />
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Módulos
              </Text>
            </Group>
            <Accordion variant="filled" radius="md" chevronSize={14}>
              {orderedModules.map((module) => {
                const modActivities = activities.filter(
                  (a) => a.module_id === module._id
                );
                const avgProgress = getModuleAverageProgress(
                  modActivities,
                  activityAttendees
                );

                return (
                  <Accordion.Item value={module._id} key={module._id}>
                    <Accordion.Control py={6}>
                      <Group justify="space-between" gap="xs" wrap="nowrap">
                        <Text size="sm" lineClamp={1}>
                          {module.module_name}
                        </Text>
                        {avgProgress > 0 && (
                          <Badge
                            size="xs"
                            variant="light"
                            color={avgProgress === 100 ? "green" : "yellow"}
                          >
                            {Math.round(avgProgress)}%
                          </Badge>
                        )}
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel px={4}>
                      <Stack gap={2}>
                        {modActivities.map((act) => (
                          <ActivityRow
                            key={act._id}
                            activity={act}
                            organizationId=""
                            onCardClick={() => {
                              onActivitySelect(act);
                              onClose();
                            }}
                          />
                        ))}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </>
        )}

        {/* Actividades */}
        <Group gap={6} px="xs" pt={modules.length ? "xs" : "xs"}>
          <FaListUl size={12} color="#868e96" />
          <Text size="xs" fw={700} c="dimmed" tt="uppercase">
            Actividades
          </Text>
        </Group>
        <Stack gap={2} px={4}>
          {activities.map((act) => (
            <ActivityRow
              key={act._id}
              activity={act}
              organizationId=""
              onCardClick={() => {
                onActivitySelect(act);
                onClose();
              }}
            />
          ))}
        </Stack>

        {/* Conferencistas */}
        {hosts.length > 0 && (
          <>
            <Group gap={6} px="xs" pt="xs">
              <FaUsers size={12} color="#868e96" />
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                Conferencistas
              </Text>
            </Group>
            <Stack gap={4} px={4}>
              {hosts.map((host) => (
                <Group key={host._id} gap="xs" px="xs" py={4}>
                  <Avatar src={host.image} size={28} radius="xl" />
                  <Text size="xs" lineClamp={1}>
                    {host.name}
                  </Text>
                </Group>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </ScrollArea>
  );
}
