const DEFAULT_FIREBASE_COLLECTION = 'app_data';

export function isFirebaseConfigured() {
  const config = window.FIREBASE_CONFIG || {};
  const values = Object.values(config);

  return Boolean(
    window.firebase &&
    typeof window.firebase.firestore === 'function' &&
    values.length > 0 &&
    values.every((value) => String(value).trim() !== '')
  );
}

export function setFirebaseConfig(config = {}) {
  window.FIREBASE_CONFIG = {
    ...(window.FIREBASE_CONFIG || {}),
    ...config
  };

  window.FIREBASE_ENABLED = Object.values(window.FIREBASE_CONFIG || {}).every(
    (value) => String(value).trim() !== ''
  );
}

function getFirebaseCollectionName() {
  return window.FIREBASE_COLLECTION || DEFAULT_FIREBASE_COLLECTION;
}

function getFirebaseDb() {
  if (!isFirebaseConfigured() || !window.firebase || !window.firebase.firestore) {
    return null;
  }

  return window.firebase.firestore();
}

export async function syncFromFirebase() {
  const db = getFirebaseDb();

  if (!db) return;

  try {
    const snapshot = await db.collection(getFirebaseCollectionName()).get();

    snapshot.forEach((doc) => {
      const payload = doc.data();
      const value = payload?.value ?? payload;

      try {
        localStorage.setItem(doc.id, JSON.stringify(value));
      } catch (error) {
        console.warn('Falha ao sincronizar documento do Firebase para o localStorage:', error);
      }
    });
  } catch (error) {
    console.warn('Firebase indisponível no momento. Mantendo funcionamento em localStorage.', error);
  }
}

export async function writeFirebaseDocument(key, value) {
  const db = getFirebaseDb();

  if (!db) return;

  try {
    await db.collection(getFirebaseCollectionName()).doc(key).set({
      value: JSON.stringify(value),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Não foi possível salvar no Firebase. Os dados continuam no localStorage.', error);
  }
}

export function readStorage(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));

  if (isFirebaseConfigured()) {
    writeFirebaseDocument(key, value);
  }
}
