// src/context/UserContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { auth } from "../firebase/firebaseConfig";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { createOrUpdateUser, fetchUserByFirebaseUid } from "../services/userService";
import { createOrUpdateOrganizationUser, fetchOrganizationUserByUserId } from "../services/organizationUserService";

interface SignUpData {
  email: string;
  password: string;
  properties: Record<string, any>;
  organizationId: string;
  positionId: string;
  rolId: string;
}

interface UserContextValue {
  firebaseUser: FirebaseUser | null;
  userId: string | null;
  organizationUserData: any;
  name: string;
  email: string;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  firebaseUser: null,
  userId: null,
  organizationUserData: null,
  name: "",
  email: "",
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationUserData, setOrganizationUserData] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Persistencia y suscripción a Auth
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setFirebaseUser(user);
          setLoading(false);
        });
        return () => unsubscribe();
      })
      .catch((err) => {
        console.error("Error setting persistence:", err);
        setLoading(false);
      });
  }, []);

  // Carga user info de localStorage
  useEffect(() => {
    if (!loading && firebaseUser) {
      const localData = localStorage.getItem("myUserInfo");
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setUserId(parsed._id);
          setName(parsed.name);
          setEmail(parsed.email);
        } catch {
          console.error("Error parsing localStorage user info");
        }
      }
    }
  }, [loading, firebaseUser]);

  // signIn: Firebase + carga user desde backend
  const signIn = useCallback(async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userData = await fetchUserByFirebaseUid(result.user.uid);
    const organizationUserData = await fetchOrganizationUserByUserId(userData._id);
    setUserId(userData._id);
    setOrganizationUserData(organizationUserData);
    setName(userData.name);
    setEmail(userData.email);
    localStorage.setItem("myUserInfo", JSON.stringify(userData));
  }, []);

  // signUp: Firebase + /users + /organization-users
  const signUp = useCallback(async (data: SignUpData) => {
    const { email, password, properties, organizationId, positionId, rolId } = data;

    // 1) Firebase Auth
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;

    // 2) /users
    const userRecord = await createOrUpdateUser({
      uid,
      email,
      ...properties,
      name: properties.names || properties.name || "",
    });

    // 3) /organization-users
    await createOrUpdateOrganizationUser({
      user_id: userRecord._id,
      organization_id: organizationId,
      position_id: positionId,
      rol_id: rolId,
      properties,
    });

    // 4) Estado y localStorage
    setUserId(userRecord._id);
    setName(userRecord.name);
    setEmail(userRecord.email);
    localStorage.setItem("myUserInfo", JSON.stringify(userRecord));
  }, []);

  // signOut: Firebase + limpiar estado
  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setFirebaseUser(null);
    setUserId(null);
    setName("");
    setEmail("");
    localStorage.removeItem("myUserInfo");
  }, []);

  return (
    <UserContext.Provider value={{ firebaseUser, userId, organizationUserData, name, email, loading, signIn, signUp, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
