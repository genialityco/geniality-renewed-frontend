// src/utils/uploadImageToFirebase.ts
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadImageToFirebase(file: File, folder = "event_images") {
  const storage = getStorage();
  const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  await uploadBytes(fileRef, file);
  return await getDownloadURL(fileRef);
}
