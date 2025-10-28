import { initializeApp } from 'firebase/app';
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyATCowg_nLunBh8DqEkgj0RL0G0hcc6vDM",
  authDomain: "picklah-cb437.firebaseapp.com",
  projectId: "picklah-cb437",
  storageBucket: "picklah-cb437.appspot.com",
  messagingSenderId: "413259308918",
  appId: "1:413259308918:web:your-app-id" //get friom firebase console
};

const app = initializeApp(firebaseConfig);
console.log("✅ Firebase initialized:", app.name);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);  