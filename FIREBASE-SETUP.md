# 🔥 Guia de Configuração Firebase - Studar

## 📋 **Passos para Configurar Firebase:**

### **1. Criar Projeto Firebase**
1. Acesse: [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Nome do projeto: `Studar` (ou nome de sua escolha)
4. Desabilite Analytics (ou mantenha se quiser)
5. Clique **"Criar projeto"**

### **2. Configurar Autenticação**
1. No menu lateral: **Authentication**
2. Clique **"Começar"**
3. Aba **"Sign-in method"**
4. Habilite **"Email/senha"** ✅
5. Habilite **"Google"** ✅ (opcional mas recomendado)

### **3. Configurar Firestore Database**
1. No menu lateral: **Firestore Database**
2. Clique **"Criar banco de dados"**
3. Escolha **"Iniciar em modo de teste"** (por enquanto)
4. Escolha localização: **us-central1** (ou mais próxima)

### **4. Configurar Web App**
1. Na página inicial do projeto, clique no ícone **`</>`** (Web)
2. Nome do app: `Studar Web`
3. ✅ Marque **"Configurar Firebase Hosting"**
4. Clique **"Registrar app"**
5. **COPIE** o objeto de configuração que aparecer:

```javascript
const firebaseConfig = {
  apiKey: "sua-api-key-aqui",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcd1234"
};
```

### **5. Configurar Variáveis de Ambiente**
1. Crie o arquivo `.env.local` na raiz do projeto
2. Cole as configurações:

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcd1234
```

### **6. Configurar Regras de Segurança**
No Firestore Database > Regras, substitua por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuários só podem acessar seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## ✅ **Teste da Configuração:**

### **Verificação Local:**
```bash
npm run dev
```

1. Clique no botão **"Entrar"** no canto superior direito
2. Crie uma conta ou faça login
3. Se aparecer ✅ **"Sincronizado"** = Firebase OK!

### **O que Deve Funcionar:**
- ✅ **Login/Cadastro** com email/senha
- ✅ **Login com Google** (se habilitado)
- ✅ **Sincronização automática** entre dispositivos
- ✅ **Funcionamento offline** com sync posterior
- ✅ **Dados seguros** (só você acessa seus dados)

## 🔧 **Comandos Úteis:**

### **Se algo der errado:**
```bash
# Verificar logs de erro
npm run build
# Olhar console do navegador (F12)
```

### **Para deploy em produção:**
```bash
# Firebase Hosting (opcional)
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🎯 **Funcionalidades Implementadas:**

### **🔐 Autenticação:**
- ✅ Email/Senha
- ✅ Login com Google  
- ✅ Cadastro automático
- ✅ Logout seguro

### **☁️ Sincronização:**
- ✅ **Dados na nuvem** - backup automático
- ✅ **Sync em tempo real** - mudanças aparecem instantaneamente
- ✅ **Offline-first** - funciona sem internet
- ✅ **Multi-dispositivo** - PC, celular, tablet

### **📱 Dados Sincronizados:**
- ✅ Matérias e Tópicos
- ✅ Calendário de estudos
- ✅ Histórico de Pomodoros
- ✅ Revisões espaçadas
- ✅ Simulados e estatísticas
- ✅ Configurações pessoais

## 🚨 **Problemas Comuns:**

### **"Firebase não definido"**
- Verifique se `.env.local` existe e tem todas as variáveis
- Reinicie o servidor: `npm run dev`

### **"Permissão negada"**
- Verifique as regras do Firestore
- Confirme que está logado

### **"Conexão recusada"**
- Verifique internet
- Confirme se projeto Firebase está ativo

---

## 🎉 **Resultado Final:**
Com essa configuração você terá um **app profissional** com:
- 📱 PWA instalável no celular
- ☁️ Dados sincronizados na nuvem
- 🔒 Autenticação segura
- 📊 Funciona offline
- 🌐 Acessível de qualquer lugar

**Seus dados do Studar estarão sempre sincronizados entre todos os seus dispositivos!** 