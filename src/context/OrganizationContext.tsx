// src/context/OrganizationContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { fetchOrganizationById } from "../services/organizationService";
import { getOrgIdFromPathname } from "../utils/getOrgIdFromPathname";

const DEFAULT_TITLE = "Geniality";
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
    const orgId = getOrgIdFromPathname(location.pathname);

    if (!orgId) {
      setOrganization(null);
      setDocumentBranding(DEFAULT_TITLE, DEFAULT_FAVICON);
      return;
    }

    let cancelled = false;

    // Al cambiar a una organización distinta de la que está cargada, limpia de
    // inmediato para no mostrar el branding de la org anterior (ni el default)
    // mientras llega la nueva. Si es la misma org (navegación interna, p.ej.
    // /admin), conserva el estado para evitar parpadeos.
    setOrganization((prev) => (prev && prev._id === orgId ? prev : null));

    // Función para cargar la organización
    const loadOrganization = () => {
      fetchOrganizationById(orgId)
        .then((org) => {
          // Descarta respuestas obsoletas: el efecto se limpió (navegación) o
          // la URL ya apunta a otra organización.
          if (cancelled) return;
          if (getOrgIdFromPathname(window.location.pathname) !== orgId) return;

          const orgData = {
            _id: org._id,
            name: org.name,
            image: org.styles?.event_image || org.styles?.banner_image || "",
            user_properties: org.user_properties || {},
            author: org.author || "",
            tab_titles: org.tab_titles || {},
          };

          setOrganization(orgData);
          setDocumentBranding(
            orgData.name || DEFAULT_TITLE,
            orgData.image || DEFAULT_FAVICON
          );
        })
        .catch(() => {
          /* se reintenta en el siguiente ciclo de polling */
        });
    };

    // Cargar inmediatamente
    loadOrganization();

    // Polling cada 5 segundos
    const interval = setInterval(loadOrganization, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [location.pathname]);

  return (
    <OrganizationContext.Provider value={{ organization, setOrganization }}>
      {children}
    </OrganizationContext.Provider>
  );
}

export const useOrganization = () => useContext(OrganizationContext);
