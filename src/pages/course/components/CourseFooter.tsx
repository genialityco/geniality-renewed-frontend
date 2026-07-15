import { Box, Image } from "@mantine/core";
import { Event } from "../../../services/types";

interface CourseFooterProps {
  event: Event | null;
}

/**
 * Footer del curso: imagen configurada en el evento (styles.banner_footer).
 * Se muestra en el flujo del contenido, debajo de módulos/actividades/speakers,
 * a todo el ancho — de forma simétrica al banner superior del curso. Si el
 * evento no tiene footer configurado, no renderiza nada.
 */
export function CourseFooter({ event }: CourseFooterProps) {
  const footerUrl = event?.styles?.banner_footer;
  if (!footerUrl) return null;

  return (
    <Box style={{ borderRadius: 16, overflow: "hidden" }}>
      <Image src={footerUrl} alt="Footer del curso" fit="contain" w="100%" />
    </Box>
  );
}
