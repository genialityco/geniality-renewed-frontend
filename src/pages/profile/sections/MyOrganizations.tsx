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

const pickOrgImage = (org?: Organization) =>
  org?.styles?.event_image ||
  org?.styles?.banner_image_email ||
  org?.styles?.logo_url ||
  "";

export default function MyOrganizations() {
  const { userId } = useUser();
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

  // ⬇️ Deja aquí la navegación que uses (Next Router, React Router, etc.)
  const handleVisit = (org: Organization) => {
    console.log("Visitar", org);
    // TODO: redirigir a la vista pública de la organización
    // Ejemplos:
    // router.push(`/organizations/${org._id}`)
    // navigate(`/organizations/${org._id}`)
    // window.location.href = `/organizations/${org._id}`
  };

  const handleAdmin = (org: Organization) => {
    console.log("Admin de", org);
    // TODO: redirigir al panel admin de la organización
    // Ejemplos:
    // router.push(`/admin/organizations/${org._id}`)
    // navigate(`/admin/organizations/${org._id}`)
    // window.location.href = `/admin/organizations/${org._id}`
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
              const isAdminOwner =
                organization?.author &&
                userId &&
                String(organization.author) === String(userId);

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

                      {isAdminOwner && (
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
