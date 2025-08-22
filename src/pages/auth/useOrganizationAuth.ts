import { useEffect, useState } from "react";
import { UserProperty } from "../../services/types";
import { fetchOrganizationById } from "../../services/organizationService";

/** --------------------------
 *  Hook: carga de organización
 *  -------------------------- */
function useOrganizationAuth(organizationId?: string) {
  const [organization, setOrganization] = useState<{
    _id: string;
    name: string;
    styles: any;
    default_position_id: string;
    user_properties: UserProperty[];
  } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!organizationId) {
      setOrganization(null);
      setLoadingOrg(false);
      return;
    }
    (async () => {
      try {
        const org = await fetchOrganizationById(organizationId);
        if (!mounted) return;

        setOrganization({
          _id: org._id,
          name: org.name,
          styles: org.styles,
          default_position_id: org.default_position_id,
          user_properties: org.user_properties,
        });
      } catch {
        if (mounted) setOrganization(null);
      } finally {
        if (mounted) setLoadingOrg(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [organizationId]);

  return { organization, loadingOrg };
}

export default useOrganizationAuth;
