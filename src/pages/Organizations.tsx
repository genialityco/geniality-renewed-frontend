import { useEffect, useState } from "react";
import { Container, Title, List, Loader, Button, Modal, PasswordInput, Group, Text } from "@mantine/core";
import { fetchOrganizations } from "../services/organizationService";
import { Organization } from "../services/types";
import { Link, useNavigate } from "react-router-dom";

export default function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [adminOrgId, setAdminOrgId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations().then((data) => {
      setOrganizations(data);
      setLoading(false);
    });
  }, []);

  const handleAdminClick = (orgId: string) => {
    setAdminOrgId(orgId);
    setPassword("");
    setError("");
    setModalOpen(true);
  };

  const handlePasswordConfirm = () => {
    if (password === "ace2040") {
      setModalOpen(false);
      navigate(`/organizations/${adminOrgId}/admin`);
    } else {
      setError("Contraseña incorrecta");
    }
  };

  if (loading) return <Loader />;

  return (
    <Container>
      <Title>Organizaciones</Title>

      <List>
        {organizations.map((org) => (
          <List.Item key={org._id}>
            <Link to={`/organizations/${org._id}`}>{org.name}</Link>
            <Button
              variant="outline"
              size="xs"
              ml="md"
              onClick={() => handleAdminClick(org._id)}
            >
              Admin
            </Button>
          </List.Item>
        ))}
      </List>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Acceso a administración"
        centered
      >
        <PasswordInput
          label="Contraseña de admin"
          placeholder="Ingresa la contraseña"
          value={password}
          onChange={(e) => setPassword(e.currentTarget.value)}
          onKeyDown={e => { if (e.key === "Enter") handlePasswordConfirm(); }}
          error={error}
        />
        <Group mt="md" justify="right">
          <Button variant="default" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={handlePasswordConfirm}>Entrar</Button>
        </Group>
        {error && <Text color="red" mt="sm">{error}</Text>}
      </Modal>
    </Container>
  );
}
