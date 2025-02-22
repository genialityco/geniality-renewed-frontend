import { Container, Title, Button } from "@mantine/core";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <Container>
      <Title>404 - Página no encontrada</Title>
      <Button component={Link} to="/" mt="md">
        Volver al inicio
      </Button>
    </Container>
  );
}
