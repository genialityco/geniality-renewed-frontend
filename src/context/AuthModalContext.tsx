import { createContext, useContext, useState, ReactNode } from "react";
import { Modal, TextInput, PasswordInput, Button, Group } from "@mantine/core";
import { useUser } from "./UserContext";

interface AuthModalContextProps {
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  toggleRegister: () => void;
}

const AuthModalContext = createContext<AuthModalContextProps | undefined>(
  undefined
);

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegister, setIsRegister] = useState(false);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);
  const toggleRegister = () => setIsRegister((prev) => !prev);

  return (
    <AuthModalContext.Provider
      value={{ openAuthModal, closeAuthModal, isAuthModalOpen, toggleRegister }}
    >
      {children}
      <Modal
        opened={isAuthModalOpen}
        onClose={closeAuthModal}
        withCloseButton={true}
        title={isRegister ? "Regístrate" : "Inicia sesión"}
        centered
      >
        <AuthForm
          isRegister={isRegister}
          toggleRegister={toggleRegister}
          closeAuthModal={closeAuthModal}
        />
      </Modal>
    </AuthModalContext.Provider>
  );
};

interface AuthFormProps {
  isRegister: boolean;
  toggleRegister: () => void;
  closeAuthModal: () => void;
}

const AuthForm = ({
  isRegister,
  toggleRegister,
  closeAuthModal,
}: AuthFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { signIn, signUp } = useUser();

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
      closeAuthModal();
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp(email, password, name);
      closeAuthModal();
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
};

export const useAuthModal = (): AuthModalContextProps => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
};
