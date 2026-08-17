// ==============================
// Firebase: configure aqui
// ==============================
// 1) Crie um projeto no Firebase Console.
// 2) Ative o Firestore Database.
// 3) Cole os valores do seu app web abaixo.
// 4) Deixe os campos preenchidos e a aplicação passará a salvar os dados no Firebase.
//
// Exemplo de onde pegar:
// Firebase Console > Project overview > Configuração do projeto > Seus apps > Web app > Configuração do SDK
//
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyAU-dRRX9Rez73uYk1KS0bVyOtZ8cZAkFQ",
  authDomain: "controlemecanica-1da18.firebaseapp.com",
  projectId: "controlemecanica-1da18",
  storageBucket: "controlemecanica-1da18.firebasestorage.app",
  messagingSenderId: "345411514187",
  appId: "1:345411514187:web:62d9ccbfa465c4deb802ce"
};

if (window.firebase && typeof window.firebase.initializeApp === 'function') {
  if (!window.firebase.apps || window.firebase.apps.length === 0) {
    window.firebase.initializeApp(window.FIREBASE_CONFIG);
  }
}

window.FIREBASE_COLLECTION = 'app_data';
window.FIREBASE_ENABLED = Object.values(window.FIREBASE_CONFIG).every(
  (value) => String(value).trim() !== ''
);
