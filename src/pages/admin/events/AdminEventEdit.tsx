// src/pages/admin/AdminEventEdit.tsx
import { useEffect, useState } from "react";
import { Container, Tabs, Loader, Text, Button, Group } from "@mantine/core";
import { FaEye } from "react-icons/fa6";

import { Event } from "../../../services/types";
import { fetchEventById } from "../../../services/eventService";
import { openCoursePreview } from "../../../utils/previewUrl";

import BasicEventData from "./BasicEventData";
import AdminModules from "./AdminModules";
import AdminActivities from "./AdminActivities";
import AdminHosts from "./AdminHosts";
import QuizConfig from "../../../components/QuizConfig";
import AdminExamsManager from "./AdminExamsManager";
import CertificateComponent from "../../../components/CertificateComponent";
import CertificateRulesConfig from "./CertificateRulesConfig";
interface Props {
  organizationId: string;
  eventId: string; // puede ser "new" o un id real
  onFinish: (newEventId?: string) => void;
}

export default function AdminEventEdit({
  organizationId,
  eventId,
  onFinish,
}: Props) {
  const [formData, setFormData] = useState<Partial<Event>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("basicos");

  const isEditing = eventId !== "new";

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      fetchEventById(eventId).then((data) => {
        setFormData(data);
        setLoading(false);
      });
    }
  }, [eventId, isEditing]);

  if (loading && isEditing) {
    return <Loader />;
  }

  return (
    <Container fluid>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="basicos">Datos Curso</Tabs.Tab>
          <Tabs.Tab value="modulos">Módulos</Tabs.Tab>
          <Tabs.Tab value="actividades">Actividades</Tabs.Tab>
          <Tabs.Tab value="hosts">Conferencistas</Tabs.Tab>
          <Tabs.Tab value="Examen">Examen</Tabs.Tab>
          <Tabs.Tab value="certificado">Certificado</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="basicos" pt="md">
          <BasicEventData
            formData={formData}
            setFormData={setFormData}
            organizationId={organizationId}
            eventId={eventId}
            isEditing={isEditing}
            onSaved={onFinish}
          />
        </Tabs.Panel>

        <Tabs.Panel value="Examen" pt="md">
          {isEditing ? (
            <Tabs defaultValue="Examenes">
              <Tabs.List>
                <Tabs.Tab value="Examenes">Exámenes</Tabs.Tab>
                <Tabs.Tab value="Configuracion">Configuración</Tabs.Tab>
              </Tabs.List>
              <Tabs.Panel value="Examenes" pt="md">
                <AdminExamsManager eventId={eventId} />
              </Tabs.Panel>
              <Tabs.Panel value="Configuracion" pt="md">
                <QuizConfig eventId={eventId} />
              </Tabs.Panel>
            </Tabs>
          ) : (
            <Text mb="md">
              Guarda primero el evento para gestionar los exámenes.
            </Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="modulos" pt="md">
          {isEditing ? (
            <AdminModules organizationId={organizationId} eventId={eventId} />
          ) : (
            <Text mb="md">
              Guarda primero el evento para gestionar módulos.
            </Text>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="actividades" pt="md">
          {isEditing ? (
            <AdminActivities
              organizationId={organizationId}
              eventId={eventId}
              active={activeTab === "actividades"}
            />
          ) : (
            <Text mb="md">
              Guarda primero el evento para gestionar actividades.
            </Text>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="hosts" pt="md">
          {isEditing ? (
            <AdminHosts organizationId={organizationId} eventId={eventId} />
          ) : (
            <Text mb="md">Guarda primero el evento para gestionar hosts.</Text>
          )}
        </Tabs.Panel>
        <Tabs.Panel value="certificado" pt="md">
          {isEditing ? (
            <>
              <CertificateComponent eventId={eventId} />
              <CertificateRulesConfig eventId={eventId} />
            </>
          ) : (
            <Text mb="md">
              Guarda primero el evento para configurar el certificado.
            </Text>
          )}
        </Tabs.Panel>
      </Tabs>

      <Group mt="lg">
        <Button variant="default" onClick={() => onFinish()}>
          Cancelar
        </Button>
        {isEditing && (
          <Button
            variant="light"
            color="teal"
            leftSection={<FaEye size={16} />}
            onClick={() => openCoursePreview(organizationId, eventId)}
          >
            Vista previa del curso
          </Button>
        )}
      </Group>
    </Container>
  );
}
