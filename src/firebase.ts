import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA2a81ZEjwE2rTLxyY4KTTABY_vu41Tmao",
  authDomain: "aioffice-c4ff2.firebaseapp.com",
  projectId: "aioffice-c4ff2",
  storageBucket: "aioffice-c4ff2.firebasestorage.app",
  messagingSenderId: "832669428273",
  appId: "1:832669428273:web:a82086569722e86556c310",
  measurementId: "G-JED1V7SZEC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
