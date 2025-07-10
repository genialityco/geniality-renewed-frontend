// src/pages/AdminOrganizationEvents/BulkUploadSection.tsx
import { useState } from "react";
import { Group, Button, Checkbox } from "@mantine/core";
import * as XLSX from "xlsx";

import { createOrUpdateOrganizationUser } from "../../services/organizationUserService";
import { createPaymentPlan, updatePaymentPlanDateUntil } from "../../services/paymentPlansService";
import { useUser } from "../../context/UserContext";
import { useOrganization } from "../../context/OrganizationContext";
import type { ImportReportType } from "../../services/types";

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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(new Uint8Array(evt.target!.result as ArrayBuffer), {
        type: "array",
      });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      setFileData(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
    };
    reader.readAsArrayBuffer(file);
  };

  const process = async () => {
    if (!adminCreateUserAndOrganizationUser || !orgId) return;
    setLoading(true);

    const created: any[] = [];
    const updated: any[] = [];
    const errors: any[] = [];

    for (const [idx, row] of fileData.entries()) {
      try {
        const { user, organizationUser } =
          await adminCreateUserAndOrganizationUser({
            email: row.email || "",
            name: row.name || row.names || "",
            password: row.password || "123456",
            organizationId: orgId,
            positionId: "",
            rolId: "",
            properties: {},
          });

        if (
          createWithPlan &&
          organizationUser?._id
        ) {
          if (!organizationUser?.payment_plan_id) {
            // Crear un nuevo payment plan si no existe
            const plan = await createPaymentPlan({
              days: 365,
              date_until: new Date(
                Date.now() + 365 * 24 * 60 * 60 * 1000
              ).toISOString(),
              price: 0,
              organization_user_id: organizationUser._id,
            });
            await createOrUpdateOrganizationUser({
              ...organizationUser,
              payment_plan_id: plan._id,
            });
          } else {
            // Actualizar solo el campo date_until del payment plan existente
            await updatePaymentPlanDateUntil(
              organizationUser.payment_plan_id,
              new Date(
                Date.now() + 365 * 24 * 60 * 60 * 1000
              ).toISOString()
            );
          }
        }

        if (user && organizationUser) {
          created.push({ row: idx + 2, data: row });
        } else if (!user && organizationUser) {
          updated.push({ row: idx + 2, data: row });
        }
      } catch (err: any) {
        errors.push({ row: idx + 2, error: err.message, data: row });
      }
    }

    const report: ImportReportType = { created, updated, errors };
    onReport(report);
    setFileData([]);
    setLoading(false);
  };

  const generateUserTemplate = () => {
    if (!organization) return;

    // Campos básicos
    const basicFields = [
      { name: "email", label: "Correo" },
      { name: "name", label: "Nombre completo" },
      {
        name: "password",
        label: "Contraseña (opcional, si no se envía se autogenera)",
      },
    ];

    // Campos personalizados de la organización
    const orgFields = (organization.user_properties || []).map((prop: any) => {
      let label = prop.label || prop.name;
      if (prop.mandatory) label += " (OBLIGATORIO)";
      if (prop.type.toLowerCase() === "boolean") {
        label +=
          " [checkbox: escriba TRUE/1/SI para marcar, FALSE/0/NO para no marcar]";
      }
      return {
        name: prop.name,
        label,
        type: prop.type,
        mandatory: prop.mandatory,
      };
    });

    // Combina sin duplicar
    const fields = [
      ...basicFields,
      ...orgFields.filter(
        (f: { name: string }) => !basicFields.find((b) => b.name === f.name)
      ),
    ];

    const headers = fields.map((f) => f.name);
    const labels = fields.map((f) => f.label);

    const example: Record<string, any> = {
      email: "usuario@email.com",
      name: "Nombre Apellido",
      password: "123456",
    };
    orgFields.forEach((f: { type: string; name: string; mandatory: any }) => {
      if (f.type.toLowerCase() === "boolean") {
        example[f.name] = f.mandatory ? "TRUE" : "FALSE";
      } else if (!(f.name in example)) {
        example[f.name] = "";
      }
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
      labels,
      headers,
      Object.values(example),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, worksheet, "Usuarios");
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
