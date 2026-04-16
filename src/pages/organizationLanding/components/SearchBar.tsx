import {
  TextInput,
  Button,
  Box,
  ActionIcon,
  useMantineTheme,
  Stack,
  ScrollArea,
  UnstyledButton,
  Group,
  Badge,
  ThemeIcon,
  Tabs,
  Text,
  Avatar,
  Loader,
  Image,
  Highlight,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconSearch, IconX, IconClock } from "@tabler/icons-react";
import { useState, useMemo } from "react";
import { FaPlay } from "react-icons/fa6";

export interface SearchResult {
  id: string;
  type: "activity" | "host" | "transcript" | "default";
  title: string;
  subtitle?: string;
  image?: string;
  badge?: string;
  onClick: () => void;
  segments?: Array<{
    segmentId?: string;
    text: string;
    startTime?: number;
    endTime?: number;
    score?: number;
  }>;
  startTime?: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

export interface SearchBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearch: () => void;
  onClear: () => void;
  results?: SearchResult[];
  loading?: boolean;
  onResultSelect?: (result: SearchResult) => void;
  showDropdown?: boolean;
  onShowDropdownChange?: (show: boolean) => void;
}

export default function SearchBar({
  value,
  onChange,
  onSearch,
  onClear,
  results = [],
  loading = false,
  onResultSelect,
  showDropdown = false,
  onShowDropdownChange,
}: SearchBarProps) {
  const theme = useMantineTheme();
  const isMobile = useMediaQuery(`(max-width: ${theme.breakpoints.sm})`);
  const [activeTab, setActiveTab] = useState<string | null>("all");

  const resultCounts = useMemo(() => {
    return {
      activities: results.filter((r) => r.type === "activity").length,
      hosts: results.filter((r) => r.type === "host").length,
      segments: results.filter((r) => r.type === "transcript").length,
    };
  }, [results]);

  const filteredResults = useMemo(() => {
    if (activeTab === "activities") {
      return results.filter((r) => r.type === "activity");
    } else if (activeTab === "hosts") {
      return results.filter((r) => r.type === "host");
    } else if (activeTab === "segments") {
      return results.filter((r) => r.type === "transcript");
    }
    return results;
  }, [results, activeTab]);

  const handleResultClick = (result: SearchResult) => {
    onResultSelect?.(result);
    result.onClick();
  };

  const handleSegmentClick = (
    e: React.MouseEvent,
    result: SearchResult,
    segment: NonNullable<SearchResult["segments"]>[number],
  ) => {
    e.stopPropagation();
    onResultSelect?.({
      ...result,
      startTime: segment.startTime ?? result.startTime,
    });
    result.onClick();
  };

  const showTabs =
    resultCounts.activities > 0 ||
    resultCounts.hosts > 0 ||
    resultCounts.segments > 0;

  return (
    <Box
      style={{
        position: "relative",
        borderBottom: "1px solid #e9ecef",
        backgroundColor: "#fff",
      }}
    >
      <Box
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 8,
          padding: isMobile ? "12px 8px" : "16px 12px",
          backgroundColor: "#fff",
        }}
      >
        <TextInput
          placeholder={
            isMobile
              ? "Buscar..."
              : "Buscar actividades, conferencistas, o información del curso..."
          }
          value={value}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSearch();
          }}
          onFocus={() => {
            if (value.trim()) onShowDropdownChange?.(true);
          }}
          onBlur={() => {
            setTimeout(() => onShowDropdownChange?.(false), 200);
          }}
          size={isMobile ? "sm" : "md"}
          radius="xl"
          style={{ flex: 1, maxWidth: isMobile ? "100%" : 600 }}
          leftSection={<IconSearch size={17} />}
          rightSection={
            value ? (
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="xl"
                onClick={onClear}
                tabIndex={-1}
              >
                <IconX size={15} />
              </ActionIcon>
            ) : null
          }
        />

        {!isMobile && (
          <Button onClick={onSearch} radius="xl" size="md" px="xl">
            Buscar
          </Button>
        )}

        {isMobile && (
          <ActionIcon
            onClick={onSearch}
            radius="xl"
            size="lg"
            variant="filled"
            color="blue"
            aria-label="Buscar"
          >
            <IconSearch size={18} />
          </ActionIcon>
        )}
      </Box>

      {/* Dropdown de resultados */}
      {showDropdown && (
        <Box
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            border: "1px solid #e9ecef",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            zIndex: 1000,
            maxHeight: 400,
          }}
        >
          {loading ? (
            <Box p="md" ta="center">
              <Loader size="sm" />
            </Box>
          ) : results.length === 0 && value ? (
            <Box p="md" ta="center">
              <Text size="sm" c="dimmed">
                No se encontraron resultados para "{value}"
              </Text>
            </Box>
          ) : results.length === 0 ? null : showTabs ? (
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              defaultValue="all"
              style={{ height: "100%" }}
            >
              <Tabs.List style={{ borderBottom: "1px solid #e9ecef" }}>
                <Tabs.Tab
                  value="all"
                  rightSection={<Badge size="sm">{results.length}</Badge>}
                >
                  Todos
                </Tabs.Tab>
                {resultCounts.activities > 0 && (
                  <Tabs.Tab
                    value="activities"
                    rightSection={
                      <Badge size="sm" color="blue">
                        {resultCounts.activities}
                      </Badge>
                    }
                  >
                    Actividades
                  </Tabs.Tab>
                )}
                {resultCounts.hosts > 0 && (
                  <Tabs.Tab
                    value="hosts"
                    rightSection={
                      <Badge size="sm" color="green">
                        {resultCounts.hosts}
                      </Badge>
                    }
                  >
                    Conferencistas
                  </Tabs.Tab>
                )}
                {resultCounts.segments > 0 && (
                  <Tabs.Tab
                    value="segments"
                    rightSection={
                      <Badge size="sm" color="purple">
                        {resultCounts.segments}
                      </Badge>
                    }
                  >
                    Segmentos
                  </Tabs.Tab>
                )}
              </Tabs.List>

              <Tabs.Panel value={activeTab || "all"} pt={0}>
                <ScrollArea style={{ height: 300 }} type="auto">
                  <Stack gap="xs" p="xs">
                    {filteredResults.map((result) => (
                      <UnstyledButton
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        style={{
                          padding: 8,
                          borderRadius: 6,
                          backgroundColor: "#f8f9fa",
                          border: "1px solid #e9ecef",
                          transition: "all 0.15s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          const bgColors: Record<string, string> = {
                            activity: "#e7f5ff",
                            host: "#f0f9ff",
                            transcript: "#f3e9ff",
                            default: "#f0f0f0",
                          };
                          e.currentTarget.style.backgroundColor =
                            bgColors[result.type] || bgColors.default;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#f8f9fa";
                        }}
                      >
                        <Group gap="xs" wrap="nowrap">
                          {result.image && result.type !== "host" ? (
                            <Image
                              src={result.image}
                              alt={result.title}
                              w={64}
                              h={40}
                              radius="sm"
                              fit="cover"
                            />
                          ) : result.image ? (
                            <Avatar
                              src={result.image}
                              size="sm"
                              radius="xl"
                              name={result.title}
                            />
                          ) : (
                            <ThemeIcon
                              size="sm"
                              radius="md"
                              color={
                                result.type === "activity"
                                  ? "blue"
                                  : result.type === "host"
                                    ? "green"
                                    : "purple"
                              }
                              variant="light"
                            >
                              {result.type === "activity" ? (
                                <FaPlay size={10} />
                              ) : result.type === "host" ? (
                                <IconSearch size={10} />
                              ) : (
                                <IconSearch size={10} />
                              )}
                            </ThemeIcon>
                          )}
                          <Stack gap={0} style={{ flex: 1 }}>
                            <Text size="sm" fw={600} lineClamp={1}>
                              {result.title}
                            </Text>
                            {result.subtitle && (
                              <Text size="xs" c="dimmed" lineClamp={1}>
                                {result.subtitle}
                              </Text>
                            )}
                            {result.segments && result.segments.length > 0 && (
                              <Box
                                p="xs"
                                style={{
                                  backgroundColor: "#faf9ff",
                                  borderLeft: "2px solid #b599cc",
                                  borderRadius: 4,
                                  marginTop: 4,
                                }}
                              >
                                <Stack
                                  gap={4}
                                  style={{ maxHeight: 140, overflowY: "auto" }}
                                >
                                  {result.segments.map((segment, idx) => (
                                    <UnstyledButton
                                      key={
                                        segment.segmentId ||
                                        `${result.id}-segment-${idx}`
                                      }
                                      onClick={(e) =>
                                        handleSegmentClick(e, result, segment)
                                      }
                                      style={{
                                        width: "100%",
                                        textAlign: "left",
                                      }}
                                    >
                                      <Group gap={4} mb={2}>
                                        <IconClock size={11} color="#74c0fc" />
                                        <Text size="xs" c="blue" fw={500}>
                                          {typeof segment.startTime === "number"
                                            ? formatTime(segment.startTime)
                                            : "--:--"}
                                          {typeof segment.endTime === "number"
                                            ? ` - ${formatTime(segment.endTime)}`
                                            : ""}
                                        </Text>
                                      </Group>
                                      <Highlight
                                        highlight={value || ""}
                                        size="xs"
                                        c="dimmed"
                                        lineClamp={2}
                                      >
                                        {segment.text}
                                      </Highlight>
                                    </UnstyledButton>
                                  ))}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                          {result.badge && (
                            <Badge size="xs" variant="light">
                              {result.badge}
                            </Badge>
                          )}
                        </Group>
                      </UnstyledButton>
                    ))}
                  </Stack>
                </ScrollArea>
              </Tabs.Panel>
            </Tabs>
          ) : null}
        </Box>
      )}
    </Box>
  );
}
