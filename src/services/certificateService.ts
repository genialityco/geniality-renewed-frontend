import axios from "axios";

const CERTIFICATE_API_URL =
  import.meta.env.VITE_CERTIFICATE_API_URL ||
  "https://oyster-app-vupd3.ondigitalocean.app";

const certificateApi = axios.create({
  baseURL: CERTIFICATE_API_URL.replace(/\/$/, ""),
});

export type CertificateFormat = "PNG" | "PDF";

export interface TemplateField {
  _id: string;
  templateId: string;
  name: string;
  label: string;
  type: "TEXT" | "EMAIL" | "DATE" | "NUMBER";
  required: boolean;
  defaultValue: string | null;
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

export interface GenerateCertificateDto {
  templateId: string;
  format: CertificateFormat;
  data: Record<string, string | number>;
}

export interface GeneratedCertificate {
  _id: string;
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

export const getTemplateFieldsByTemplate = async (
  templateId: string,
): Promise<TemplateField[]> => {
  const response = await certificateApi.get<TemplateField[]>(
    `/internal/template-fields/template/${templateId}`,
  );
  return response.data;
};

export const generateCertificate = async (
  dto: GenerateCertificateDto,
): Promise<GeneratedCertificate> => {
  const response = await certificateApi.post<GeneratedCertificate>(
    "/api/v1/certificates/generate",
    dto,
  );
  return response.data;
};

export const getCertificateDeliveryUrl = (
  certificate: Pick<GeneratedCertificate, "_id" | "viewUrl">,
): string => {
  const base = CERTIFICATE_API_URL.replace(/\/$/, "");
  if (certificate.viewUrl) {
    if (certificate.viewUrl.startsWith("http")) return certificate.viewUrl;
    return `${base}${certificate.viewUrl}`;
  }
  return `${base}/api/v1/certificates/${certificate._id}/view`;
};

export const getCertificateDeliveryUrls = (
  certificate: Pick<GeneratedCertificate, "_id" | "viewUrl" | "downloadUrl">,
): { viewUrl: string; downloadUrl: string } => {
  const base = CERTIFICATE_API_URL.replace(/\/$/, "");

  const viewUrl = certificate.viewUrl
    ? certificate.viewUrl.startsWith("http")
      ? certificate.viewUrl
      : `${base}${certificate.viewUrl}`
    : `${base}/api/v1/certificates/${certificate._id}/view`;

  const downloadUrl = certificate.downloadUrl
    ? certificate.downloadUrl.startsWith("http")
      ? certificate.downloadUrl
      : `${base}${certificate.downloadUrl}`
    : `${base}/api/v1/certificates/${certificate._id}/download`;

  return { viewUrl, downloadUrl };
};
