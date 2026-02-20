import api from "./api";

/**
 * Sube una imagen al servidor que a su vez la guarda en Firebase Storage
 */
export async function uploadImageToServer(
  file: File,
  folder: string = "quiz-blocks"
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await api.post<{ url: string }>(
    "/upload/image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.url;
}

/**
 * Sube un video al servidor que a su vez lo guarda en Firebase Storage
 */
export async function uploadVideoToServer(
  file: File,
  folder: string = "quiz-videos"
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await api.post<{ url: string }>(
    "/upload/video",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.url;
}

/**
 * Upload genérico para cualquier tipo de archivo
 */
export async function uploadFileToServer(
  file: File,
  folder: string = "quiz-files"
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await api.post<{ url: string }>(
    "/upload/file",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data.url;
}
