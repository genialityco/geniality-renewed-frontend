// src/pages/AdminOrganizationEvents/ChangePaymentPlanModal.tsx
import { useState, useEffect } from "react";
import { Modal, NumberInput, Button, Group } from "@mantine/core";

interface ChangePaymentPlanModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (data: { days: number; price: number }) => void;
  /** Opcional: valores iniciales al editar un plan existente */
  initialDays?: number;
  initialPrice?: number;
}

export default function ChangePaymentPlanModal({
  opened,
  onClose,
  onSave,
  initialDays = 365,
  initialPrice = 0,
}: ChangePaymentPlanModalProps) {
  const [days, setDays] = useState(initialDays);
  const [price, setPrice] = useState(initialPrice);

  // Si cambian las props iniciales, resetea los inputs
  useEffect(() => {
    setDays(initialDays);
    setPrice(initialPrice);
  }, [initialDays, initialPrice]);

  const handleSave = () => {
    // Validaciones simples
    if (days < 1) return;
    if (price < 0) return;
    onSave({ days, price });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Actualizar Payment Plan"
      centered
      size="sm"
    >
      <NumberInput
        label="Días de vigencia"
        description="Número de días desde hoy en que vence el plan"
        min={1}
        value={days}
        onChange={(val) =>
          setDays(typeof val === "number" ? val : Number(val) || 1)
        }
        mb="md"
      />

      {/* <NumberInput
        label="Precio"
        description="Precio en la moneda configurada (e.g. COP)"
        min={0}
        step={1000}
        value={price}
        onChange={(val) => setPrice(val || 0)}
        mb="md"
      />*/}

      <Group justify="right" p="sm">
        <Button variant="subtle" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave}>Guardar</Button>
      </Group>
    </Modal>
  );
}
