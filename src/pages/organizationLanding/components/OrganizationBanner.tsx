import { Image } from "@mantine/core";
import { Organization } from "../../../services/types";

export default function OrganizationBanner({
  organization,
}: {
  organization: Organization;
}) {
  const bannerUrl = organization.styles?.banner_image;

  if (!bannerUrl) return null;

  return (
    <Image
      src={bannerUrl}
      alt={organization.name}
      fit="contain"
      w="100%"
    />
  );
}
