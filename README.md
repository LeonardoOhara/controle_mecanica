# controle_mecanica
Sistema básico de controle de mecânica.

## Firebase

1. Crie um projeto no Firebase Console.
2. Ative o Firestore Database.
3. No arquivo [assets/js/firebase-config.js](assets/js/firebase-config.js), preencha os valores do seu app web:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId
4. Salve o arquivo.
5. A aplicação passa a sincronizar os dados com o Firestore automaticamente.

> Se os campos ficarem vazios, o sistema continua funcionando em localStorage como fallback.
