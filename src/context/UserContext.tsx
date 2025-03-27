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
import {
  createOrUpdateUser,
  fetchUserByFirebaseUid,
} from "../services/userService";

interface UserContextValue {
  firebaseUser: FirebaseUser | null;
  userId: string | null;
  name: string;
  email: string;
  loading: boolean;
  updateUserData: (uid: string, name: string, email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue>({
  firebaseUser: null,
  userId: null,
  name: "",
  email: "",
  loading: true,
  updateUserData: async () => {},
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // Configurar persistencia y suscribirse a los cambios en Firebase Auth
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

  // Cargar datos del usuario desde localStorage, en caso de existir
  useEffect(() => {
    if (!loading && firebaseUser) {
      const localData = localStorage.getItem("myUserInfo");
      if (localData) {
        try {
          const parsed = JSON.parse(localData);
          setUserId(parsed._id);
          setName(parsed.name);
          setEmail(parsed.email);
          // Opcional: validar con el backend si es necesario.
        } catch (error) {
          console.error("Error parseando localStorage:", error);
        }
      }
    }
  }, [loading, firebaseUser]);

  // Función para actualizar o crear los datos del usuario en la BD
  // Ahora se recibe el uid (ya sea de firebaseUser o del resultado de signUp)
  const updateUserData = useCallback(
    async (uid: string, newName: string, newEmail: string) => {
      try {
        const result = await createOrUpdateUser({
          uid,
          name: newName,
          email: newEmail,
        });

        setUserId(result._id);
        setName(result.name);
        setEmail(result.email);
        localStorage.setItem("myUserInfo", JSON.stringify(result));
      } catch (err) {
        console.error("Error al actualizar o crear usuario:", err);
      }
    },
    []
  );

  // Función para iniciar sesión con correo y contraseña
  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Actualiza los datos del usuario utilizando la información de Firebase.
      const userData = await fetchUserByFirebaseUid(result.user.uid);
      await updateUserData(
        userData.uid,
        userData.name || "",
        userData.email || email
      );
      return result;
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      throw err;
    }
  };

  // Función para registrarse con correo, contraseña y nombre
  // Se utiliza el usuario obtenido en el resultado para actualizar el backend
  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      // Aquí usamos result.user.uid en lugar de depender de firebaseUser
      await updateUserData(result.user.uid, name, email);
      return result;
    } catch (err) {
      console.error("Error al registrarse:", err);
      throw err;
    }
  };

  // Función para cerrar sesión
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Opcional: limpiar datos locales
      setFirebaseUser(null);
      setUserId(null);
      setName("");
      setEmail("");
      localStorage.removeItem("myUserInfo");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        firebaseUser,
        userId,
        name,
        email,
        loading,
        updateUserData,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
