/// <reference types="multer" />
import React, { useCallback, useEffect, useState } from 'react';
import {
  Group,
  Text,
  Button,
  Stack,
  FileInput,
  Select,
  Alert,
  Progress,
  Badge,
  Card,
  Tooltip,
  SegmentedControl,
  Loader,
  Center,
} from '@mantine/core';
import { IconUpload, IconAlertCircle, IconCheck, IconFile } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { DocumentService } from '../../services/documentService';
import { fetchEventsByOrganizer } from '../../services/eventService';
import { getActivitiesByEvent } from '../../services/activityService';
import { Event, Activity } from '../../services/types';

interface DocumentUploadProps {
  organizationId: string;
  eventId?: string;
  moduleId?: string;
  activityId?: string;
  onUploadSuccess?: (document: any) => void;
  onClose?: () => void;
}

const SUPPORTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
];

const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
  'application/vnd.ms-powerpoint': 'PowerPoint',
};

type Scope = 'organization' | 'event' | 'activity';

function defaultScope(props: Pick<DocumentUploadProps, 'eventId' | 'activityId'>): Scope {
  if (props.activityId) return 'activity';
  if (props.eventId) return 'event';
  return 'organization';
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  organizationId,
  eventId: propEventId,
  moduleId,
  activityId: propActivityId,
  onUploadSuccess,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<Scope>(() =>
    defaultScope({ eventId: propEventId, activityId: propActivityId })
  );

  const [events, setEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(propEventId ?? null);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(propActivityId ?? null);

  // Load events when scope requires it
  useEffect(() => {
    if (scope === 'organization') return;
    setEventsLoading(true);
    fetchEventsByOrganizer(organizationId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [scope, organizationId]);

  // Load activities when an event is selected in activity scope
  useEffect(() => {
    if (scope !== 'activity' || !selectedEventId) {
      setActivities([]);
      return;
    }
    setActivitiesLoading(true);
    getActivitiesByEvent(selectedEventId)
      .then(setActivities)
      .catch(() => setActivities([]))
      .finally(() => setActivitiesLoading(false));
  }, [scope, selectedEventId]);

  const handleScopeChange = (val: string) => {
    setScope(val as Scope);
    setSelectedEventId(null);
    setSelectedActivityId(null);
    setActivities([]);
  };

  const handleFileChange = (selectedFile: File | null) => {
    setError(null);
    if (!selectedFile) { setFile(null); return; }
    if (!SUPPORTED_TYPES.includes(selectedFile.type)) {
      setError(`Tipo de archivo no soportado. Formatos válidos: PDF, Word, PowerPoint`);
      setFile(null);
      return;
    }
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('El archivo supera el límite de 50MB');
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleUpload = useCallback(async () => {
    if (!file) { setError('Selecciona un archivo'); return; }
    if (scope === 'event' && !selectedEventId) { setError('Selecciona un evento'); return; }
    if (scope === 'activity' && !selectedActivityId) { setError('Selecciona una actividad'); return; }

    setUploading(true);
    setError(null);

    try {
      setUploadProgress(20);

      const response = await DocumentService.uploadDocument(organizationId, file, {
        eventId: scope !== 'organization' ? (selectedEventId ?? undefined) : undefined,
        moduleId,
        activityId: scope === 'activity' ? (selectedActivityId ?? undefined) : undefined,
        tags,
      });

      setUploadProgress(100);

      notifications.show({
        title: 'Éxito',
        message: `Documento "${file.name}" cargado correctamente`,
        color: 'green',
        icon: <IconCheck />,
      });

      if (onUploadSuccess) onUploadSuccess(response);

      setFile(null);
      setTags([]);
      setNewTag('');

      if (onClose) setTimeout(onClose, 1000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Error al cargar';
      setError(errorMsg);
      notifications.show({ title: 'Error', message: errorMsg, color: 'red', icon: <IconAlertCircle /> });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [file, organizationId, scope, selectedEventId, selectedActivityId, moduleId, tags, onUploadSuccess, onClose]);

  const eventOptions = events.map((e) => ({ value: String(e._id), label: e.name }));
  const activityOptions = activities.map((a) => ({ value: String(a._id ?? a.id), label: a.name }));

  return (
    <Stack gap="md">
      {error && (
        <Alert icon={<IconAlertCircle />} title="Error" color="red">
          {error}
        </Alert>
      )}

      <FileInput
        label="Documento"
        description="PDF, Word o PowerPoint (máx. 50MB)"
        placeholder="Haz clic para seleccionar"
        value={file}
        onChange={handleFileChange}
        accept=".pdf,.doc,.docx,.ppt,.pptx"
        disabled={uploading}
        leftSection={<IconUpload size={16} />}
        rightSection={
          file ? (
            <Tooltip label={FILE_TYPE_LABELS[file.type] || file.type}>
              <Badge size="sm" variant="light">
                {FILE_TYPE_LABELS[file.type] || file.name.split('.').pop()}
              </Badge>
            </Tooltip>
          ) : null
        }
      />

      {file && (
        <Card withBorder p="sm" bg="blue.0">
          <Group gap="xs">
            <IconFile size={20} />
            <div>
              <Text size="sm" fw={500}>{file.name}</Text>
              <Text size="xs" c="dimmed">{(file.size / 1024 / 1024).toFixed(2)} MB</Text>
            </div>
          </Group>
        </Card>
      )}

      {/* Scope selector */}
      <div>
        <Text size="sm" fw={500} mb={6}>Asociar a</Text>
        <SegmentedControl
          fullWidth
          value={scope}
          onChange={handleScopeChange}
          disabled={uploading}
          data={[
            { label: 'Organización', value: 'organization' },
            { label: 'Evento', value: 'event' },
            { label: 'Actividad', value: 'activity' },
          ]}
        />
      </div>

      {/* Event selector */}
      {scope !== 'organization' && (
        eventsLoading ? (
          <Center><Loader size="sm" /></Center>
        ) : (
          <Select
            label="Evento"
            placeholder="Selecciona un evento"
            data={eventOptions}
            value={selectedEventId}
            onChange={setSelectedEventId}
            disabled={uploading}
            searchable
            required
          />
        )
      )}

      {/* Activity selector */}
      {scope === 'activity' && selectedEventId && (
        activitiesLoading ? (
          <Center><Loader size="sm" /></Center>
        ) : (
          <Select
            label="Actividad"
            placeholder="Selecciona una actividad"
            data={activityOptions}
            value={selectedActivityId}
            onChange={setSelectedActivityId}
            disabled={uploading || activitiesLoading}
            searchable
            required
          />
        )
      )}

      {/* Tags */}
      <div>
        <Text size="sm" fw={500} mb={4}>Tags (opcional)</Text>
        <Group gap={4} mb={8}>
          {tags.map((tag) => (
            <Badge
              key={tag}
              rightSection={
                <button
                  onClick={() => setTags(tags.filter((t) => t !== tag))}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 4 }}
                >
                  ×
                </button>
              }
            >
              {tag}
            </Badge>
          ))}
        </Group>
        <Group gap={4}>
          <input
            type="text"
            placeholder="Agregar tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            style={{ flex: 1, padding: '6px 8px', borderRadius: '4px', border: '1px solid #ccc' }}
            disabled={uploading}
          />
          <Button size="xs" onClick={handleAddTag} disabled={uploading || !newTag.trim()}>
            Agregar
          </Button>
        </Group>
      </div>

      {uploading && <Progress value={uploadProgress} />}

      <Group justify="flex-end" gap="xs">
        {onClose && (
          <Button variant="default" onClick={onClose} disabled={uploading}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleUpload} disabled={!file || uploading} loading={uploading}>
          Cargar documento
        </Button>
      </Group>
    </Stack>
  );
};
