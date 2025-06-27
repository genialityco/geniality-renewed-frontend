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
import {
  createOrUpdateUser,
  fetchUserByFirebaseUid,
} from "../services/userService";
import {
  fetchOrganizationUserByEmail,
  fetchOrganizationUserByUserId,
  createOrUpdateOrganizationUser,
} from "../services/organizationUserService";
import {
  fetchPaymentPlanByUserId,
  updatePaymentPlanDateUntil,
} from "../services/paymentPlansService";

interface SignUpData {
  email: string;
  password: string;
  properties: Record<string, any>;
  organizationId: string;
  positionId: string;
  rolId: string;
}

interface AdminCreateUserData {
  email: string;
  name: string;
  properties: Record<string, any>;
  organizationId: string;
  positionId: string;
  rolId: string;
  password: string;
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

/**
 * Permite crear un usuario y su organization-user desde el admin.
 * Si el usuario ya existe en Firebase, actualiza el organization-user y el paymentPlan.date_until.
 */
async function adminCreateUserAndOrganizationUser(data: AdminCreateUserData) {
  let firebaseUser;
  let userRecord;
  let organizationUserRecord;
  // let paymentPlan;

  try {
    // 1) Intenta crear el usuario en Firebase Auth
    firebaseUser = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );

    // 2) Crea el usuario en el backend
    userRecord = await createOrUpdateUser({
      uid: firebaseUser.user.uid,
      email: data.email,
      names: data.name,
      ...data.properties,
    });

    // 3) Crea el organization-user
    organizationUserRecord = await createOrUpdateOrganizationUser({
      user_id: userRecord._id,
      organization_id: data.organizationId,
      position_id: data.positionId,
      rol_id: data.rolId,
      properties: data.properties,
    });

    return { user: userRecord, organizationUser: organizationUserRecord };
  } catch (e: any) {
    if (e.code === "auth/email-already-in-use") {
      // Busca el organizationUser por email
      const organizationUser = await fetchOrganizationUserByEmail(data.email);
      if (!organizationUser) {
        throw new Error(
          "El usuario ya existe pero no se encontró su registro en la organización."
        );
      }

      // Merge de properties: prioriza los nuevos datos
      const mergedProperties = {
        ...organizationUser.properties,
        ...data.properties,
      };

      // Actualiza el organization-user (mantiene los campos existentes, reemplaza los nuevos)
      const updatedOrganizationUser = await createOrUpdateOrganizationUser({
        user_id: organizationUser.user_id,
        organization_id: organizationUser.organization_id,
        position_id: data.positionId || organizationUser.position_id,
        rol_id: data.rolId || organizationUser.rol_id,
        properties: mergedProperties,
        payment_plan_id: organizationUser.payment_plan_id,
      });

      // Si tiene payment_plan_id, actualiza date_until
      if (organizationUser.payment_plan_id) {
        try {
          const paymentPlan = await fetchPaymentPlanByUserId(
            typeof organizationUser.user_id === "string"
              ? organizationUser.user_id
              : organizationUser.user_id?._id
          );
          if (paymentPlan && paymentPlan._id) {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 365);
            await updatePaymentPlanDateUntil(
              paymentPlan._id,
              newDate.toISOString()
            );
          }
        } catch {
          // Si no tiene paymentPlan, no hacer nada
        }

        console.log("Payment plan updated successfully");
      }

      return { user: null, organizationUser: updatedOrganizationUser };
    }
    throw e;
  }
}

const UserContext = createContext<
  UserContextValue & {
    adminCreateUserAndOrganizationUser?: typeof adminCreateUserAndOrganizationUser;
  }
>({
  firebaseUser: null,
  userId: null,
  organizationUserData: null,
  name: "",
  email: "",
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  adminCreateUserAndOrganizationUser: undefined,
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
    const organizationUserData = await fetchOrganizationUserByUserId(
      userData._id
    );
    setUserId(userData._id);
    setOrganizationUserData(organizationUserData);
    setName(userData.name);
    setEmail(userData.email);
    localStorage.setItem("myUserInfo", JSON.stringify(userData));
  }, []);

  // signUp: Firebase + /users + /organization-users
  const signUp = useCallback(async (data: SignUpData) => {
    const { email, password, properties, organizationId, positionId, rolId } =
      data;

    // Asegura que siempre uses 'names'
    const names =
      properties.names ||
      properties["Nombres Y Apellidos"] ||
      properties["nombres y apellidos"] ||
      properties["nombre"] ||
      "";

    if (!email || !names) {
      throw new Error("Faltan datos requeridos: nombres y/o correo.");
    }

    // 1) Firebase Auth
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;

    // 2) /users
    const userRecord = await createOrUpdateUser({
      uid,
      email,
      names, // ¡Envíalo así!
      // ...otros (no sobrescribir names con properties)
    });

    // 3) /organization-users
    await createOrUpdateOrganizationUser({
      user_id: userRecord._id,
      organization_id: organizationId,
      position_id: positionId,
      rol_id: rolId,
      properties,
    });

    // Estado y localStorage
    setUserId(userRecord._id);
    setName(userRecord.names); // <- usar 'names' aquí también
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
    <UserContext.Provider
      value={{
        firebaseUser,
        userId,
        organizationUserData,
        name,
        email,
        loading,
        signIn,
        signUp,
        signOut,
        adminCreateUserAndOrganizationUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
