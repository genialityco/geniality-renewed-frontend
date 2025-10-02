// src/context/OrganizationContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useLocation, matchPath } from "react-router-dom";
import { fetchOrganizationById } from "../services/organizationService";

export interface Organization {
  _id: string;
  name: string;
  image: string;
  user_properties?: Record<string, any>;
  default_position_id?: string;
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
    // Las rutas que queremos "escuchar"
    const patterns = [
      "/organization/:orgId", // la raíz de la organización
      "/organization/:orgId/*", // cualquier subruta, incluido /admin
      "/organization/:orgId/admin", // exactamente /admin
      "/organization/:orgId/admin/*", // subrutas de admin
    ];

    let match: ReturnType<typeof matchPath> = null;
    for (const pattern of patterns) {
      match = matchPath({ path: pattern, end: false }, location.pathname);
      if (match) break;
    }

    if (match && match.params && match.params.orgId) {
      fetchOrganizationById(match.params.orgId).then((org) => {
        setOrganization({
          _id: org._id,
          name: org.name,
          image: org.styles?.event_image || org.styles?.banner_image || "",
          user_properties: org.user_properties || {},
        });
      });
    } else {
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
