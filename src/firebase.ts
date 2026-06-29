import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore specific to the applet database instance
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export { db };
