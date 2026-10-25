import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";

import { getFunctions } from "firebase/functions";


const firebaseConfig = {
  apiKey: "AIzaSyChcfGa3qJMv1pLF0ZT7YCXv74ANg_9-Co",

  authDomain: "lunivo-b9e69.firebaseapp.com",

  projectId: "lunivo-b9e69",

  storageBucket: "lunivo-b9e69.firebasestorage.app",

  messagingSenderId: "722337732594",

  appId: "1:722337732594:web:df9b5af106b183db31bd6b",

  measurementId: "G-CGH3P3Y910",
};


const app = initializeApp(
  firebaseConfig
);


export const auth = getAuth(
  app
);


export const db = getFirestore(
  app
);


export const storage = getStorage(
  app
);


/*
========================================
CLOUD FUNCTIONS
========================================

IMPORTANTE:

As Cloud Functions da LUNIVO foram
publicadas em southamerica-east1.

O frontend precisa utilizar exatamente
a mesma região.
*/

export const functions = getFunctions(
  app,
  "southamerica-east1"
);


export default app;