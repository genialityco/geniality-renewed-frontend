import { useEffect, useState } from "react";
import {
  TextInput,
  Button,
  Stack,
  Loader,
  Text,
  Group,
  Notification,
  CheckIcon,
} from "@mantine/core";
import { useUser } from "../../../context/UserContext";
import {
  fetchUserById,
  createOrUpdateUser,
} from "../../../services/userService";
import { User } from "../../../services/types";
import { FaX } from "react-icons/fa6";

const PersonalInfo = () => {
  const { userId } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await fetchUserById(userId as string);
        setUser(userData);
        setName(userData.name || "");
        setEmail(userData.email || "");
      } catch (err: any) {
        console.error("Error al cargar usuario:", err);
        setError("No se pudo cargar tu información.");
      } finally {
        setLoading(false);
      }
    };

    if (userId) loadUser();
  }, [userId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await createOrUpdateUser({
        uid: userId as string,
        name,
        email,
      });
      setSuccess(true);
    } catch (err: any) {
      setError("No se pudo guardar la información.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <Text c="red">{error}</Text>;

  return (
    <Stack pt="md" maw={400}>
      <Text size="xl" fw={700}>
        Información Personal
      </Text>

      <TextInput
        label="Nombre"
        placeholder="Tu nombre"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />

      <TextInput
        label="Correo electrónico"
        placeholder="tucorreo@email.com"
        value={email}
        onChange={(e) => setEmail(e.currentTarget.value)}
      />

      <Group justify="flex-start" mt="sm">
        <Button onClick={handleSave} loading={saving}>
          Guardar cambios
        </Button>
      </Group>

      {success && (
        <Notification icon={<CheckIcon />} color="teal" mt="sm">
          ¡Información actualizada correctamente!
        </Notification>
      )}

      {error && !loading && (
        <Notification icon={<FaX />} color="red" mt="sm">
          {error}
        </Notification>
      )}
    </Stack>
  );
};

export default PersonalInfo;
