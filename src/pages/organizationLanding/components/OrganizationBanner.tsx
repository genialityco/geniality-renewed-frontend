import { Image, Stack, Group } from "@mantine/core";
import { Organization } from "../../../services/types";

export default function OrganizationBanner({
  organization,
}: {
  organization: Organization;
}) {
  const bannerUrl = organization.styles?.banner_image;
  const logoUrl = organization.styles?.logo_image;

  if (!bannerUrl && !logoUrl) return null;

  return (
    <Stack gap={0}>
      {logoUrl && (
        <Group justify="center" p="md">
          <Image
            src={logoUrl}
            alt={organization.name}
            fit="contain"
            mah={100}
            w="auto"
          />
        </Group>
      )}
      {bannerUrl && (
        <Image
          src={bannerUrl}
          alt={organization.name}
          fit="contain"
          w="100%"
        />
      )}
    </Stack>
  );
}
