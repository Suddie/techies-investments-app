import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCf7Ht_iuPA_UaOX4ItaRiZdkE3qxR2GzE", // Fallback for client-side, ensure NEXT_PUBLIC_ prefix for env var
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "techiesapp-d65c6.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "techiesapp-d65c6",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "techiesapp-d65c6.appspot.com", // Corrected hostname
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "598617762416",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:598617762416:web:7f463266f940646f58e2b5"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);
functions = getFunctions(app);
// You can configure the region for functions if needed:
// functions = getFunctions(app, 'europe-west1');


export { app, auth, db, storage, functions };
