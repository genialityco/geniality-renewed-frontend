import { initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier  } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// 1) Creas la instancia normal
const auth = getAuth(app);

// 2) Hack: Forzar la propiedad para testing
// (tempAuth as any).settings.appVerificationDisabledForTesting = true;

auth.languageCode = 'es';

// 3) Exportas esa misma instancia como "auth"
export { auth, RecaptchaVerifier}