import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Organizations from "../pages/Organizations";
import OrganizationDetail from "../pages/OrganizationDetail";
import NotFound from "../pages/NotFound";
import CourseDetail from "../pages/course/CourseDetail";

export default function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/organizations" element={<Organizations />} />
        <Route path="/organizations/:id" element={<OrganizationDetail />} />
        <Route path="/course/:eventId" element={<CourseDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
