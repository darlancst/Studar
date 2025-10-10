# 🔐 Configuração de Variáveis de Ambiente

## ⚠️ IMPORTANTE - Configure no Vercel

Para o sistema de autenticação funcionar, você **PRECISA** adicionar esta variável no Vercel:

### 1. JWT_SECRET (OBRIGATÓRIO)

Esta chave é usada para assinar os tokens de autenticação.

**Como configurar:**

1. Acesse seu projeto no [Vercel Dashboard](https://vercel.com)
2. Vá em **Settings** → **Environment Variables**
3. Adicione:
   ```
   Nome: JWT_SECRET
   Valor: [uma chave aleatória forte - veja abaixo como gerar]
   Ambientes: Production, Preview, Development (marque todos)
   ```

**Como gerar uma chave segura:**

```bash
# Opção 1: No terminal (Linux/Mac/Git Bash)
openssl rand -base64 32

# Opção 2: No Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opção 3: Online (use apenas para testes)
# https://generate-secret.vercel.app/32
```

**Exemplo de chave gerada:**
```
JWT_SECRET=Xk8mP2nQ5vR9wY3zA6bC4dF7gH1jK0lM8nO6pR2sT5u
```

### 2. Supabase

No Vercel, adicione as seguintes variáveis (após criar um projeto Supabase):

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (recomendado no server) OU SUPABASE_ANON_KEY (para testes)

Após salvar, faça Redeploy.

---

## 🚀 Após Configurar

1. **Salve** a variável no Vercel
2. **Redeploy** o projeto:
   - Vá em **Deployments**
   - Clique nos 3 pontos `...` do último deploy
   - Clique em **Redeploy**

3. **Teste** criando uma conta!

---

## ❌ Erros Comuns

### "500 Internal Server Error" ao criar conta
- **Causa**: `JWT_SECRET` não está configurada
- **Solução**: Adicione a variável conforme acima e redeploy

### "KV write error" / "KV read error"
- **Causa**: `REDIS_URL` não está configurada
- **Solução**: Conecte o Vercel KV database ao projeto

---

## 🔒 Segurança

- ⚠️ **NUNCA** compartilhe seu `JWT_SECRET`
- ⚠️ **NUNCA** commite o `.env.local` no git
- ✅ Use uma chave diferente para cada ambiente (dev/prod)
- ✅ Gere uma chave longa e aleatória (mínimo 32 caracteres)

