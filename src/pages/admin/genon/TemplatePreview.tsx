// src/pages/admin/genon/TemplatePreview.tsx
import { ReactNode } from "react";
import {
  ActionIcon,
  Badge,
  Group,
  HoverCard,
  Mark,
  SelectProps,
  Stack,
  Text,
} from "@mantine/core";
import { FaEye } from "react-icons/fa6";
import { GenOnTemplate, GenOnTemplateButton } from "../../../services/genonService";
import { TemplateStatusBadge } from "./TemplatesTab";

/** Texto con las variables ({{nombre}}…) resaltadas. */
function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\{\{\s*[a-z0-9_]+\s*\}\})/g);
  return (
    <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
      {parts.map((p, i) =>
        /^\{\{/.test(p) ? (
          <Mark key={i} color="blue">
            {p}
          </Mark>
        ) : (
          p
        )
      )}
    </Text>
  );
}

function ButtonsList({ buttons }: { buttons: GenOnTemplateButton[] }) {
  if (!buttons.length) return null;
  return (
    <Group gap={4}>
      {buttons.map((b, i) => (
        <Badge key={i} variant="outline" color={b.type === "URL" ? "teal" : "gray"} size="sm">
          {b.type === "URL" ? "🔗 " : ""}
          {b.text}
        </Badge>
      ))}
    </Group>
  );
}

/** Contenido de la plantilla: la versión que se envía y, si hay, el borrador nuevo. */
export function TemplateContent({ template }: { template: GenOnTemplate }) {
  const approved = template.approved;
  const draftDiffers =
    approved?.body !== undefined && approved.body !== template.body;
  return (
    <Stack gap="xs">
      <Group justify="space-between" gap="xs" wrap="nowrap">
        <Text size="sm" fw={600}>
          {template.label}
        </Text>
        <TemplateStatusBadge template={template} />
      </Group>
      {draftDiffers ? (
        <>
          <Text size="xs" c="green" fw={600}>
            Se envía (v{approved!.version} aprobada)
          </Text>
          <HighlightedText text={approved!.body!} />
          <ButtonsList buttons={approved!.buttons || template.buttons} />
          <Text size="xs" c="dimmed" fw={600} mt={4}>
            Versión nueva v{template.version} ({template.meta_status === "PENDING" ? "en revisión" : "borrador"})
          </Text>
          <HighlightedText text={template.body} />
          <ButtonsList buttons={template.buttons} />
        </>
      ) : (
        <>
          <HighlightedText text={template.body} />
          <ButtonsList buttons={template.buttons} />
        </>
      )}
      {template.footer && (
        <Text size="xs" c="dimmed">
          Pie: {template.footer}
        </Text>
      )}
      <Text size="xs" c="dimmed">
        {template.key}
        {template.meta_category ? ` · ${template.meta_category}` : ` · ${template.category}`}
      </Text>
    </Stack>
  );
}

/** Ojo que muestra el texto de la plantilla al pasar el ratón. */
export function TemplatePreview({
  template,
  children,
}: {
  template: GenOnTemplate | undefined;
  children?: ReactNode;
}) {
  if (!template) return null;
  return (
    <HoverCard width={420} shadow="md" openDelay={150} position="bottom-start" withinPortal>
      <HoverCard.Target>
        {children ? (
          <span style={{ cursor: "help" }}>{children}</span>
        ) : (
          <ActionIcon size="sm" variant="subtle" aria-label="Ver texto de la plantilla">
            <FaEye />
          </ActionIcon>
        )}
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <TemplateContent template={template} />
      </HoverCard.Dropdown>
    </HoverCard>
  );
}

/** Opciones del selector de plantillas con el inicio del texto debajo del nombre. */
export function templateOptionRenderer(templates: GenOnTemplate[]): SelectProps["renderOption"] {
  return ({ option }) => {
    const t = templates.find((x) => x.key === option.value);
    const text = t ? t.approved?.body || t.body : "";
    return (
      <Stack gap={0}>
        <Text size="sm">{option.label}</Text>
        {text && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {text}
          </Text>
        )}
      </Stack>
    );
  };
}
