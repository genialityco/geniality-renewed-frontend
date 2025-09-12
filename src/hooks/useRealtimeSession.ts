// src/hooks/useRealtimeSession.ts
import { useEffect } from "react";
import { getDatabase, ref, onValue, off } from "firebase/database";
import { useUser } from "../context/UserContext";

// useRealtimeSession.ts
export function useRealtimeSession() {
  const { firebaseUser, sessionToken, signOut } = useUser();

  useEffect(() => {
    const uid = firebaseUser?.uid;
    const token = sessionToken;
    if (!uid || !token) return;

    const db = getDatabase();
    const nodeRef = ref(db, `sessions/${uid}/${token}`);

    const unsub = onValue(nodeRef, (snap) => {
      if (!snap.exists() || snap.child("revoked").val() === true) {
        signOut();
      }
    });

    return () => {
      off(nodeRef);
      unsub?.();
    };
  }, [firebaseUser?.uid, sessionToken]);
}
