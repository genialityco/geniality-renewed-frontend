// utils/uploadImageToFirebase.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebaseConfig";

export async function uploadImageToFirebase(file: File, folder = "event_images") {
  const path = `${folder}/${Date.now()}_${file.name}`;
  try {
    const fileRef = ref(storage, path);
    const snap = await uploadBytes(fileRef, file, { contentType: file.type });
    const url = await getDownloadURL(snap.ref);
    return url;
  } catch (err: any) {
    console.error("Storage upload error:", err?.code, err?.message);
    throw err;
  }
}
