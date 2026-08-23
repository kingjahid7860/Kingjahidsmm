import React, { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth, rtdb, googleProvider } from "@/lib/firebase";

// The API is mounted at the workspace root, not below the frontend artifact
// path (/admin-panel/). Using BASE_URL here makes the login request 404.
const API_BASE = "/api";

interface FirebaseAuthContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextType | null>(null);

async function upsertDbUser(fbUser: FirebaseUser) {
  const nameParts = (fbUser.displayName ?? "").split(" ");
  await set(ref(rtdb, `users/${fbUser.uid}`), {
    email: fbUser.email ?? null,
    firstName: nameParts[0] ?? null,
    lastName: nameParts.slice(1).join(" ") || null,
    profileImageUrl: fbUser.photoURL ?? null,
    role: fbUser.email === "kingjahid0786@gmail.com" ? "admin" : "user",
    updatedAt: new Date().toISOString(),
  });
}

async function createServerSession(fbUser: FirebaseUser) {
  const idToken = await fbUser.getIdToken();
  const response = await fetch(`${API_BASE}/firebase-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    throw new Error("Could not create the server session");
  }
}

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        await upsertDbUser(fbUser);
        await createServerSession(fbUser);
      }
      setIsLoading(false);
    });
    return unsub;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await upsertDbUser(cred.user);
    await createServerSession(cred.user);
  };

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    await upsertDbUser(cred.user);
    await createServerSession(cred.user);
  };

  const logout = async () => {
    await signOut(auth);
    await fetch(`${API_BASE}/logout`, { credentials: "include" });
  };

  return (
    <FirebaseAuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signInWithEmail,
        signInWithGoogle,
        logout,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
}

export function useFirebaseAuth() {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) throw new Error("useFirebaseAuth must be used within FirebaseAuthProvider");
  return ctx;
}
