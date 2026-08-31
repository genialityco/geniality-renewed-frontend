// src/utils/toast.tsx
// Servicio centralizado de notificaciones (toasts) para el administrador.
// Muestra notificaciones grandes y consistentes al guardar / actualizar datos
// de eventos, actividades, hosts, examen, certificado, módulos, etc.
import { notifications } from "@mantine/notifications";
import { FaCircleCheck, FaTrash, FaCircleInfo } from "react-icons/fa6";

// Estilos compartidos para que el toast se vea "grande" y destacado.
const bigStyles = {
  root: {
    padding: "18px 20px",
    minHeight: 72,
    minWidth: 360,
  },
  title: { fontSize: 18, fontWeight: 700 },
  description: { fontSize: 15 },
  icon: { width: 34, height: 34, minWidth: 34 },
} as const;

/** Notificación grande de éxito al guardar/actualizar. */
export function toastSuccess(title: string, message?: string) {
  notifications.show({
    title,
    message: message ?? "",
    color: "teal",
    icon: <FaCircleCheck size={20} />,
    autoClose: 3500,
    withBorder: true,
    radius: "md",
    styles: bigStyles,
  });
}

/** Notificación grande para datos actualizados (amarillo). */
export function toastUpdated(title: string, message?: string) {
  notifications.show({
    title,
    message: message ?? "Los cambios se actualizaron correctamente.",
    color: "yellow",
    icon: <FaCircleCheck size={20} />,
    autoClose: 3500,
    withBorder: true,
    radius: "md",
    styles: bigStyles,
  });
}

/** Notificación grande para datos eliminados (rojo). */
export function toastDeleted(title: string, message?: string) {
  notifications.show({
    title,
    message: message ?? "El registro se eliminó correctamente.",
    color: "red",
    icon: <FaTrash size={18} />,
    autoClose: 3500,
    withBorder: true,
    radius: "md",
    styles: bigStyles,
  });
}

/** Notificación grande de error / fallo (negro con emoji de alerta). */
export function toastError(title = "Ocurrió un error", message?: string) {
  notifications.show({
    title,
    message: message ?? "Revisa la consola o inténtalo de nuevo.",
    color: "dark",
    icon: <span style={{ fontSize: 20, lineHeight: 1 }}>⚠️</span>,
    autoClose: 5000,
    withBorder: true,
    radius: "md",
    styles: {
      ...bigStyles,
      root: { ...bigStyles.root, backgroundColor: "#1a1b1e" },
      title: { ...bigStyles.title, color: "#fff" },
      description: { ...bigStyles.description, color: "#e9ecef" },
    },
  });
}

/** Notificación informativa grande. */
export function toastInfo(title: string, message?: string) {
  notifications.show({
    title,
    message: message ?? "",
    color: "blue",
    icon: <FaCircleInfo size={20} />,
    autoClose: 3500,
    withBorder: true,
    radius: "md",
    styles: bigStyles,
  });
}

/**
 * Helper de conveniencia para el caso más común: "X guardado/actualizado
 * correctamente".
 * @param entity nombre legible ya conjugado (ej: "Actividad creada", "Evento actualizado").
 * @param message mensaje secundario opcional; por defecto uno genérico.
 */
export function toastSaved(entity: string, message?: string) {
  toastSuccess(entity, message ?? "Los cambios se guardaron correctamente.");
}
