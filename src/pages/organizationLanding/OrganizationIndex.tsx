// src/pages/organizationLanding/OrganizationIndex.tsx
import { Navigate, useLocation, useParams } from "react-router-dom";
import OrganizationLanding from "./index";
import { getPinnedCoursePath } from "../../utils/pinnedCourse";

/**
 * Índice de la organización. Si la organización tiene un curso fijo, el
 * usuario nunca ve la landing: se le lleva directo al curso (el guard del
 * curso se encarga de exigir sesión y registro).
 */
export default function OrganizationIndex() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const location = useLocation();
  const pinnedPath = getPinnedCoursePath(organizationId);

  if (pinnedPath) {
    return <Navigate to={pinnedPath + location.search} replace />;
  }
  return <OrganizationLanding />;
}
