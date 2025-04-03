import { useEffect, useState } from "react";
import { Container, Title, List, Loader, Button } from "@mantine/core";
import { fetchOrganizations } from "../services/organizationService";
import { Organization } from "../services/types";
import { Link, useNavigate } from "react-router-dom";

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations().then((data) => {
      setOrganizations(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader />;

  return (
    <Container>
      <Title>Organizaciones</Title>

      <List>
        {organizations.map((org) => (
          <List.Item key={org._id}>
            {/* Este link puede ir hacia la "landing" o detalle público */}
            <Link to={`/organizations/${org._id}`}>{org.name}</Link>

            {/* Botón o link adicional que lleve a la sección admin de esa organización */}
            <Button
              variant="outline"
              size="xs"
              ml="md"
              onClick={() => navigate(`/admin/organizations/${org._id}`)}
            >
              Admin
            </Button>
          </List.Item>
        ))}
      </List>
    </Container>
  );
}
