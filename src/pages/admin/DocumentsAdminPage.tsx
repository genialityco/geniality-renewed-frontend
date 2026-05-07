import React, { useState } from 'react';
import { Container, Tabs, Card, Text, Group, Button, Modal, Stack } from '@mantine/core';
import { DocumentUpload, DocumentList } from '../../components/DocumentUpload';
import { IconUpload, IconFile } from '@tabler/icons-react';
import { useOrganization } from '../../context/OrganizationContext';

export const DocumentsAdminPage: React.FC = () => {
  const { organization } = useOrganization();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  if (!organization) {
    return (
      <Container>
        <Text c="red">No organization selected</Text>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <h1>Document Management</h1>
            <Text c="dimmed">
              Upload and manage documents for {organization.name}
            </Text>
          </div>
          <Button
            leftSection={<IconUpload size={18} />}
            onClick={() => setUploadModalOpen(true)}
          >
            Upload Document
          </Button>
        </Group>

        <Tabs defaultValue="list" orientation="vertical">
          <Tabs.List>
            <Tabs.Tab value="list" leftSection={<IconFile size={14} />}>
              All Documents
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="list">
            <Card withBorder p="lg">
              <DocumentList organizationId={organization._id} />
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      <Modal
        opened={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Document"
        size="md"
      >
        <DocumentUpload
          organizationId={organization._id}
          onUploadSuccess={() => setUploadModalOpen(false)}
          onClose={() => setUploadModalOpen(false)}
        />
      </Modal>
    </Container>
  );
};
