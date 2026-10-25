import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../services/firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // Remove listener antigo do perfil
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        if (!firebaseUser) {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        setLoading(true);

        const userRef = doc(
          db,
          "users",
          firebaseUser.uid
        );

        unsubscribeProfile = onSnapshot(
          userRef,

          (snapshot) => {
            if (snapshot.exists()) {
              setUserProfile({
                id: snapshot.id,
                ...snapshot.data(),
              });
            } else {
              setUserProfile(null);
            }

            setLoading(false);
          },

          (error) => {
            console.error(
              "Erro ao carregar perfil:",
              error
            );

            setUserProfile(null);
            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeAuth();

      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}