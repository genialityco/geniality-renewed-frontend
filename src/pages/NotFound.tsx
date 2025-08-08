import { Container, Title, Button } from "@mantine/core";
import { useNavigate, useLocation } from "react-router-dom";
import { useOrganization } from "../context/OrganizationContext";

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { organization } = useOrganization();

  // Extrae organizationId de la URL si no está en contexto
  let orgId = organization?._id;
  if (!orgId) {
    const match = location.pathname.match(/\/organization\/([^/]+)/);
    if (match) orgId = match[1];
  }

  const handleGoHome = () => {
    if (orgId) {
      navigate(`/organization/${orgId}`);
    } else {
      navigate(`/`);
    }
  };

  return (
    <Container>
      <Title>404 - Página no encontrada</Title>
      <Button onClick={handleGoHome} mt="md">
        Volver al inicio
      </Button>
    </Container>
  );
}
