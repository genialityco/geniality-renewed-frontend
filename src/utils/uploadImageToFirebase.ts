// utils/uploadImageToFirebase.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase/firebaseConfig";

export async function uploadImageToFirebase(file: File, folder = "event_images") {
  const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  const snap = await uploadBytes(fileRef, file, { contentType: file.type });
  return await getDownloadURL(snap.ref);
}
