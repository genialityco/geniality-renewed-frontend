/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import {
  TextInput,
  Button,
  Image,
  Loader,
  Group,
  Box,
  FileInput,
  Stack,
  Title,
  Paper,
  Grid,
  Divider,
  Text,
  Select,
  Alert,
  Switch,
  NumberInput,
  Textarea,
  Chip,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import { uploadImageToFirebase } from "../../../utils/uploadImageToFirebase";
import { createEvent, updateEvent } from "../../../services/eventService";
import type { Event, TimeWindow } from "../../../services/types";
import { useUser } from "../../../context/UserContext";
import { useOrganization } from "../../../context/OrganizationContext";
import { toastSaved, toastUpdated, toastError } from "../../../utils/toast";
import TimeWindowsEditor from "./TimeWindowsEditor";

// Defaults del repaso automático por WhatsApp (los mismos del backend)
const DEFAULT_TIMEZONE = "America/Bogota";
const DEFAULT_REVIEW_DAYS = [1, 2, 3, 4, 5, 6];
const DEFAULT_REVIEW_WINDOWS: TimeWindow[] = [{ start: "09:00", end: "19:00" }];
const DEFAULT_REST_WINDOWS: TimeWindow[] = [{ start: "12:00", end: "14:00" }];

const WEEKDAYS = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mié" },
  { value: 4, label: "Jue" },
  { value: 5, label: "Vie" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

const TIMEZONES = [
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Guayaquil", label: "Ecuador (Guayaquil)" },
  { value: "America/Panama", label: "Panamá" },
  { value: "America/Caracas", label: "Venezuela (Caracas)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Sao_Paulo", label: "Brasil (São Paulo)" },
  { value: "America/New_York", label: "EE. UU. (Nueva York)" },
  { value: "Europe/Madrid", label: "España (Madrid)" },
];

interface Props {
  formData: Partial<Event>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Event>>>;
  organizationId: string; // puedes dejarlo por compatibilidad, no lo usamos aquí
  eventId: string;
  isEditing: boolean;
  onSaved: (newEventId?: string, savedEvent?: Event) => void;
}

export default function BasicEventData({
  formData,
  setFormData,
  organizationId,
  eventId,
  isEditing,
  onSaved,
}: Props) {
  const { userId } = useUser();
  const { organization } = useOrganization();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ===== Helpers de formulario =====
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (
    name: keyof Pick<Event, "datetime_from" | "datetime_to">,
    date: Date | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: date ? date.toISOString() : null,
    }));
  };

  const handleSelectChange = (
    name: keyof Pick<Event, "visibility" | "type_event">,
    value: string | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value || undefined,
    }));
  };

  const handleFileUpload = async (file: File | null, path: string[]) => {
    if (!file) return;
    setUploading(path.join("."));
    try {
      const url = await uploadImageToFirebase(file, "event_images");
      setFormData((prev) => {
        if (path.length === 1) {
          return { ...prev, [path[0]]: url };
        } else {
          return {
            ...prev,
            [path[0]]: { ...((prev as any)[path[0]] || {}), [path[1]]: url },
          };
        }
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Error subiendo la imagen");
    } finally {
      setUploading(null);
    }
  };

  const setField = (name: keyof Event, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getImage = (path: string[]) => {
    let v: any = formData;
    for (const key of path) {
      if (!v) return "";
      v = v[key];
    }
    return v || "";
  };

  // ===== Validación mínima antes de enviar =====
  const canSave = useMemo(() => {
    return Boolean(
      (formData.name || "").trim() &&
        formData.datetime_from &&
        formData.datetime_to &&
        (formData.visibility || "PUBLIC") &&
        userId &&
        organization?._id
    );
  }, [formData, userId, organization]);

  const handleSave = async () => {
    if (saving) return;

    setErrorMsg(null);

    // Validación explícita para que el usuario entienda qué falta
    const missing: string[] = [];
    if (!userId) missing.push("author_id (inicia sesión)");
    if (!organization?._id)
      missing.push("organizer_id (organización no detectada)");
    if (!formData.datetime_from) missing.push("datetime_from");
    if (!formData.datetime_to) missing.push("datetime_to");
    if (!formData.visibility) {
      // ponemos default, pero avisamos
      // no lo agregamos a missing para no bloquear
    }
    if (!formData.name?.trim()) missing.push("name");

    if (missing.length) {
      setErrorMsg(`Faltan campos requeridos: ${missing.join(", ")}.`);
      return;
    }

    setSaving(true);
    try {
      // Construimos el payload que espera tu backend
      const payload: Partial<Event> = {
        ...formData,
        author_id: userId!, // del UserContext
        organizer_id: organization!._id, // del OrganizationContext
        // defaults seguros si el user no selecciona
        visibility: (formData.visibility as any) || "PUBLIC",
        type_event: (formData.type_event as any) || "general",
      };

      if (isEditing) {
        // OJO: tu firma de updateEvent es (id, _eventId, data)
        // y en tu código original llamabas updateEvent(organizationId, eventId, formData)
        // Mantengo ese contrato:
        const updated = await updateEvent(eventId, payload);
        toastUpdated("Evento actualizado");
        // Pasamos el id y el evento actualizado para que el contenedor
        // permanezca en el editor sin recargarlo desde el servidor (evita el
        // parpadeo de "salir y volver a entrar" al guardar). Respaldo: el
        // eventId actual si el backend no lo devolviera.
        onSaved(updated._id || eventId, updated);
      } else {
        const created = await createEvent(organizationId, payload);
        toastSaved("Evento creado");
        onSaved(created._id, created);
      }
    } catch (error: any) {
      console.error("Error saving event:", error);
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo guardar el evento";
      setErrorMsg(msg);
      toastError("No se pudo guardar el evento", msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper p="sm" radius="lg" shadow="md" withBorder>
      <Title order={3} mb="md" ta="left">
        {isEditing ? "Editando Evento" : "Creando Evento"}
      </Title>
      <Divider mb="lg" />

      {errorMsg && (
        <Alert color="red" mb="md" title="No se pudo guardar">
          {errorMsg}
        </Alert>
      )}

      <Stack gap="xs">
        <TextInput
          label="Nombre del Evento"
          name="name"
          value={formData.name || ""}
          onChange={handleChange}
          required
        />

        <Textarea
          label="Descripción del curso"
          description="Texto que se muestra bajo el título en la página del curso. Opcional."
          placeholder="Escribe una descripción para el curso…"
          value={formData.description || ""}
          onChange={(e) => setField("description", e.currentTarget.value)}
          autosize
          minRows={3}
          maxRows={8}
        />

        <Group grow>
          <DateTimePicker
            label="Fecha y hora de inicio"
            value={
              formData.datetime_from ? new Date(formData.datetime_from) : null
            }
            onChange={(date) => handleDateChange("datetime_from", date)}
            required
            withSeconds
          />
          <DateTimePicker
            label="Fecha y hora de fin"
            value={formData.datetime_to ? new Date(formData.datetime_to) : null}
            onChange={(date) => handleDateChange("datetime_to", date)}
            required
            withSeconds
          />
        </Group>

        <Group grow>
          <Select
            label="Visibilidad"
            data={[
              { value: "PUBLIC", label: "Público" },
              { value: "PRIVATE", label: "Privado" },
              { value: "EXCLUSIVE_FOR_MEMBERS", label: "Exclusivo para miembros" },
            ]}
            value={(formData.visibility as any) || "PUBLIC"}
            onChange={(v) => handleSelectChange("visibility", v)}
            required
          />

          <Select
            label="Tipo de evento"
            data={[
              { value: "onlineEvent", label: "En línea" },
              { value: "inPerson", label: "Presencial" },
            ]}
            value={(formData.type_event as any) || "onlineEvent"}
            onChange={(v) => handleSelectChange("type_event", v)}
          />
        </Group>
      </Stack>

      <Divider my="xl" label="Imágenes y branding" labelPosition="center" />

      <Text size="sm" c="dimmed" mb="md">
        El curso usa 4 imágenes independientes. Puedes subir solo las que
        necesites: si falta alguna, el curso usa la miniatura del catálogo
        como respaldo en la mayoría de los lugares.
      </Text>

      <Grid gutter="xl">
        {/* Miniatura */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <FileInput
            label="Miniatura del catálogo"
            description="Se ve en las tarjetas del curso: catálogo de la organización, listado de 'Mis cursos' y tarjetas de actividad. También sirve de respaldo del banner y el logo si esos no se suben."
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) => handleFileUpload(file, ["picture"])}
            disabled={!!uploading}
          />
          {formData.picture && (
            <Image
              key={formData.picture}
              src={formData.picture}
              alt="Miniatura"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "picture" ? "2px dashed #228be6" : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Banner superior */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <FileInput
            label="Banner del curso"
            description="Imagen grande (recomendado formato horizontal/panorámico) que se muestra como fondo principal arriba del todo, al entrar al curso."
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "banner_image"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "banner_image"]) && (
            <Image
              key={getImage(["styles", "banner_image"])}
              src={getImage(["styles", "banner_image"])}
              alt="Banner superior"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.banner_image"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Logo del curso (cabecera) */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <FileInput
            label="Logo del curso"
            description="Imagen pequeña que aparece junto al título, en la barra superior fija del curso (donde también está el menú). Es independiente del banner."
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "event_image"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "event_image"]) && (
            <Image
              key={getImage(["styles", "event_image"])}
              src={getImage(["styles", "event_image"])}
              alt="Imagen Evento"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.event_image"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>

        {/* Footer */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <FileInput
            label="Imagen de cierre (footer)"
            description="Imagen de ancho completo que se muestra al final de la página del curso, después de los módulos, actividades y conferencistas."
            placeholder="Selecciona una imagen"
            accept="image/*"
            onChange={(file) =>
              handleFileUpload(file, ["styles", "banner_footer"])
            }
            disabled={!!uploading}
          />
          {getImage(["styles", "banner_footer"]) && (
            <Image
              key={getImage(["styles", "banner_footer"])}
              src={getImage(["styles", "banner_footer"])}
              alt="Footer"
              height={120}
              mt="xs"
              radius="md"
              fit="cover"
              style={{
                border:
                  uploading === "styles.banner_footer"
                    ? "2px dashed #228be6"
                    : undefined,
              }}
            />
          )}
        </Grid.Col>
      </Grid>

      <Divider my="xl" label="Reglas del curso" labelPosition="center" />

      <Stack gap="lg">
        {/* Curso lineal */}
        <Switch
          checked={!!formData.is_linear}
          onChange={(e) => setField("is_linear", e.currentTarget.checked)}
          label="Curso lineal (obligar orden de las actividades)"
          description="Si se activa, el alumno debe completar cada actividad antes de avanzar a la siguiente. Por defecto el curso se puede ver en cualquier orden."
        />

        <Divider variant="dashed" />

        {/* Compuerta del examen general del curso */}
        <Switch
          checked={!!formData.exam_gating_enabled}
          onChange={(e) =>
            setField("exam_gating_enabled", e.currentTarget.checked)
          }
          label="Configurar requisitos para desbloquear el examen general"
          description="Mientras esta opción esté desactivada, el examen general permanecerá bloqueado para el alumno. Actívala para definir el avance mínimo requerido."
        />

        {formData.exam_gating_enabled && (
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <NumberInput
                label="Avance mínimo para desbloquear el examen (%)"
                min={0}
                max={100}
                clampBehavior="strict"
                value={
                  formData.exam_min_progress === undefined
                    ? 100
                    : formData.exam_min_progress
                }
                onChange={(v) =>
                  setField(
                    "exam_min_progress",
                    typeof v === "number" ? v : Number(v) || 0
                  )
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Textarea
                label="Mensaje cuando el examen está bloqueado"
                placeholder="Ej: Debes completar el 100% del curso para presentar el examen."
                autosize
                minRows={2}
                value={formData.exam_locked_message || ""}
                onChange={(e) =>
                  setField("exam_locked_message", e.currentTarget.value)
                }
              />
            </Grid.Col>
          </Grid>
        )}

        <Divider variant="dashed" />

        {/* Compuerta de exámenes de módulo */}
        <Switch
          checked={!!formData.module_exam_gating_enabled}
          onChange={(e) =>
            setField("module_exam_gating_enabled", e.currentTarget.checked)
          }
          label="Bloquear los exámenes de módulo hasta ver sus actividades"
          description="Mientras esta opción esté desactivada, los exámenes de módulo permanecerán bloqueados. Actívala para definir el porcentaje de avance requerido en cada módulo."
        />

        {formData.module_exam_gating_enabled && (
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <NumberInput
                label="Avance del módulo para desbloquear su examen (%)"
                min={0}
                max={100}
                clampBehavior="strict"
                value={
                  formData.module_exam_min_progress === undefined
                    ? 100
                    : formData.module_exam_min_progress
                }
                onChange={(v) =>
                  setField(
                    "module_exam_min_progress",
                    typeof v === "number" ? v : Number(v) || 0
                  )
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Textarea
                label="Mensaje cuando el examen del módulo está bloqueado"
                placeholder="Ej: Completa todas las actividades del módulo para presentar su examen."
                autosize
                minRows={2}
                value={formData.module_exam_locked_message || ""}
                onChange={(e) =>
                  setField("module_exam_locked_message", e.currentTarget.value)
                }
              />
            </Grid.Col>
          </Grid>
        )}
      </Stack>

      <Divider my="xl" label="Práctica y repaso" labelPosition="center" />

      <Stack gap="lg">
        {/* Preguntas dentro del video */}
        <Switch
          checked={!!formData.in_video_questions_enabled}
          onChange={(e) =>
            setField("in_video_questions_enabled", e.currentTarget.checked)
          }
          label="Preguntas dentro del video"
          description="Pausa el video y muestra una pregunta (opción única, múltiple o verdadero/falso) del banco de la actividad sobre lo que se acaba de explicar. Es opcional: el alumno puede saltarla y no afecta su progreso. Nunca se repite una pregunta que ya vio."
        />

        {formData.in_video_questions_enabled && (
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <NumberInput
                label="Minutos mínimos entre preguntas"
                min={1}
                max={120}
                clampBehavior="strict"
                value={formData.in_video_questions_interval_minutes ?? 5}
                onChange={(v) =>
                  setField(
                    "in_video_questions_interval_minutes",
                    typeof v === "number" ? v : Number(v) || 5
                  )
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <NumberInput
                label="Máximo de preguntas por video"
                min={1}
                max={20}
                clampBehavior="strict"
                value={formData.in_video_questions_max ?? 3}
                onChange={(v) =>
                  setField(
                    "in_video_questions_max",
                    typeof v === "number" ? v : Number(v) || 3
                  )
                }
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="xs" c="dimmed">
                Solo se usan preguntas con minuto del video (las generadas con IA a partir del
                transcript lo traen). Aparecen un minuto después de que empieza a explicarse el
                tema.
              </Text>
            </Grid.Col>
          </Grid>
        )}

        <Divider variant="dashed" />

        {/* Repaso automático por WhatsApp */}
        <Switch
          checked={!!formData.whatsapp_review_enabled}
          onChange={(e) =>
            setField("whatsapp_review_enabled", e.currentTarget.checked)
          }
          label="Repaso automático por WhatsApp"
          description="Envía un simulacro de 3 o 4 preguntas que el alumno no ha visto, unos días después de completar actividades. Solo a quienes aceptaron los mensajes en su perfil; como máximo uno cada tantos días como el retraso, y se pausa si ignora dos seguidos."
        />

        {formData.whatsapp_review_enabled && (
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 4 }}>
              <NumberInput
                label="Días de retraso"
                description="Tras completar actividades"
                min={1}
                max={60}
                clampBehavior="strict"
                value={formData.whatsapp_review_delay_days ?? 2}
                onChange={(v) =>
                  setField(
                    "whatsapp_review_delay_days",
                    typeof v === "number" ? v : Number(v) || 2
                  )
                }
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Select
                label="Zona horaria"
                description="En la que se evalúan las franjas"
                data={TIMEZONES}
                searchable
                allowDeselect={false}
                value={formData.whatsapp_review_timezone || DEFAULT_TIMEZONE}
                onChange={(v) =>
                  setField("whatsapp_review_timezone", v || DEFAULT_TIMEZONE)
                }
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <Text size="sm" fw={500} mb={6}>
                Días en que se puede enviar
              </Text>
              <Chip.Group
                multiple
                value={(formData.whatsapp_review_days ?? DEFAULT_REVIEW_DAYS).map(String)}
                onChange={(v) =>
                  setField(
                    "whatsapp_review_days",
                    v.map(Number).sort((a, b) => a - b)
                  )
                }
              >
                <Group gap="xs">
                  {WEEKDAYS.map((d) => (
                    <Chip key={d.value} value={String(d.value)} size="sm">
                      {d.label}
                    </Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TimeWindowsEditor
                label="Franjas de envío"
                description="Solo se envía dentro de estas horas"
                value={formData.whatsapp_review_windows ?? DEFAULT_REVIEW_WINDOWS}
                onChange={(v) => setField("whatsapp_review_windows", v)}
                addLabel="Agregar franja"
                newWindow={{ start: "09:00", end: "12:00" }}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <TimeWindowsEditor
                label="Franjas de descanso"
                description="Nunca se envía en estas horas, aunque estén dentro de una franja de envío"
                value={formData.whatsapp_review_rest_windows ?? DEFAULT_REST_WINDOWS}
                onChange={(v) => setField("whatsapp_review_rest_windows", v)}
                addLabel="Agregar descanso"
                newWindow={{ start: "12:00", end: "14:00" }}
              />
            </Grid.Col>
            {(!(formData.whatsapp_review_windows ?? DEFAULT_REVIEW_WINDOWS).length ||
              !(formData.whatsapp_review_days ?? DEFAULT_REVIEW_DAYS).length) && (
              <Grid.Col span={12}>
                <Alert color="yellow" variant="light">
                  Sin días o sin franjas de envío no se enviará ningún repaso.
                </Alert>
              </Grid.Col>
            )}
          </Grid>
        )}
      </Stack>

      <Divider my="xl" />

      <Group justify="space-between" mt="md">
        <Text size="sm" c="dimmed">
          {userId ? `Autor listo: ${userId}` : "Inicia sesión para continuar"}
          {" · "}
          {organization?._id
            ? `Organizador: ${organization._id}`
            : "No se detectó organización en la URL"}
        </Text>
        <Button
          onClick={handleSave}
          size="md"
          loading={saving}
          style={{ minWidth: 180 }}
          disabled={!canSave}
        >
          {isEditing ? "Guardar Cambios" : "Crear Evento"}
        </Button>
      </Group>

      {/* Loader global para subida de imagen */}
      {uploading && (
        <Box style={{ textAlign: "center", margin: 10 }}>
          <Loader size="sm" color="blue" />
          <Text c="dimmed" mt={4}>
            Subiendo imagen...
          </Text>
        </Box>
      )}
    </Paper>
  );
}
