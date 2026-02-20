import { Box, Stack } from "@mantine/core";
import { ContentBlock, TextBlock } from "./QuizEditor/types";

interface BlocksRendererProps {
  blocks: ContentBlock[];
  inline?: boolean; // Si true, renderiza todo en una línea
}

/**
 * Componente que renderiza bloques de contenido en modo lectura
 * Soporta: texto (con varios formatos), imágenes y videos
 */
export default function BlocksRenderer({
  blocks,
  inline = false,
}: BlocksRendererProps) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  const renderBlock = (block: ContentBlock) => {
    if (block.type === "text") {
      const textBlock = block as TextBlock;
      const fontSize = 
        textBlock.format === "h1" ? "1.875rem" :
        textBlock.format === "h2" ? "1.25rem" :
        textBlock.format === "h3" ? "1.125rem" :
        "1rem";

      const fontWeight = ["h1", "h2", "h3"].includes(textBlock.format)
        ? "bold"
        : "normal";

      const fontStyle = textBlock.format === "quote" ? "italic" : "normal";

      const fontFamily = textBlock.format === "code" ? "monospace" : "inherit";

      const backgroundColor =
        textBlock.format === "code" ? "#f3f4f6" : "transparent";

      const padding = textBlock.format === "code" ? "0.5rem" : "0";

      const borderLeft =
        textBlock.format === "quote" ? "4px solid #3b82f6" : "none";

      const paddingLeft = textBlock.format === "quote" ? "1rem" : "0";

      const prefix =
        textBlock.listType === "bullet"
          ? "• "
          : textBlock.listType === "ordered"
            ? "1. "
            : "";

      return (
        <Box
          key={block.id}
          style={{
            fontSize,
            fontWeight: fontWeight as any,
            fontStyle: fontStyle as any,
            fontFamily,
            backgroundColor,
            padding,
            borderLeft,
            paddingLeft,
            wordWrap: "break-word",
            whiteSpace: "pre-wrap",
          }}
        >
          {prefix}
          {textBlock.content}
        </Box>
      );
    }

    if (block.type === "image") {
      return (
        <Box key={block.id} my="md">
          <img
            src={block.url}
            alt={block.caption || "Image"}
            style={{
              maxWidth: "100%",
              maxHeight: "300px",
              borderRadius: "8px",
            }}
          />
          {block.caption && (
            <Box
              style={{
                fontSize: "0.875rem",
                color: "#666",
                marginTop: "0.5rem",
              }}
            >
              {block.caption}
            </Box>
          )}
        </Box>
      );
    }

    if (block.type === "video") {
      // Detectar si es YouTube, Vimeo o video directo
      const isYoutube =
        block.url.includes("youtube.com") || block.url.includes("youtu.be");
      const isVimeo = block.url.includes("vimeo.com");

      let embedUrl = block.url;
      if (isYoutube && block.url.includes("v=")) {
        const videoId = block.url.split("v=")[1].split("&")[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (isYoutube && block.url.includes("youtu.be/")) {
        const videoId = block.url.split("youtu.be/")[1].split("?")[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (isVimeo && block.url.includes("vimeo.com/")) {
        const videoId = block.url.split("vimeo.com/")[1].split("?")[0];
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
      }

      return (
        <Box key={block.id} my="md">
          {isYoutube || isVimeo ? (
            <iframe
              src={embedUrl}
              width="100%"
              height="315"
              style={{ borderRadius: "8px" }}
              allowFullScreen
            />
          ) : (
            <video
              src={block.url}
              controls
              style={{
                maxWidth: "100%",
                borderRadius: "8px",
              }}
            />
          )}
          {block.caption && (
            <Box
              style={{
                fontSize: "0.875rem",
                color: "#666",
                marginTop: "0.5rem",
              }}
            >
              {block.caption}
            </Box>
          )}
        </Box>
      );
    }

    return null;
  };

  if (inline) {
    // Renderiza todo en una línea (solo texto concatenado)
    const textContent = blocks
      .filter((b) => b.type === "text")
      .map((b) => (b as TextBlock).content)
      .join(" ");

    return <>{textContent}</>;
  }

  return (
    <Stack gap="md">
      {blocks.map(renderBlock)}
    </Stack>
  );
}
