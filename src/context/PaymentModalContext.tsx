import { createContext, useContext, useState, ReactNode } from "react";
import { Modal } from "@mantine/core";
import MembershipPayment from "../components/MembershipPayment";

interface PaymentModalContextProps {
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  isPaymentModalOpen: boolean;
}

const PaymentModalContext = createContext<PaymentModalContextProps | undefined>(undefined);

export const PaymentModalProvider = ({ children }: { children: ReactNode }) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const openPaymentModal = () => setIsPaymentModalOpen(true);
  const closePaymentModal = () => setIsPaymentModalOpen(false);

  return (
    <PaymentModalContext.Provider value={{ openPaymentModal, closePaymentModal, isPaymentModalOpen }}>
      {children}
      <Modal
        opened={isPaymentModalOpen}
        onClose={closePaymentModal}
        title="Pagar Membresía"
        centered
        size="md"
      >
        <MembershipPayment />
      </Modal>
    </PaymentModalContext.Provider>
  );
};

export const usePaymentModal = (): PaymentModalContextProps => {
  const context = useContext(PaymentModalContext);
  if (!context) {
    throw new Error("usePaymentModal must be used within a PaymentModalProvider");
  }
  return context;
};
