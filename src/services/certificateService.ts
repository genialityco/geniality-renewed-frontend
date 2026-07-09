import api from "./api";

export type CertificateFormat = "PNG" | "PDF";
export type CertificateFieldType = "TEXT" | "EMAIL" | "DATE" | "NUMBER";
export type CertificateFieldDataSource =
  | "userName"
  | "eventName"
  | "approvalPercentage"
  | "custom";

export interface TemplateFieldElement {
  name: string;
  label: string;
  type: CertificateFieldType;
  required: boolean;
  defaultValue?: string | null;
  dataSource: CertificateFieldDataSource;
  posX: number;
  posY: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontColor: string;
  fontWeight: "normal" | "bold";
  textAlign: "left" | "center" | "right";
  rotation: number;
  order: number;
}

export interface CertificateTemplate {
  _id: string;
  eventId: string;
  name?: string;
  description?: string;
  backgroundUrl: string;
  width: number;
  height: number;
  format: CertificateFormat;
  status: "ACTIVE" | "INACTIVE";
  fields: TemplateFieldElement[];
}

export interface UpsertCertificateTemplateDto {
  name?: string;
  description?: string;
  backgroundUrl: string;
  width: number;
  height: number;
  format?: CertificateFormat;
  status?: "ACTIVE" | "INACTIVE";
  fields: TemplateFieldElement[];
}

export interface GenerateCertificateDto {
  eventId: string;
  format?: CertificateFormat;
  data: Record<string, string | number>;
  userId?: string;
}

export interface GeneratedCertificate {
  _id: string;
  eventId: string;
  templateId: string;
  data: Record<string, unknown>;
  format: CertificateFormat;
  filePath?: string;
  fileUrl?: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  errorMessage?: string;
  generatedAt?: string;
  viewUrl?: string;
  downloadUrl?: string;
}

export const getCertificateTemplateByEvent = async (
  eventId: string,
): Promise<CertificateTemplate | null> => {
  const response = await api.get<CertificateTemplate | null>(
    `/certificate-templates/event/${eventId}`,
  );
  return response.data;
};

export const upsertCertificateTemplate = async (
  eventId: string,
  dto: UpsertCertificateTemplateDto,
): Promise<CertificateTemplate> => {
  const response = await api.put<CertificateTemplate>(
    `/certificate-templates/event/${eventId}`,
    dto,
  );
  return response.data;
};

export const deleteCertificateTemplate = async (
  eventId: string,
): Promise<void> => {
  await api.delete(`/certificate-templates/event/${eventId}`);
};

export const uploadCertificateBackground = async (
  file: File,
): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ url: string }>(
    "/certificate-templates/upload-background",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
};

export const generateCertificate = async (
  dto: GenerateCertificateDto,
): Promise<GeneratedCertificate> => {
  const response = await api.post<GeneratedCertificate>(
    "/certificates/generate",
    dto,
  );
  return response.data;
};

export const getCertificateDeliveryUrls = (
  certificate: Pick<GeneratedCertificate, "_id" | "viewUrl" | "downloadUrl">,
): { viewUrl: string; downloadUrl: string } => {
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  const viewUrl = certificate.viewUrl
    ? `${base}${certificate.viewUrl}`
    : `${base}/certificates/${certificate._id}/view`;

  const downloadUrl = certificate.downloadUrl
    ? `${base}${certificate.downloadUrl}`
    : `${base}/certificates/${certificate._id}/download`;

  return { viewUrl, downloadUrl };
};
