// src/components/WhatsAppSupportButton.tsx
import { useEffect, useState } from "react";
import { Affix, ActionIcon, Button, Tooltip } from "@mantine/core";
import { FaWhatsapp } from "react-icons/fa6";
import { useOrganization } from "../context/OrganizationContext";

const SUPPORT_PHONE = "573224387523"; // +57 322 4387523, formato E.164 sin "+"
const WHATSAPP_GREEN = "#25D366";
const LABEL = "¿Necesitas ayuda?";
// Se muestra expandido con texto al entrar (login/registro/org) y luego se
// reduce a solo ícono para no estorbar en el resto de la navegación.
const COLLAPSE_DELAY_MS = 6000;

export default function WhatsAppSupportButton() {
  const { organization } = useOrganization();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setExpanded(false), COLLAPSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const message = organization?.name
    ? `Hola, estoy usando ${organization.name} y quisiera recibir acompañamiento del área de tecnología`
    : "Hola, necesito ayuda con GenCampus";

  const href = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
  const shadow = "0 4px 12px rgba(0, 0, 0, 0.25)";
  const linkProps = {
    component: "a" as const,
    href,
    target: "_blank",
    rel: "noopener noreferrer",
    "aria-label": "Contactar soporte por WhatsApp",
  };

  return (
    <Affix position={{ bottom: 20, right: 20 }} zIndex={199}>
      {expanded ? (
        <Button
          {...linkProps}
          style={{ backgroundColor: WHATSAPP_GREEN, boxShadow: shadow }}
          radius="xl"
          size="md"
          fw={600}
          leftSection={<FaWhatsapp size={20} />}
        >
          {LABEL}
        </Button>
      ) : (
        <Tooltip label={LABEL} position="left" withArrow>
          <ActionIcon
            {...linkProps}
            radius="xl"
            size={56}
            color={WHATSAPP_GREEN}
            variant="filled"
            style={{ backgroundColor: WHATSAPP_GREEN, boxShadow: shadow }}
          >
            <FaWhatsapp size={28} />
          </ActionIcon>
        </Tooltip>
      )}
    </Affix>
  );
}
