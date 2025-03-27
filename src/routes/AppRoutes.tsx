// AppRoutes.tsx
import { Routes, Route } from "react-router-dom";
import Home from "../pages/Home";
import Organizations from "../pages/Organizations";
import OrganizationDetail from "../pages/OrganizationDetail";
import NotFound from "../pages/NotFound";
import CourseDetail from "../pages/course/CourseDetail";
import ActivityDetailContainer from "../pages/activity/ActivityDetailContainer";
import Profile from "../pages/profile";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/organizations" element={<Organizations />} />
      <Route path="/organizations/:id" element={<OrganizationDetail />} />
      <Route path="/course/:eventId" element={<CourseDetail />} />
      <Route path="/activitydetail/:activityId" element={<ActivityDetailContainer />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
