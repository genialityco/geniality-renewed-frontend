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

const DEFAULT_TITLE = "EndoCampus";
const DEFAULT_FAVICON =
  "https://storage.googleapis.com/geniality-sas.appspot.com/evius/events/JqzemlKcQEClLYBMFxfSv8fAYX6PwXFZdKf0eNqT.png";

export interface Organization {
  _id: string;
  name: string;
  image: string;
  user_properties?: Record<string, any>;
  default_position_id?: string;
  author: string;
  tab_titles?: { courses?: string; activities?: string; exclusive?: string };
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

  const setDocumentBranding = (title: string, faviconHref: string) => {
    document.title = title;

    const existingFavicon = document.querySelector(
      "link[rel='icon']"
    ) as HTMLLinkElement | null;

    if (existingFavicon) {
      existingFavicon.href = faviconHref;
      return;
    }

    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/svg+xml";
    favicon.href = faviconHref;
    document.head.appendChild(favicon);
  };

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
      const orgId = match.params.orgId;

      // Función para cargar la organización
      const loadOrganization = () => {
        fetchOrganizationById(orgId).then((org) => {
          const orgData = {
            _id: org._id,
            name: org.name,
            image: org.styles?.event_image || org.styles?.banner_image || "",
            user_properties: org.user_properties || {},
            author: org.author || "",
            tab_titles: org.tab_titles || {},
          };

          setOrganization(orgData);
          setDocumentBranding(orgData.name || DEFAULT_TITLE, orgData.image || DEFAULT_FAVICON);
        });
      };

      // Cargar inmediatamente
      loadOrganization();

      // Polling cada 5 segundos
      const interval = setInterval(loadOrganization, 5000);

      return () => {
        clearInterval(interval);
      };
    } else {
      setOrganization(null);
      setDocumentBranding(DEFAULT_TITLE, DEFAULT_FAVICON);
    }
  }, [location.pathname]);

  return (
    <OrganizationContext.Provider value={{ organization, setOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => useContext(OrganizationContext);
