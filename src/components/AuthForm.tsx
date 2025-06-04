import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Group,
} from "@mantine/core";
import { useUser } from "../context/UserContext";

interface AuthFormProps {
  isRegister: boolean;
  toggleRegister: () => void;
  closeAuthModal?: () => void; // opcional: solo lo usará el modal
}

export default function AuthForm({
  isRegister,
  toggleRegister,
  closeAuthModal,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { signIn, signUp } = useUser();

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      closeAuthModal?.();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp(email, password, name);
      closeAuthModal?.();
    } catch (error) {
      console.error("Error al registrarse:", error);
    }
  };

  return (
    <>
      <TextInput
        label="Correo"
        placeholder="tu@email.com"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
        mb="sm"
      />
      <PasswordInput
        label="Contraseña"
        placeholder="********"
        value={password}
        onChange={(e) => setPassword(e.currentTarget.value)}
        mb="sm"
      />
      {isRegister && (
        <TextInput
          label="Nombre"
          placeholder="Tu nombre"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          mb="sm"
        />
      )}
      <Group mt="md">
        {isRegister ? (
          <Button onClick={handleSignUp}>Registrarse</Button>
        ) : (
          <Button onClick={handleSignIn}>Iniciar sesión</Button>
        )}
        <Button variant="subtle" onClick={toggleRegister}>
          {isRegister ? "Ya tengo cuenta" : "Crear cuenta"}
        </Button>
      </Group>
    </>
  );
}
