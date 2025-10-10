# 🔄 Como Testar Sincronização Entre Dispositivos

## ⚠️ Importante: Como Funciona Agora

O app usa um `deviceId` único por dispositivo (salvo no localStorage). Isso significa que **cada dispositivo tem seus próprios dados separados**.

Para sincronizar **entre dispositivos**, você precisa usar o **mesmo deviceId** em ambos.

## 🧪 Teste 1: Mesmo Dispositivo (Recarregar Página)

1. Abra o app
2. Adicione uma matéria ou tópico
3. Abra o Console do navegador (F12)
4. Veja os logs:
   - 🔄 Salvando no KV: user:dev_xxxxx
   - ✅ Salvo no KV com sucesso
5. Recarregue a página (F5)
6. Veja os logs:
   - 🔄 Carregando do KV: user:dev_xxxxx
   - ✅ Dados carregados do KV: encontrado
7. **Se os dados aparecerem = KV está funcionando! ✅**

## 🔄 Teste 2: Entre Dispositivos Diferentes

### Opção A: Copiar deviceId Manualmente

**No Dispositivo 1 (ex: PC):**
1. Abra o Console (F12)
2. Digite: `localStorage.getItem('deviceId')`
3. Copie o valor (ex: `dev_abc123xyz`)

**No Dispositivo 2 (ex: Celular):**
1. Abra o app
2. Abra o Console mobile ou use ferramentas remotas
3. Digite: `localStorage.setItem('deviceId', 'dev_abc123xyz')` (use o ID do dispositivo 1)
4. Recarregue a página

**Resultado:** Ambos dispositivos agora compartilham os mesmos dados!

### Opção B: Adicionar Login Simples (Recomendado)

Para sincronizar automaticamente entre dispositivos, podemos adicionar:
- Login com email/senha simples
- Ou "magic link" por email
- Usa o email como chave no KV

Quer que eu implemente isso? Seria muito mais prático!

## 📊 Ver Dados no Vercel KV

1. Acesse seu projeto no Vercel
2. Vá em **Storage** → seu KV database
3. Clique em **Data Browser**
4. Procure por `user:dev_xxxxx`
5. Você verá todos os dados salvos!

## 🐛 Se Aparecer "Offline"

Abra o Console (F12) e procure por erros:
- ❌ Erro ao salvar no KV
- ❌ Erro ao carregar do KV

Me mande o erro que eu resolvo!

