import { Container, Title, Button } from "@mantine/core";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <Container>
      <Title>Bienvenido a la Plataforma</Title>
      <Button component={Link} to="/organizations" mt="md">
        Ver Organizaciones
      </Button>
    </Container>
  );
}
