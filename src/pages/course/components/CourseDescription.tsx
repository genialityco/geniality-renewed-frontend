import { useEffect, useRef, useState } from "react";
import { Box, Text, UnstyledButton } from "@mantine/core";

interface CourseDescriptionProps {
  description?: string | null;
}

/**
 * Descripción del curso que se muestra bajo el título.
 * - Si está vacía no renderiza nada (no deja espacio).
 * - Colapsada muestra solo la primera línea con un difuminado.
 * - Se puede expandir/contraer solo si el texto realmente se desborda.
 */
export function CourseDescription({ description }: CourseDescriptionProps) {
  const text = (description || "").trim();
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Detecta si la primera línea se desborda (para mostrar el difuminado y el
  // botón "Ver más"). Se mide en estado colapsado (una sola línea).
  useEffect(() => {
    const measure = () => {
      const el = textRef.current;
      if (!el || expanded) return;
      setOverflowing(el.scrollWidth > el.clientWidth + 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text, expanded]);

  if (!text) return null;

  const showFade = !expanded && overflowing;

  return (
    <Box>
      <Text
        ref={textRef}
        size="sm"
        c="dimmed"
        onClick={() => overflowing && setExpanded((v) => !v)}
        style={{
          lineHeight: 1.5,
          whiteSpace: expanded ? "pre-wrap" : "nowrap",
          overflow: "hidden",
          cursor: overflowing ? "pointer" : "default",
          WebkitMaskImage: showFade
            ? "linear-gradient(to right, #000 65%, transparent 100%)"
            : undefined,
          maskImage: showFade
            ? "linear-gradient(to right, #000 65%, transparent 100%)"
            : undefined,
        }}
      >
        {text}
      </Text>

      {overflowing && (
        <UnstyledButton
          onClick={() => setExpanded((v) => !v)}
          mt={2}
          style={{ fontSize: 12, fontWeight: 600, color: "#228be6" }}
        >
          {expanded ? "Ver menos" : "Ver más"}
        </UnstyledButton>
      )}
    </Box>
  );
}
