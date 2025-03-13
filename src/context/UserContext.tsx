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
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { createOrUpdateUser } from "../services/userService";
// import { fetchUserById } from "../services/userService";

interface UserContextValue {
  firebaseUser: FirebaseUser | null;
  userId: string | null;
  name: string;
  email: string;
  loading: boolean;
  updateUserData: (name: string, email: string) => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  firebaseUser: null,
  userId: null,
  name: "",
  email: "",
  loading: true,
  updateUserData: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Suscripción a Firebase Auth con persistencia local
  useEffect(() => {
    // Configuramos la persistencia
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        // Una vez configurada, nos suscribimos
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!user) {
            try {
              // Inicia sesión anónima
              const cred = await signInAnonymously(auth);
              setFirebaseUser(cred.user);
            } catch (err) {
              console.error("Error al iniciar sesión anónima:", err);
            }
          } else {
            setFirebaseUser(user);
          }
          setLoading(false);
        });
        return () => unsubscribe();
      })
      .catch((err) => {
        console.error("Error setting persistence:", err);
        setLoading(false);
      });
  }, []);

  // Cargar datos del usuario desde localStorage una vez que tenemos firebaseUser
  useEffect(() => {
    if (!loading && firebaseUser) {
      const localData = localStorage.getItem("myUserInfo");
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setUserId(parsed._id);
          setName(parsed.name);
          setEmail(parsed.email);

          // Opcional: confirmarlo con tu backend
          // const userDb = await fetchUserById(parsed._id);
          // setName(userDb.name);
          // setEmail(userDb.email);
        } catch (error) {
          console.error("Error parseando localStorage:", error);
        }
      }
    }
  }, [loading, firebaseUser]);

  // Crear/actualizar datos en la BD
  const updateUserData = useCallback(
    async (newName: string, newEmail: string) => {
      if (!firebaseUser) return;
      try {
        const result = await createOrUpdateUser({
          firebase_uid: firebaseUser.uid,
          name: newName,
          email: newEmail,
        });
        setUserId(result._id);
        setName(result.name);
        setEmail(result.email);

        // Guardar en localStorage
        localStorage.setItem("myUserInfo", JSON.stringify(result));
      } catch (err) {
        console.error("Error al actualizar o crear usuario:", err);
      }
    },
    [firebaseUser]
  );

  return (
    <UserContext.Provider
      value={{
        firebaseUser,
        userId,
        name,
        email,
        loading,
        updateUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
