// src/components/WhatsAppSupportButton.tsx
import { Affix, ActionIcon, Tooltip } from "@mantine/core";
import { FaWhatsapp } from "react-icons/fa6";
import { useOrganization } from "../context/OrganizationContext";

const SUPPORT_PHONE = "573224387523"; // +57 322 4387523, formato E.164 sin "+"
const WHATSAPP_GREEN = "#25D366";

export default function WhatsAppSupportButton() {
  const { organization } = useOrganization();

  const message = organization?.name
    ? `Hola, necesito ayuda con ${organization.name}`
    : "Hola, necesito ayuda con GenCampus";

  const href = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;

  return (
    <Affix position={{ bottom: 20, right: 20 }} zIndex={199}>
      <Tooltip label="¿Necesitas ayuda? Escríbenos" position="left" withArrow>
        <ActionIcon
          component="a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Contactar soporte por WhatsApp"
          radius="xl"
          size={56}
          color={WHATSAPP_GREEN}
          variant="filled"
          style={{
            backgroundColor: WHATSAPP_GREEN,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <FaWhatsapp size={28} />
        </ActionIcon>
      </Tooltip>
    </Affix>
  );
}
