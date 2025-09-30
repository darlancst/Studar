# 📱 Guia de Teste PWA - Studar

## 🚨 **Problema Identificado:**
PWAs só funcionam com **HTTPS** (não com IP local HTTP)

## ✅ **Como Testar o PWA:**

### **Método 1: Localhost (Simples)**
```bash
npm start
# Acesse no PC: http://localhost:3000
# Deve mostrar "Instalar Studar" no Chrome
```

### **Método 2: Netlify Drop (Super Fácil)**
1. Faça build: `npm run build`
2. Vá em: https://app.netlify.com/drop
3. Arraste a pasta `.next` para o site
4. Use o link gerado no celular

### **Método 3: GitHub Pages**
1. Código já está no GitHub
2. Va em: Settings > Pages
3. Source: Deploy from a branch > main
4. Link público será gerado

### **Método 4: Vercel (Recomendado)**
```bash
vercel login  # Fazer login (abre navegador)
vercel --prod # Deploy automático
```

## 🔍 **Debug PWA:**
- Ao abrir o app, clique em **"Debug PWA"** (botão no canto inferior esquerdo)
- Veja todos os status do PWA
- ❌ Conexão não segura = Precisa HTTPS
- ✅ Tudo verde = PWA funcional

## 📱 **Como Instalar:**

### **Android (Chrome/Edge):**
1. Abra o link HTTPS no navegador
2. Aparecerá: 🔽 "Instalar Studar"
3. Clique e confirme

### **iOS (Safari):**
1. Abra o link no Safari
2. Toque em: Compartilhar 📤
3. Selecione: "Adicionar à Tela Inicial"

## ⚡ **Teste Rápido (Recomendado):**
1. `npm run build && npm start`
2. Acesse: http://localhost:3000
3. Abra DevTools (F12) > Application > Manifest
4. Se aparecer os ícones = PWA OK! 