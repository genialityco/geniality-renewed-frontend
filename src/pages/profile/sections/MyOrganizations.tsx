// app/profile/MyOrganizations.tsx
import { useEffect, useState } from "react";
import {
  Text,
  Card,
  Loader,
  Stack,
  Image,
  ScrollArea,
  Box,
  Button,
  Group,
} from "@mantine/core";
import { useUser } from "../../../context/UserContext"; // ajusta ruta
import { fetchOrganizationsByUser } from "../../../services/organizationUserService"; // ajusta ruta
import { UserOrganizationCard, Organization } from "../../../services/types"; // ajusta ruta
import { useNavigate } from "react-router-dom";

const pickOrgImage = (org?: Organization) =>
  org?.styles?.event_image ||
  org?.styles?.banner_image_email ||
  org?.styles?.logo_url ||
  "";

// Extrae el id del autor ya sea string u objeto { _id: string }
const getAuthorId = (author: any): string | undefined => {
  if (!author) return undefined;
  if (typeof author === "string") return author;
  if (typeof author === "object" && author._id) return String(author._id);
  return undefined;
};

export default function MyOrganizations() {
  const { userId } = useUser();
  const navigate = useNavigate();

  const [items, setItems] = useState<UserOrganizationCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizationsByUser(userId);
      setItems((data ?? []) as UserOrganizationCard[]);
    } catch (e: any) {
      setError(e?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleVisit = (org: Organization) => {
    navigate(`/organization/${org._id}`);
  };

  const handleAdmin = (org: Organization) => {
    navigate(`/organization/${org._id}/admin`);
  };

  const isAuthor = (org: Organization) => {
    const authorId = getAuthorId(org.author);
    return userId && authorId && String(userId) === String(authorId);
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <Stack pt="md">
        <Text c="red">Error cargando organizaciones: {error}</Text>
        <Button onClick={load} variant="light">
          Reintentar
        </Button>
      </Stack>
    );

  return (
    <Stack pt="md">
      <Group justify="space-between" align="center">
        <Text size="xl" fw={700}>
          Mis Organizaciones
        </Text>
        {items.length > 0 && (
          <Button onClick={load} variant="subtle">
            Actualizar
          </Button>
        )}
      </Group>

      {items.length === 0 ? (
        <Text>No estás vinculado a ninguna organización.</Text>
      ) : (
        <ScrollArea type="scroll" offsetScrollbars scrollbarSize={8}>
          <Box style={{ display: "flex", gap: 16, paddingBottom: 8 }}>
            {items.map(({ organization, membership }) => {
              const img = pickOrgImage(organization);

              return (
                <Card
                  key={`${organization._id}-${membership._id}`}
                  shadow="lg"
                  padding="0"
                  style={{ width: 240, minWidth: 240, position: "relative" }}
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
                    <Text
                      fw={600}
                      size="sm"
                      truncate="end"
                      title={organization.name}
                    >
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

                      {isAuthor(organization) && (
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
              );
            })}
          </Box>
        </ScrollArea>
      )}
    </Stack>
  );
}
