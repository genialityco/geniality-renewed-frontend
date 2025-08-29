// src/pages/AdminOrganizationEvents/BulkUploadSection.tsx
import { useState } from "react";
import { Group, Button, Checkbox } from "@mantine/core";
import * as XLSX from "xlsx";

import { createOrUpdateOrganizationUser } from "../../../services/organizationUserService";
import { createPaymentPlan, updatePaymentPlanDateUntil } from "../../../services/paymentPlansService";
import { useUser } from "../../../context/UserContext";
import { useOrganization } from "../../../context/OrganizationContext";
import type { ImportReportType } from "../../../services/types";

export default function BulkUploadSection({
  onReport,
}: {
  onReport: (report: ImportReportType) => void;
}) {
  const { organization } = useOrganization();
  const orgId = organization?._id;
  const [fileData, setFileData] = useState<any[]>([]);
  const [createWithPlan, setCreateWithPlan] = useState(false);
  const [loading, setLoading] = useState(false);
  const { adminCreateUserAndOrganizationUser } = useUser();

  // Helper para normalizar lectura de valores con distintas variantes de nombres de columna
  const norm = (r: any, keys: string[]) => {
    for (const k of keys) {
      const v = r?.[k];
      if (v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
    return "";
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target!.result as ArrayBuffer), {
        type: "array",
      });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      // La nueva plantilla tiene SOLO una fila de encabezados técnicos.
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setFileData(rows as any[]);
    };
    reader.readAsArrayBuffer(file);
  };

  const process = async () => {
    if (!adminCreateUserAndOrganizationUser || !orgId) return;
    setLoading(true);

    const created: any[] = [];
    const updated: any[] = [];
    const errors: any[] = [];

    // Nombres de campos visibles en la organización (para properties)
    const visiblePropNames: string[] = (organization?.user_properties || [])
      .filter((p: any) => p.visible)
      .map((p: any) => p.name);

    for (const [idx, row] of fileData.entries()) {
      try {
        // Campos principales
        const email = norm(row, ["email", "correo", "Correo", "Correo electrónico", "correo electrónico"]);
        const nombres = norm(row, ["nombres", "Nombres"]);
        const apellidos = norm(row, ["apellidos", "Apellidos"]);
        const name =
          norm(row, ["name", "names", "Name"]) ||
          [nombres, apellidos].filter(Boolean).join(" ").trim();
        const password = norm(row, ["password", "Password"]) || "123456";

        if (!email) {
          errors.push({ row: idx + 2, error: "Falta email", data: row });
          continue;
        }

        // Solo pasar como properties los campos visibles definidos en la organización
        const properties = visiblePropNames.reduce((acc: any, key: string) => {
          acc[key] = row[key] ?? "";
          return acc;
        }, {});

        const { user, organizationUser } =
          await adminCreateUserAndOrganizationUser({
            email,
            name,
            password,
            organizationId: orgId,
            positionId: "",
            rolId: "",
            properties,
          });

        if (createWithPlan && organizationUser?._id) {
          if (!organizationUser?.payment_plan_id) {
            // Crear un nuevo payment plan si no existe
            const plan = await createPaymentPlan({
              days: 365,
              date_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              price: 0,
              organization_user_id: organizationUser._id,
            });
            await createOrUpdateOrganizationUser({
              ...organizationUser,
              payment_plan_id: plan._id,
            });
          } else {
            // Actualizar solo date_until del plan existente
            await updatePaymentPlanDateUntil(
              organizationUser.payment_plan_id,
              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            );
          }
        }

        if (user && organizationUser) {
          created.push({ row: idx + 2, data: row });
        } else if (!user && organizationUser) {
          updated.push({ row: idx + 2, data: row });
        }
      } catch (err: any) {
        errors.push({ row: idx + 2, error: err?.message ?? "Error inesperado", data: row });
      }
    }

    const report: ImportReportType = { created, updated, errors };
    onReport(report);
    setFileData([]);
    setLoading(false);
  };

  const generateUserTemplate = () => {
    if (!organization) return;

    // 1) Campos base mínimos para el bulk
    const basicFields = [
      { name: "email", label: "Correo electrónico" },
      { name: "nombres", label: "Nombres" },
      { name: "apellidos", label: "Apellidos" },
      {
        name: "password",
        label: "Contraseña (opcional, si no se envía se autogenera)",
      },
    ];

    // 2) SOLO campos visibles de la organización
    const visibleOrgFields = (organization.user_properties || [])
      .filter((prop: any) => prop.visible)
      .map((prop: any) => {
        let label = prop.label || prop.name;
        const type = String(prop.type || "").toLowerCase();
        if (prop.mandatory) label += " (OBLIGATORIO)";
        if (type === "boolean") {
          label +=
            " [checkbox: TRUE/1/SI para marcar, FALSE/0/NO para no marcar]";
        }
        return {
          name: prop.name,
          label,
          type,
          mandatory: !!prop.mandatory,
          options: Array.isArray(prop.options) ? prop.options : [],
        };
      });

    // 3) Combinar sin duplicar (prioriza basicFields)
    const fieldsMap = new Map<string, any>();
    for (const f of basicFields) fieldsMap.set(f.name, f);
    for (const f of visibleOrgFields) {
      if (!fieldsMap.has(f.name)) fieldsMap.set(f.name, f);
    }
    const fields = Array.from(fieldsMap.values());

    // 4) Encabezados (SOLO una fila técnica)
    const headers = fields.map((f) => f.name);

    // 5) Fila ejemplo
    const example: Record<string, any> = {};
    for (const f of fields) {
      switch (f.name) {
        case "email":
          example[f.name] = "usuario@email.com";
          break;
        case "nombres":
          example[f.name] = "Nombre";
          break;
        case "apellidos":
          example[f.name] = "Apellido";
          break;
        case "password":
          example[f.name] = "123456";
          break;
        default: {
          const type = (f.type || "").toLowerCase();
          if (type === "boolean") {
            example[f.name] = f.mandatory ? "TRUE" : "FALSE";
          } else if (type === "list" && f.options?.length) {
            example[f.name] = f.options[0].value ?? f.options[0].label ?? "";
          } else if (type === "country") {
            example[f.name] = "CO";
          } else if (type === "city") {
            example[f.name] = "Bogotá";
          } else if (type === "codearea") {
            example[f.name] = "+57 3001234567";
          } else {
            example[f.name] = "";
          }
        }
      }
    }

    // 6) Construir workbook: Hoja "Usuarios" (encabezados + ejemplo)
    const wsData = [
      headers,
      headers.map((h) => example[h]),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Hoja "Guía" opcional con name/label para referencia
    const guideRows = [["name (columna)", "label (descripción visible)"]];
    for (const f of fields) {
      guideRows.push([f.name, f.label ?? ""]);
    }
    const guideSheet = XLSX.utils.aoa_to_sheet(guideRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "Usuarios");
    XLSX.utils.book_append_sheet(wb, guideSheet, "Guía");
    XLSX.writeFile(wb, "usuarios_template.xlsx");
  };

  return (
    <Group mb="md">
      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFile}
        style={{ display: "none" }}
        id="bulk-file"
      />
      <label htmlFor="bulk-file">
        <Button component="span" disabled={loading}>
          Subir usuarios masivamente
        </Button>
      </label>
      <Button onClick={process} loading={loading} disabled={!fileData.length}>
        Procesar usuarios ({fileData.length})
      </Button>
      <Checkbox
        label="Crear usuarios con plan de pago"
        checked={createWithPlan}
        onChange={(e) => setCreateWithPlan(e.currentTarget.checked)}
        disabled={loading}
      />
      <Button variant="light" onClick={generateUserTemplate}>
        Descargar plantilla Excel
      </Button>
    </Group>
  );
}
