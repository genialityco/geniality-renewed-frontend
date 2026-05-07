// app/profile/MyOrganizations.tsx
import { Text, Card, Stack, Image, Button, Group } from "@mantine/core";
import { useUser } from "../../../context/UserContext";
import { useOrganization, Organization as OrgContext } from "../../../context/OrganizationContext";
import { useNavigate } from "react-router-dom";
import {
  trackAdminOrganizationClick,
  trackVisitOrganization,
} from "../../../utils/analytics";

const isAuthorInArray = (author: any, userId: string | null): boolean => {
  if (!author || !userId) return false;
  
  // Si author es un array, verificar si userId está en el array
  if (Array.isArray(author)) {
    return author.some(id => String(id) === String(userId));
  }
  
  // Si author es un string
  if (typeof author === "string") {
    return String(author) === String(userId);
  }
  
  // Si author es un objeto con _id
  if (typeof author === "object" && author._id) {
    return String(author._id) === String(userId);
  }
  
  return false;
};

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

  const isAuthor = (org: OrgContext) => {
    return isAuthorInArray((org as any).author, userId);
  };

  const isAdmin = () => {
    if (!organizationUserData) return false;
    const rid =
      typeof organizationUserData.rol_id === "string"
        ? organizationUserData.rol_id
        : organizationUserData.rol_id?._id;
    return ["admin", "owner", "super_admin"].includes(
      String(rid || "").toLowerCase()
    );
  };

  const canAccessAdmin = (org: OrgContext) => {
    return isAuthor(org) || isAdmin();
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
