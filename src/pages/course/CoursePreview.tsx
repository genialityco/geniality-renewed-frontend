// src/pages/course/CoursePreview.tsx
// Vista previa (solo admin) de cómo se ve un curso/evento para el usuario final.
// Reutiliza CourseDetail directamente: muestra el curso con sus módulos, hosts
// y actividades, y (con ?activity=<id>) la actividad con su video.
// A diferencia de la ruta pública, NO exige membresía ni pago (va protegida por
// RequireAdmin) y no usa el wrapper con rastreador de tiempo.
import { FaEye } from "react-icons/fa6";
import CourseDetail from "./CourseDetail";

export default function CoursePreview() {
  return (
    <div style={{ position: "relative" }}>
      {/* Cinta fija que deja claro que es una simulación */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3000,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 16px",
          borderRadius: "0 0 10px 10px",
          backgroundColor: "#f59f00",
          color: "#1a1b1e",
          fontWeight: 700,
          fontSize: 13,
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        <FaEye size={14} />
        Modo vista previa
      </div>

      <CourseDetail />
    </div>
  );
}
