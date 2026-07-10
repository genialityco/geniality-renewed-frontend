// app/profile/MyOrganizations.tsx
import { Text, Card, Stack, Image, Button, Group } from "@mantine/core";
import { useUser } from "../../../context/UserContext";
import { useOrganization, Organization as OrgContext } from "../../../context/OrganizationContext";
import { useNavigate } from "react-router-dom";
import {
  trackAdminOrganizationClick,
  trackVisitOrganization,
} from "../../../utils/analytics";
import { isOrgAuthor, hasAdminRole } from "../../../utils/orgAccess";

export default function MyOrganizations() {
  const { userId, organizationUserData } = useUser();
  const { organization } = useOrganization();
  const navigate = useNavigate();

  const handleVisit = (org: OrgContext) => {
    trackVisitOrganization(org._id, org.name);
    navigate(`/organization/${org._id}`);
  };

  const handleAdmin = (org: OrgContext) => {
    trackAdminOrganizationClick(org._id);
    navigate(`/organization/${org._id}/admin`);
  };

  const canAccessAdmin = (org: OrgContext) => {
    return isOrgAuthor((org as any).author, userId) || hasAdminRole(organizationUserData);
  };

  if (!organization) {
    return (
      <Stack pt="md">
        <Text size="xl" fw={700}>
          Mis Organizaciones
        </Text>
        <Text>No estás vinculado a ninguna organización.</Text>
      </Stack>
    );
  }

  const img = organization.image;

  return (
    <Stack pt="md">
      <Text size="xl" fw={700}>
        Mis Organizaciones
      </Text>

      <Card
        shadow="lg"
        padding="0"
        style={{ width: 240, minWidth: 240 }}
        radius="md"
        withBorder
      >
        {img && (
          <Image
            src={img}
            alt={organization.name}
            height={120}
            radius="md"
            style={{
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              objectFit: "cover",
            }}
          />
        )}

        <Stack p="sm" gap={8}>
          <Text fw={600} size="sm" truncate="end" title={organization.name}>
            {organization.name}
          </Text>

          <Group justify="space-between" mt="xs">
            <Button
              size="xs"
              variant="default"
              onClick={() => handleVisit(organization)}
            >
              Visitar
            </Button>

            {canAccessAdmin(organization) && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleAdmin(organization)}
              >
                ADMIN
              </Button>
            )}
          </Group>
        </Stack>
      </Card>
    </Stack>
  );
}
