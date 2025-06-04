import { createContext, useContext, useState, ReactNode } from "react";
import { Modal } from "@mantine/core";
import AuthForm from "../components/AuthForm";

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

export const useAuthModal = (): AuthModalContextProps => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within an AuthModalProvider");
  }
  return context;
};
