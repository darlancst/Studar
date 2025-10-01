import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork, disableNetwork } from 'firebase/firestore';

// Configuração do Firebase - só inicializa no cliente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Só inicializar Firebase se estiver no cliente E se houver configuração
let app: any = null;
let auth: any = null;
let db: any = null;

// Função para inicializar Firebase de forma segura
const initializeFirebase = () => {
  if (typeof window === 'undefined') return;
  if (app) return; // Já foi inicializado
  
  if (firebaseConfig.apiKey) {
    try {
      // Verificar se Firebase já foi inicializado
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      
      // Inicializar Auth e Firestore
      auth = getAuth(app);
      db = getFirestore(app);
    } catch (error) {
      console.error('Erro ao inicializar Firebase:', error);
    }
  }
};

// Inicializar quando estiver no cliente
if (typeof window !== 'undefined') {
  initializeFirebase();
}

// Funções utilitárias para modo offline (só funcionam no cliente)
export const enableOffline = () => {
  if (db && typeof window !== 'undefined') {
    return disableNetwork(db);
  }
  return Promise.resolve();
};

export const enableOnline = () => {
  if (db && typeof window !== 'undefined') {
    return enableNetwork(db);
  }
  return Promise.resolve();
};

// Verificar se Firebase está configurado
export const isFirebaseConfigured = () => {
  return !!(firebaseConfig.apiKey && app && auth && db);
};

// Getters seguros
export const getAuthInstance = () => {
  if (typeof window === 'undefined') return null;
  if (!auth) initializeFirebase();
  return auth;
};

export const getDbInstance = () => {
  if (typeof window === 'undefined') return null;
  if (!db) initializeFirebase();
  return db;
};

export { auth, db };
export default app;
