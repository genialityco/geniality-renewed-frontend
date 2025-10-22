import { useEffect, useState } from "react";
import {
  Container,
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
import { fetchOrganizations } from "../services/organizationService";
import { Organization } from "../services/types";
import { useNavigate } from "react-router-dom";

const pickOrgImage = (org?: Organization) =>
  org?.styles?.event_image ||
  org?.styles?.banner_image_email ||
  org?.styles?.logo_url ||
  "";

/**
 * Listado de Organizaciones en formato tarjetas scrollables.
 * Sin botón de ADMIN (eso queda solo en MyOrganizations).
 */
export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrganizations();
      setOrganizations(data);
    } catch (e: any) {
      setError(e?.message ?? "Error cargando organizaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleVisit = (org: Organization) => {
    navigate(`/organization/${org._id}`);
  };

  if (loading) return <Loader />;
  if (error)
    return (
      <Stack pt="md">
        <Text c="red">Error: {error}</Text>
        <Button onClick={load} variant="light">
          Reintentar
        </Button>
      </Stack>
    );

  return (
    <Container pt="md">
      <Group justify="space-between" align="center" mb="sm">
        <Text size="xl" fw={700}>
          Organizaciones
        </Text>
        {/* {organizations.length > 0 && (
          <Button onClick={load} variant="subtle">
            Actualizar
          </Button>
        )} */}
      </Group>

      {organizations.length === 0 ? (
        <Text>No hay organizaciones para mostrar.</Text>
      ) : (
        <ScrollArea type="scroll" offsetScrollbars scrollbarSize={8}>
          <Box style={{ display: "flex", gap: 16, paddingBottom: 8 }}>
            {organizations.map((organization) => {
              const img = pickOrgImage(organization);
              return (
                <Card
                  key={organization._id}
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
                    </Group>
                  </Stack>
                </Card>
              );
            })}
          </Box>
        </ScrollArea>
      )}
    </Container>
  );
}
