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
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import {
  createOrUpdateUser,
  fetchUserByFirebaseUid,
  logout,
  refreshSessionToken,
} from "../services/userService";
import {
  fetchOrganizationUserByEmail,
  fetchOrganizationUserByUserId,
  createOrUpdateOrganizationUser,
} from "../services/organizationUserService";
import {
  fetchPaymentPlanByUserId,
  updatePaymentPlanDateUntil,
  createPaymentPlan,
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
  memberShipStatus?: boolean;
}

interface UserContextValue {
  firebaseUser: FirebaseUser | null;
  userId: string | null;
  organizationUserData: any;
  name: string;
  email: string;
  loading: boolean;
  loadingUserData: boolean;
  sessionToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<void>;
  signOut: () => Promise<void>;
  adminCreateMember?: typeof adminCreateMember;
  adminCreateUserAndOrganizationUser?: typeof adminCreateUserAndOrganizationUser;
}

function extractOrganizationId(organizationUser: any): string | null {
  const raw = organizationUser?.organization_id;
  if (!raw) return null;
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && typeof raw._id === "string") return raw._id;
  return null;
}

function persistLastOrganizationId(organizationUser: any) {
  const organizationId = extractOrganizationId(organizationUser);
  if (organizationId) {
    localStorage.setItem("lastOrganizationId", organizationId);
  }
}

/**
 * Permite crear un usuario y su organization-user desde el admin.
 * Si el usuario ya existe en Firebase, actualiza el organization-user y el paymentPlan.date_until.
 */
export async function adminCreateMember(data: AdminCreateUserData) {
  let firebaseUser;
  try {
    const methods = await fetchSignInMethodsForEmail(auth, data.email);
    if (methods.length > 0) {
      alert("Usuario existente");
      return null;
    }
  } catch (err) {
    console.error("Error verificando el email en Firebase:", err);
    alert("Error al crear el usuario");
    return null;
  }

  try {
    // 1) Crear en Firebase Auth
    firebaseUser = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password,
    );

    // 2) Crear en /users (backend)
    const userRecord = await createOrUpdateUser({
      uid: firebaseUser.user.uid,
      email: data.email,
      names: data.name,
      ...data.properties,
    });

    // 3) Crear en /organization-users (backend)
    const organizationUserRecord = await createOrUpdateOrganizationUser({
      user_id: userRecord._id,
      organization_id: data.organizationId,
      position_id: data.positionId,
      rol_id: data.rolId,
      properties: data.properties,
      memberShipStatus: data.memberShipStatus,
    });

    return { user: userRecord, organizationUser: organizationUserRecord };
  } catch (error) {
    console.error("Error creating member:", error);
    alert("Error al crear el usuario");
    return null;
  }
}

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
      data.password,
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
      memberShipStatus: data.memberShipStatus,
    });

    return { user: userRecord, organizationUser: organizationUserRecord };
  } catch (e: any) {
    if (e.code === "auth/email-already-in-use") {
      // Busca el organizationUser por email
      const organizationUser = await fetchOrganizationUserByEmail(data.email);
      if (!organizationUser) {
        throw new Error(
          "El usuario ya existe pero no se encontró su registro en la organización.",
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
        memberShipStatus:
          data.memberShipStatus !== undefined
            ? data.memberShipStatus
            : organizationUser.memberShipStatus,
      });

      // Si tiene payment_plan_id, actualiza date_until
      if (organizationUser.payment_plan_id) {
        try {
          const paymentPlan = await fetchPaymentPlanByUserId(
            typeof organizationUser.user_id === "string"
              ? organizationUser.user_id
              : organizationUser.user_id?._id,
          );
          const names = organizationUser.properties.nombres
            ? organizationUser.properties.nombres
            : organizationUser.properties.names;

          if (paymentPlan && paymentPlan._id) {
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + 365);
            await updatePaymentPlanDateUntil(
              paymentPlan._id,
              newDate.toISOString(),
              names,
            );
          }
        } catch {
          // Si no tiene paymentPlan, no hacer nada
        }
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
  signIn: async () => { },
  signUp: async () => { },
  signOut: async () => { },
  adminCreateUserAndOrganizationUser: undefined,
  sessionToken: null,
  adminCreateMember: undefined,
  loadingUserData: false
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationUserData, setOrganizationUserData] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [loadingUserData, setLoadingUserData] = useState(true);

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
  // En el useEffect que valida la sesión local
  useEffect(() => {
    if (!loading && firebaseUser) {
      (async () => {
        setLoadingUserData(true);
        const localData = localStorage.getItem("myUserInfo");
        if (localData) {
          try {
            const parsed = JSON.parse(localData); // parsed.sessionToken = MI token
            const userData = await fetchUserByFirebaseUid(firebaseUser.uid);
            setSessionToken(parsed.sessionToken ?? null);
            // userData.sessionTokens = [{token, createdAt}, ...]
            // const activeTokens: string[] = Array.isArray(userData.sessionTokens)
            //   ? userData.sessionTokens.map((t: any) => t.token)
            //   : [];

            // if (!activeTokens.includes(parsed.sessionToken)) {
            //   alert(
            //     "Tu sesión fue cerrada porque se inició en otro dispositivo."
            //   );
            //   await signOut();
            //   return;
            // }

            // Si es válido, sincroniza
            setUserId(userData._id);
            setName(userData.name || userData.names);
            setEmail(userData.email);
            const orgUser = await fetchOrganizationUserByUserId(userData._id);
            setOrganizationUserData(orgUser);
            persistLastOrganizationId(orgUser);
          } catch {
            console.error("Error validando sesión múltiple (max 2)");
            await signOut();
          }
        }
        setLoadingUserData(false);
      })();
    } else if (!loading && !firebaseUser) {
      setLoadingUserData(false);
    }
    // eslint-disable-next-line
  }, [loading, firebaseUser]);

  // signIn: Firebase + carga user desde backend
  // En UserContext.tsx (signIn)
  const signIn = useCallback(async (email: string, password: string) => {
    // 1) Login Firebase
    const result = await signInWithEmailAndPassword(auth, email, password);
    const uid = result.user.uid;

    // 2) REFRESCA y OBTÉN tu token propio (string)
    const sessionToken = await refreshSessionToken(uid);

    // 3) Trae el usuario (ya con sessionTokens en backend)
    const userData = await fetchUserByFirebaseUid(uid);
    if (!userData) {
      // Usuario no existe en tu backend (404): limpia y error controlado
      await firebaseSignOut(auth);
      localStorage.removeItem("myUserInfo");
      throw new Error("Usuario no encontrado en el backend.");
    }

    // 4) Data adicional (org user)
    const organizationUserData = await fetchOrganizationUserByUserId(
      userData._id,
    );

    // 5) Estado React
    setUserId(userData._id);
    setOrganizationUserData(organizationUserData);
    persistLastOrganizationId(organizationUserData);
    setName(userData.name || userData.names);
    setEmail(userData.email);
    setSessionToken(sessionToken);
    // 6) Persistencia local para headers (x-uid / x-session-token)
    localStorage.setItem(
      "myUserInfo",
      JSON.stringify({
        ...userData,
        sessionToken, // ← SOLO el tuyo
      }),
    );
  }, []);

  // signUp: Firebase + /users + /organization-users
  const signUp = useCallback(async (data: SignUpData) => {
    const { email, password, properties, organizationId, positionId, rolId } =
      data;

    // Asegura que siempre uses 'names'
    const nombres =
      properties.names || properties.nombres || properties["nombre"] || "";
    const apellidos =
      properties.surnames ||
      properties.apellidos ||
      properties["apellido"] ||
      "";

    const fullName = [nombres, apellidos].filter(Boolean).join(" ").trim();

    if (!email || !fullName) {
      throw new Error("Faltan datos requeridos: nombres y/o correo.");
    }

    // 1) Firebase Auth — si el email ya existe, intentar login con las mismas credenciales
    //    (el usuario puede estar registrado en otra organización)
    let uid: string;
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      uid = result.user.uid;
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        try {
          const result = await signInWithEmailAndPassword(auth, email, password);
          uid = result.user.uid;
        } catch (signInErr: any) {
          console.error("[signUp] signInWithEmailAndPassword falló:", signInErr);
          throw signInErr;
        }
      } else {
        console.error("[signUp] createUserWithEmailAndPassword falló:", err);
        throw err;
      }
    }

    // 2) /users
    const userRecord = await createOrUpdateUser({
      uid,
      email,
      names: fullName, // ¡Envíalo así!
      password,
      // ...otros (no sobrescribir names con properties)
    });

    // 3) /organization-users

    const organizationUserRecord = await createOrUpdateOrganizationUser({
      user_id: userRecord._id,
      organization_id: organizationId,
      position_id: positionId,
      rol_id: rolId,
      properties,
    });

    if (organizationId === "69b8b6a29eb40b31cec35d88") {
      const newPlan = await createPaymentPlan({
        days: 365,
        date_until: new Date(
          new Date().setDate(new Date().getDate() + 365),
        ).toISOString(),
        price: 50000,
        organization_user_id: organizationUserRecord._id,
        source: "manual",
      });

      await createOrUpdateOrganizationUser({
        properties: organizationUserRecord.properties ,
        rol_id: organizationUserRecord.rol_id ,
        organization_id: organizationUserRecord.organization_id ,
        position_id: organizationUserRecord.position_id ,
        user_id: organizationUserRecord.user_id,
        payment_plan_id: newPlan._id,
      });
    }

    const sessionToken = await refreshSessionToken(uid);
    // Estado y localStorage
    setUserId(userRecord._id);
    setOrganizationUserData(organizationUserRecord);
    persistLastOrganizationId(organizationUserRecord);
    setName(userRecord.names); // <- usar 'names' aquí también
    setEmail(userRecord.email);
    setSessionToken(sessionToken);
    localStorage.setItem(
      "myUserInfo",
      JSON.stringify({ ...userRecord, sessionToken }),
    );
  }, []);

  // signOut: Firebase + limpiar estado
  const signOut = useCallback(async () => {
    const targetOrganizationId =
      extractOrganizationId(organizationUserData) ||
      localStorage.getItem("lastOrganizationId");

    const info = localStorage.getItem("myUserInfo");
    const { uid, sessionToken } = info ? JSON.parse(info) : {};

    try {
      if (uid && sessionToken) {
        await logout(uid, sessionToken);
      }
    } catch {
      /* ignora errores de red */
    }

    try {
      await firebaseSignOut(auth);
    } catch {}
    setFirebaseUser(null);
    setUserId(null);
    setOrganizationUserData(null);
    setName("");
    setEmail("");
    localStorage.removeItem("myUserInfo");
    localStorage.removeItem("manualLogout");

    if (typeof window !== "undefined") {
      if (targetOrganizationId) {
        window.location.href = `/organization/${targetOrganizationId}`;
      } else {
        window.location.href = "/";
      }
    }
  }, [organizationUserData]);

  return (
    <UserContext.Provider
      value={{
        firebaseUser,
        userId,
        organizationUserData,
        name,
        email,
        loading,
        loadingUserData,
        sessionToken,
        signIn,
        signUp,
        signOut,
        adminCreateUserAndOrganizationUser,
        adminCreateMember,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
