// pages/admin/components/AdminModules.tsx

import React, { useEffect, useState } from "react";
import { Button, List, TextInput, Loader } from "@mantine/core";
import {
  getModulesByEventId,
  createModule,
  updateModule,
  deleteModule,
} from "../../../services/moduleService";
import { Module } from "../../../services/types";

interface Props {
  organizationId?: string;
  eventId?: string;
}

export default function AdminModules({ organizationId, eventId }: Props) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  // Input para el nombre del nuevo módulo
  const [newModuleName, setNewModuleName] = useState("");

  useEffect(() => {
    if (!eventId) return; // No cargues nada si no tienes un eventId
    getModulesByEventId(eventId).then((mods) => {
      setModules(mods);
      setLoading(false);
    });
  }, [eventId]);

  // Mientras se cargan los módulos
  if (loading) return <Loader />;

  // Crear un módulo nuevo
  const handleCreateModule = async () => {
    if (!eventId || !newModuleName) return;
    try {
      const createdModule = await createModule(eventId, {
        module_name: newModuleName,
      });
      setModules([...modules, createdModule]);
      setNewModuleName("");
    } catch (error) {
      console.error(error);
    }
  };

  // Eliminar un módulo
  const handleDeleteModule = async (moduleId: string) => {
    if (!eventId) return;
    try {
      await deleteModule(eventId, moduleId);
      setModules(modules.filter((m) => m._id !== moduleId));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h3>Módulos</h3>

      {/* Formulario básico para crear un módulo */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TextInput
          placeholder="Nombre del módulo"
          value={newModuleName}
          onChange={(e) => setNewModuleName(e.target.value)}
        />
        <Button onClick={handleCreateModule}>Crear</Button>
      </div>

      {/* Listado de módulos */}
      <List spacing="sm">
        {modules.map((mod) => (
          <List.Item key={mod._id}>
            {mod.module_name} (Orden: {mod.order})
            <Button
              variant="outline"
              size="xs"
              ml="md"
              onClick={() => handleDeleteModule(mod._id)}
            >
              Eliminar
            </Button>
          </List.Item>
        ))}
      </List>
    </div>
  );
}
