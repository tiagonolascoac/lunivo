import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "./firebase";

export async function registerUser({
  name,
  email,
  password,
  role,
}) {
  if (!["customer", "photographer"].includes(role)) {
    throw new Error("Tipo de usuário inválido.");
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  await updateProfile(credential.user, {
    displayName: name,
  });

  await setDoc(doc(db, "users", credential.user.uid), {
    name,
    email: email.toLowerCase(),
    role,
    status: "active",
    createdAt: serverTimestamp(),
  });

  return credential.user;
}

export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser() {
  return signOut(auth);
}