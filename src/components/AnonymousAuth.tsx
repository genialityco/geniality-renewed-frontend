// AnonymousAuth.tsx
import { useEffect, useState } from "react";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { Button, TextInput, Card, Text } from "@mantine/core";
import axios from "axios";

export default function AnonymousAuth() {
  const [uid, setUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Maneja la autenticación anónima
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUid(firebaseUser.uid);
      } else {
        // Si no hay usuario, hacemos login anónimo
        signInAnonymously(auth).catch((error) => {
          console.error("Error al iniciar sesión anónima:", error);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Maneja envío de datos (nombre, email) al backend
  const handleSaveUser = async () => {
    if (!uid || !name || !email) return;
    try {
      // Envía la info al backend (Nest) para guardar
      // Ajusta la URL según tu endpoint
      const response = await axios.post("http://localhost:3000/users", {
        uid,
        name,
        email,
      });
      setUserId(response.data._id); // Asumiendo que Nest retorna el user con _id
      // Puedes guardar userId en localStorage si quieres
      localStorage.setItem("user_id", response.data._id);
      alert("Usuario guardado o actualizado con éxito");
    } catch (err) {
      console.error("Error al guardar usuario:", err);
    }
  };

  // 3. Render
  return (
    <Card shadow="sm" p="md" radius="md">
      {uid ? (
        <>
          <Text fw={600}>UID Firebase: {uid}</Text>
          <Text size="sm" c="dimmed" mb="md">
            Introduce tu nombre y correo para identificarte
          </Text>
          <TextInput
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            mb="sm"
          />
          <TextInput
            label="Correo"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            mb="sm"
          />
          <Button onClick={handleSaveUser}>Guardar/Actualizar</Button>

          {userId && (
            <Text size="sm" mt="sm" c="green">
              ID en BD: {userId}
            </Text>
          )}
        </>
      ) : (
        <Text>Cargando autenticación anónima...</Text>
      )}
    </Card>
  );
}
