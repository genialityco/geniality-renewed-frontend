import { Tabs, Stack, Container, Title } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import MyCourses from "./sections/MyCourses";
import PersonalInfo from "./sections/PersonalInfo";
import MembershipPlan from "./sections/MembershipPlan";
import ChangePassword from "./sections/ChangePassword";
import MyOrganizations from "./sections/MyOrganizations";
import { MyActivity } from "../../components/MyActivity";
import { useUser } from "../../context/UserContext";

const Profile = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "courses";
  const { userId, firebaseUser, organizationUserData } = useUser();

  const organizationId = organizationUserData?.organization_id?._id || organizationUserData?.organization_id;

  const handleTabChange = (value: string | null) => {
    setSearchParams({ tab: value || "courses" });
  };

  return (
    <Container p="md">
      <Stack>
        <Title order={2}>Mi Perfil</Title>
        <Tabs value={currentTab} onChange={handleTabChange} variant="outline">
          <Tabs.List>
            <Tabs.Tab value="courses">Mis Cursos</Tabs.Tab>
            <Tabs.Tab value="Organizations">Mis Organizaciones</Tabs.Tab>
            <Tabs.Tab value="info">Información Personal</Tabs.Tab>
            <Tabs.Tab value="membership">Mi Plan</Tabs.Tab>
            <Tabs.Tab value="activity">Mi Actividad</Tabs.Tab>
            {/* <Tabs.Tab value="password">Cambiar Contraseña</Tabs.Tab> */}
          </Tabs.List>

          <Tabs.Panel value="courses">
            <MyCourses />
          </Tabs.Panel>

          <Tabs.Panel value="Organizations">
            <MyOrganizations />
          </Tabs.Panel>

          <Tabs.Panel value="info">
            <PersonalInfo />
          </Tabs.Panel>

          <Tabs.Panel value="membership">
            <MembershipPlan />
          </Tabs.Panel>

          <Tabs.Panel value="activity">
            <MyActivity
              userId={userId}
              firebaseUid={firebaseUser?.uid || null}
              organizationId={organizationId || ''}
            />
          </Tabs.Panel>

          <Tabs.Panel value="password">
            <ChangePassword />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
};

export default Profile;
