import { Image } from "@mantine/core";
import { Organization } from "../../../services/types";

export default function OrganizationBanner({ organization }: { organization: Organization }) {
  return (
    <Image
      src={organization.styles.banner_image}
      alt={organization.name}
      mt="md"
    />
  );
}
