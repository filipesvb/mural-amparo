# Deploy do Mural Amparo no Vercel

Guia passo-a-passo para colocar o app público. Tempo estimado: **20-30 minutos**.

---

## 1. Preparar o Supabase

### 1.1 Executar migrações de schema

O banco ainda não tem as tabelas e RLS das features. No painel Supabase:

1. **SQL Editor** (no menu à esquerda)
2. **Cria uma nova query** e roda **cada um desses arquivos na ordem**:
   - `notas/creating_categories_schema.sql`
   - `notas/creating_post_images_schema.sql`
   - `notas/creating_reactions_schema.sql`
   - `notas/creating_nested_comments_schema.sql`
   - `notas/creating_follows_schema.sql`
   - `notas/creating_bookmarks_schema.sql`
   - `notas/creating_admin_roles_schema.sql`
   - `notas/creating_push_subscriptions_schema.sql`

   (Quer checar status? Query: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`)

### 1.2 Configurar autenticação por e-mail

1. **Authentication** → **Providers**
2. Confirma que **Email** está **Enabled**
3. **SMTP Configuration** — preenche os dados de SMTP caso seja diferente do padrão

---

## 2. Preparar as variáveis de ambiente

### 2.1 No Vercel (onde vão as secrets)

Você vai copiar as chaves aqui depois. Por enquanto, anote-as:

```
NEXT_PUBLIC_SUPABASE_URL=<do .env.local>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<do .env.local>
SUPABASE_SERVICE_ROLE_KEY=<copiar do painel Supabase → Settings → API>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<resultado de: npx web-push generate-vapid-keys>
VAPID_PRIVATE_KEY=<resultado de: npx web-push generate-vapid-keys>
VAPID_SUBJECT=mailto:seu-email@aqui.com
PUSH_WEBHOOK_SECRET=<resultado de: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

### 2.2 Atualizar `.env.local` com as novas chaves (pra testar em dev antes)

```bash
# Se ainda não tem, gera as chaves VAPID (uma única vez — salva!)
npx web-push generate-vapid-keys

# Gera um segredo aleatório
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia pro `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service role, não public anon key)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BC...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:seu-email@aqui.com
PUSH_WEBHOOK_SECRET=abc123def456...
```

---

## 3. Criar conta no Vercel e fazer deploy

### 3.1 Setup inicial

1. Acesse **[vercel.com](https://vercel.com)** → **Sign up**
2. Escolha **GitHub** como provider (sincroniza com seu repo automaticamente)
3. Autoriza Vercel a acessar repositórios

### 3.2 Importar projeto

1. **New Project** → Busca `mural-amparo`
2. Clica em **Import**
3. A próxima tela pede as **Environment Variables**:

   Copia **todas as variáveis** que anotou acima e cola aqui.

4. Clica **Deploy** — Vercel builda e faz o deploy

   Isso leva ~2-3 minutos. Quando terminar, aparece a URL pública (algo como `https://mural-amparo-xyz.vercel.app`)

### 3.3 Testar rápido

- Abre a URL pública
- Faz login / cadastro
- Posta algo — verifica se salva
- Tira um screenshot (prova de vida!)

---

## 4. Configurar o Webhook de Push (só funciona com HTTPS pública)

Agora que o app está público em HTTPS, configura o webhook no Supabase:

1. **Supabase Dashboard** → **Database** → **Webhooks**
2. **Create webhook**:
   - **Table:** `notifications`
   - **Events:** Insert (marca apenas este)
   - **Type:** HTTP Request
   - **Method:** POST
   - **URL:** `https://seu-dominio.vercel.app/api/push` (coloca sua URL do Vercel)
   - **HTTP Header:** Adiciona um
     - **Key:** `x-webhook-secret`
     - **Value:** `abc123def456...` (o `PUSH_WEBHOOK_SECRET` que você criou)
3. **Save webhook**

   Pronto — quando alguém curte/comenta/menciona, o webhook dispara e tenta fazer POST pro seu app.

---

## 5. Pós-deploy: testes e monitoring

### 5.1 Testar notificações em tempo real

1. Abre o Mural em **duas abas** (ou dois navegadores)
2. **Aba 1:** Login como `usuario1@test.com`
3. **Aba 2:** Login como `usuario2@test.com`
4. **Aba 1:** Curte um post da `usuario2`
5. **Aba 2:** Verifica se o sino mostra unread (deve atualizar em tempo real)
6. **Aba 2:** Abre o sino → clica em "Ativar notificações" → permite
7. **Aba 1:** Curte outro post da `usuario2`
8. **Aba 2:** Deve aparecer uma **notificação push** no canto da tela (a browser notification)

### 5.2 Monitorar erros em produção

- **Vercel Dashboard** → seu projeto → **Monitoring** → **Logs**
  - Mostra função por função e erros em tempo real

- **Supabase Dashboard** → **Logs** → **Database** ou **Edge Functions**
  - Mostra queries lentas, erros SQL, execução das triggers

### 5.3 Escalabilidade inicialmente

A tier gratuita do Vercel e Supabase aguenta tranquilo 10–100 pessoas testando. Quando começar a crescer:

- **Vercel Pro** (~$20/mês) — melhor performance, +2 deploy/minuto
- **Supabase Pro** (~$25/mês) — +500MB storage, +10 realtime connections (é a conexão do WebSocket do seu browser)

---

## Troubleshooting

### Push notifications não disparam
- Verifica se o webhook está **Enabled** (toggle verde)
- Verifica o header `x-webhook-secret` — se diferente do env var, falha silenciosamente
- **Supabase → Webhooks** → clica no webhook → **Logs** (mostra os requests que foram feitos)

### Build falha no Vercel
- Verifica os **Logs** na aba **Deployments**
- Geralmente é falta de env var ou versão de Node incompatível
- Se pedir Node upgrading: **Project Settings** → **Node.js Version** → escolhe 18+

### Realtime de notificações não funciona (sino não atualiza)
- Verifica se `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estão corretos
- Abre **DevTools** → **Console** → busca por erros da Supabase
- Supabase Realtime precisa da **publication** ativa: `SELECT * FROM pg_publication` no SQL Editor

---

## Próximos passos (depois do MVP)

- [ ] Domínio customizado (ex: `mural.amparo.com.br`) — Vercel permite adicionar no painel
- [ ] Email customizado (ex: `no-reply@amparo.com.br`) — configurar SMTP no Supabase
- [ ] Backup automático do Supabase — Settings → Backups
- [ ] Observabilidade avançada — integrar Sentry / LogRocket se crescer muito
- [ ] Analytics — Vercel Web Analytics ou Plausible

---

**Pronto para colocar no ar?** Roda os passos acima e volta aqui com a URL pública! 🚀
