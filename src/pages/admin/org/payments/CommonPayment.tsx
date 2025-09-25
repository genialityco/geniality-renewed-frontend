import {
  Badge,
  Tooltip,
  Group,
  Text,
  Code,
  CopyButton,
  ActionIcon,
} from "@mantine/core";
import { FaClipboard } from "react-icons/fa6";
import { FaCreditCard } from "react-icons/fa6";
import { ExtractedMethod, getBadgeColor } from "./UtilsPayment";

type Props = {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
};

type PropsCopyable = {
  value: string;
  truncateWidth?: number;
};

type PropsBadges = {
  status: string;
  statusMessage?: string;
  paymentMethod?: ExtractedMethod;
};

export function KV({ label, children, mono = false }: Props) {
  return (
    <Group gap={6} wrap="nowrap" align="baseline">
      <Text size="xs" c="dimmed" component="span">
        {label}:
      </Text>
      <Text
        size="sm"
        fw={500}
        ff={mono ? "monospace" : undefined}
        component="span"
      >
        {children}
      </Text>
    </Group>
  );
}

export function Copyable({ value, truncateWidth = 260 }: PropsCopyable) {
  return (
    <Group gap={6} wrap="nowrap">
      <Code
        fz="xs"
        ff="monospace"
        px="xs"
        py={4}
        style={{ maxWidth: truncateWidth }}
      >
        <Text truncate>{value}</Text>
      </Code>
      <CopyButton value={value}>
        {({ copy, copied }) => (
          <Tooltip label={copied ? "Copiado" : "Copiar"} withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={copy}
              aria-label="Copiar"
            >
              <FaClipboard size={14} />
            </ActionIcon>
          </Tooltip>
        )}
      </CopyButton>
    </Group>
  );
}

export function PaymentBadges({
  status,
  statusMessage,
  paymentMethod,
}: PropsBadges) {
  const badgeColor = getBadgeColor(status);

  return (
    <Group gap="sm" wrap="wrap" align="center">
      {statusMessage ? (
        <Tooltip label={statusMessage} multiline w={320}>
          <Badge color={badgeColor} variant="light">
            {status}
          </Badge>
        </Tooltip>
      ) : (
        <Badge color={badgeColor} variant="light">
          {status}
        </Badge>
      )}

      {paymentMethod?.method && (
        <Badge variant="outline" radius="sm">
          <Group gap={6}>
            <FaCreditCard size={12} />
            <Text size="xs">
              {paymentMethod.method}
              {paymentMethod.brand ? ` · ${paymentMethod.brand}` : ""}
              {paymentMethod.last4 ? ` · ****${paymentMethod.last4}` : ""}
              {paymentMethod.bank ? ` · ${paymentMethod.bank}` : ""}
            </Text>
          </Group>
        </Badge>
      )}
    </Group>
  );
}
