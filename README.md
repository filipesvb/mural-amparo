# Mural Amparo

O mural comunitário de **Amparo-SP**: avisos, achados, eventos, serviços e a vida do bairro num lugar só.

App em produção: **[www.mural-amparo.com.br](https://www.mural-amparo.com.br)**

---

## Sobre

O Mural Amparo é um feed comunitário para moradores de Amparo publicarem recados,
acompanharem a agenda da cidade e trocarem informações do dia a dia. É um PWA
instalável, com notificações push, moderação por staff e visual retrô próprio.

### Principais funcionalidades

- **Feed de recados** com categorias, galeria de imagens e reações (❤️ 😂 😢 🙏 👍)
- **Comentários aninhados** e menções com `@`
- **Seguir moradores** e filtrar o feed por "Seguindo"
- **Salvos (bookmarks)** para guardar recados
- **Agenda da cidade** — morador sugere um evento, staff aprova
- **Notificações** em tempo real (sino) + **web push** (PWA)
- **Perfis públicos** com avatar (upload ou seed), bio e onboarding
- **Moderação** — denúncias, bloqueio de usuários, papéis admin/moderador,
  fila de revisão e moderação de imagens
- **Busca** por recados, moradores e hashtags
- **Páginas de apoio** — links úteis (horários de ônibus), configurações,
  privacidade, termos, exportação de dados e exclusão de conta
- **Autenticação por e-mail** (Supabase) com fluxo login/cadastro unificado e PKCE

---

## Stack

| Camada        | Tecnologia                                   |
| ------------- | -------------------------------------------- |
| Framework     | Next.js 16 (App Router, Server Components)   |
| UI            | React 19, Tailwind CSS v4                    |
| Backend / DB  | Supabase (Postgres, Auth, Storage, Realtime) via `@supabase/ssr` |
| Validação     | Zod                                          |
| Push          | `web-push` (VAPID) + Supabase DB Webhooks    |
| Hospedagem    | Vercel + Supabase                            |
| E-mail        | Resend (SMTP do Supabase Auth)               |

---

## Arquitetura

- `app/` — App Router. Server Components por padrão.
- `app/actions.ts` — **ponto único de mutação**: todas as Server Actions
  (auth, posts, comentários, reações, follows, moderação, etc.).
- `app/auth/confirm/route.ts` — callback PKCE de confirmação de e-mail.
- `app/api/push/route.ts` — endpoint chamado pelo Supabase DB Webhook para
  disparar as notificações web push.
- `proxy.ts` — **substitui `middleware.ts`** nesta versão do Next.js
  (importado em `next.config.ts`). Refresca a sessão Supabase a cada request.
- `utils/supabase/server.ts` / `client.ts` — clientes Supabase para
  Server Components/Actions e Client Components.
- `utils/types.ts` — tipos compartilhados.
- `components/` — Client Components reutilizáveis.
- `notas/` — migrações SQL de schema e notas de operação (observabilidade,
  disaster recovery, anti-spam, moderação de imagens).

> **Nota:** esta versão do Next.js tem breaking changes em relação a versões
> anteriores. Consulte os guias em `node_modules/next/dist/docs/` antes de
> alterar convenções ou estrutura de arquivos. Veja também [`AGENTS.md`](AGENTS.md).

### Convenções

- **Idioma**: copy de UI, mensagens de erro e comentários em **português (pt-BR)**.
- **Proteção de rotas**: página a página (`if (!user) redirect("/login")`),
  não via middleware global.
- **Erros em forms**: `div` inline (sem toasts), prefixada com `⚠️`.
- **Mensagens de auth**: genéricas, sem vazar se o e-mail existe.
- **Imagens**: `next/image` (`<Image>`).
- **Visual retrô**: classes `retro-border` e token `mural-panel` (`#eee8de`).

---

## Rodando localmente

### Pré-requisitos

- Node.js 18+
- Um projeto Supabase (gratuito serve)

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
# Supabase (Settings → API)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...          # Service Role Key

# Web push (npx web-push generate-vapid-keys)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BC...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:seu-email@exemplo.com

# Segredo do DB Webhook de push
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
PUSH_WEBHOOK_SECRET=...
```

### 3. Migrações do banco

No **SQL Editor** do Supabase, rode os arquivos de `notas/` **nesta ordem**:

1. `creating_categories_schema.sql`
2. `creating_post_images_schema.sql`
3. `creating_post_gallery_schema.sql`
4. `creating_reactions_schema.sql`
5. `creating_nested_comments_schema.sql`
6. `creating_follows_schema.sql`
7. `creating_bookmarks_schema.sql`
8. `creating_avatar_upload_schema.sql`
9. `creating_admin_roles_schema.sql`
10. `creating_onboarding_schema.sql`
11. `creating_events_schema.sql`
12. `creating_push_subscriptions_schema.sql`
13. `creating_reports_blocks_schema.sql`

As notas `creating_*_schema.md` (notifications, mentions, search) descrevem
schema/triggers adicionais. Para moderação de imagens, veja
`notas/image_moderation_setup.md`.

Verifique: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`.

### 4. Servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Comando         | Descrição                          |
| --------------- | ---------------------------------- |
| `npm run dev`   | Servidor de desenvolvimento        |
| `npm run build` | Build de produção                  |
| `npm run start` | Serve o build de produção          |
| `npm run lint`  | ESLint (`eslint-config-next`)      |

---

## Deploy

O deploy é no **Vercel + Supabase**. Passo a passo completo em
[`DEPLOY.md`](DEPLOY.md); rode o [`PRE_DEPLOY_CHECKLIST.md`](PRE_DEPLOY_CHECKLIST.md)
antes.

Resumo:

1. Rodar as migrações de `notas/` no Supabase.
2. Configurar as env vars no Vercel (as mesmas do `.env.local`).
3. Importar o repo no Vercel e fazer deploy.
4. Criar o DB Webhook `notifications` (Insert) → `/api/push` com o header
   `x-webhook-secret`.
5. Configurar SMTP do Supabase Auth (Resend) e o domínio customizado.

Operação: `notas/observabilidade.md` e `notas/disaster_recovery.md`.

---

## Licença

Projeto privado. Todos os direitos reservados.
