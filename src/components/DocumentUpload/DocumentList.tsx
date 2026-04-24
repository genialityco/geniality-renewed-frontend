import React, { useEffect, useState } from "react";
import {
  Stack,
  Group,
  Text,
  Badge,
  Button,
  Modal,
  ScrollArea,
  Loader,
  Center,
  Alert,
  ActionIcon,
  Tooltip,
  Table,
} from "@mantine/core";
import {
  IconDownload,
  IconTrash,
  IconAlertCircle,
  IconFile,
  IconRefresh,
  IconDatabaseImport,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DocumentService, Document } from "../../services/documentService";
import { ChatbotService } from "../../services/chatbotService";
import { DocumentUpload } from "./DocumentUpload";

interface DocumentListProps {
  organizationId: string;
  eventId?: string;
  moduleId?: string;
  activityId?: string;
}

const getFileTypeIcon = (mimetype: string) => {
  if (mimetype.includes("pdf")) return "📄";
  if (mimetype.includes("word") || mimetype.includes("document")) return "📝";
  if (mimetype.includes("powerpoint") || mimetype.includes("presentation"))
    return "📊";
  return "📎";
};

const getFileTypeLabel = (mimetype: string): string => {
  if (mimetype.includes("pdf")) return "PDF";
  if (mimetype.includes("word") || mimetype.includes("document")) return "Word";
  if (mimetype.includes("powerpoint") || mimetype.includes("presentation"))
    return "PowerPoint";
  return "Document";
};

export const DocumentList: React.FC<DocumentListProps> = ({
  organizationId,
  eventId,
  moduleId,
  activityId,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [contentModalOpen, setContentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null,
  );
  const [documentContent, setDocumentContent] = useState<string | null>(null);
  const [reindexing, setReindexing] = useState(false);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const docs = await DocumentService.getDocumentsByOrganization(
        organizationId,
        { eventId, moduleId, activityId },
      );

      setDocuments(docs);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Failed to load documents";
      setError(errorMsg);

      notifications.show({
        title: "Error",
        message: errorMsg,
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [organizationId, eventId, moduleId, activityId]);

  const handleViewContent = async (doc: Document) => {
    try {
      setSelectedDocument(doc);
      const { content } = await DocumentService.getDocumentContent(doc._id);
      setDocumentContent(content);
      setContentModalOpen(true);
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: "Failed to load document content",
        color: "red",
      });
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      await DocumentService.deleteDocument(docId);
      setDocuments(documents.filter((d) => d._id !== docId));

      notifications.show({
        title: "Success",
        message: "Document deleted successfully",
        color: "green",
      });
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: "Failed to delete document",
        color: "red",
      });
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await ChatbotService.reindexDocuments(organizationId);
      notifications.show({
        title: "Reindexación completada",
        message: "Los documentos han sido reindexados correctamente",
        color: "green",
        icon: <IconDatabaseImport />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "No se pudo reindexar los documentos",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setReindexing(false);
    }
  };

  const handleUploadSuccess = (newDocument: Document) => {
    setDocuments([newDocument, ...documents]);
    setUploadModalOpen(false);
  };

  if (loading) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconAlertCircle />} title="Error" color="red">
        {error}
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text fw={500} size="lg">
          Documents ({documents?.length})
        </Text>
        <Group gap="xs">
          <Button
            size="xs"
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={fetchDocuments}
          >
            Refresh
          </Button>
          <Button
            size="xs"
            leftSection={<IconDatabaseImport size={16} />}
            variant="light"
            color="violet"
            loading={reindexing}
            onClick={handleReindex}
          >
            Reindexar
          </Button>
          <Button
            size="sm"
            leftSection={<IconDownload size={16} />}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload Document
          </Button>
        </Group>
      </Group>

      {documents?.length === 0 ? (
        <Center py="lg">
          <Text c="dimmed">No documents yet</Text>
        </Center>
      ) : (
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Size</Table.Th>
                <Table.Th>Uploaded By</Table.Th>
                <Table.Th>Tags</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {documents.map((doc) => (
                <Table.Tr key={doc._id}>
                  <Table.Td>
                    <Group gap="xs">
                      <span>{getFileTypeIcon(doc.mimetype)}</span>
                      <Tooltip label={doc.originalName}>
                        <Text size="sm" truncate>
                          {doc.name}
                        </Text>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light">
                      {getFileTypeLabel(doc.mimetype)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {(doc.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{doc.uploadedBy.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      {doc.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} size="xs" variant="light">
                          {tag}
                        </Badge>
                      ))}
                      {doc.tags.length > 2 && (
                        <Badge size="xs" variant="light">
                          +{doc.tags.length - 2}
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="View Content">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          onClick={() => handleViewContent(doc)}
                        >
                          <IconFile size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="light"
                          onClick={() => handleDelete(doc._id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      )}

      <Modal
        opened={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Document"
        size="md"
      >
        <DocumentUpload
          organizationId={organizationId}
          eventId={eventId}
          moduleId={moduleId}
          activityId={activityId}
          onUploadSuccess={handleUploadSuccess}
          onClose={() => setUploadModalOpen(false)}
        />
      </Modal>

      <Modal
        opened={contentModalOpen}
        onClose={() => {
          setContentModalOpen(false);
          setDocumentContent(null);
        }}
        title={`${selectedDocument?.name || "Document"} - Content Preview`}
        size="lg"
      >
        {documentContent ? (
          <ScrollArea>
            <Text
              size="sm"
              style={{
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "400px",
              }}
            >
              {documentContent}
            </Text>
          </ScrollArea>
        ) : (
          <Center py="xl">
            <Loader />
          </Center>
        )}
      </Modal>
    </Stack>
  );
};
