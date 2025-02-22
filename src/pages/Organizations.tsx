import { useEffect, useState } from "react";
import { Container, Title, List, Loader } from "@mantine/core";
import { fetchOrganizations } from "../services/organizationService";
import { Organization } from "../services/types";
import { Link } from "react-router-dom";

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

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
            <Link to={`/organizations/${org._id}`}>{org.name}</Link>
          </List.Item>
        ))}
      </List>
    </Container>
  );
}
