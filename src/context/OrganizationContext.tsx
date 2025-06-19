import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useLocation, matchPath } from "react-router-dom";
import { fetchOrganizationById } from "../services/organizationService";

interface Organization {
  name: string;
  image: string;
}

interface OrganizationContextType {
  organization: Organization | null;
  setOrganization: (org: Organization | null) => void;
}

const OrganizationContext = createContext<OrganizationContextType>({
  organization: null,
  setOrganization: () => {},
});

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const location = useLocation();

  useEffect(() => {
    const match = matchPath("/organizations/:orgId", location.pathname);
    const isRootOrOrganizations =
      location.pathname === "/" || location.pathname === "/organizations";

    if (match && match.params.orgId) {
      fetchOrganizationById(match.params.orgId).then((org) => {
        setOrganization({
          name: org.name,
          image: org.styles?.event_image || org.styles?.banner_image || "",
        });
      });
    } else if (isRootOrOrganizations) {
      setOrganization(null);
    }
  }, [location.pathname]);

  return (
    <OrganizationContext.Provider value={{ organization, setOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => useContext(OrganizationContext);
