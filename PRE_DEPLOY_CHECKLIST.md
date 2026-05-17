# Pré-Deploy Checklist

Rode isto **antes de fazer o deploy no Vercel**:

## Code

- [ ] `npm run build` passa sem erros
- [ ] `npm run lint` passa sem warnings/errors
- [ ] Testou login/signup
- [ ] Testou postar + editar + deletar
- [ ] Testou curte/reações/comentários
- [ ] Testou filtros de categoria e "Seguindo"
- [ ] Testou mencionar alguém com @
- [ ] Testou seguir usuário
- [ ] Testou salvos (bookmarks) — botão 🔖 funciona
- [ ] Testou perfil público de outro usuário
- [ ] Nenhum `console.error()` na aba Console do DevTools

## Database (Supabase)

Rode estas migrations **no SQL Editor** do Supabase (nesta ordem):

```sql
-- 1. Categorias
<conteúdo de notas/creating_categories_schema.sql>

-- 2. Upload de imagens
<conteúdo de notas/creating_post_images_schema.sql>

-- 3. Reações (❤️ 😂 😢 🙏 👍)
<conteúdo de notas/creating_reactions_schema.sql>

-- 4. Comentários aninhados
<conteúdo de notas/creating_nested_comments_schema.sql>

-- 5. Seguir usuários
<conteúdo de notas/creating_follows_schema.sql>

-- 6. Bookmarks (salvos)
<conteúdo de notas/creating_bookmarks_schema.sql>

-- 7. Admin/moderador
<conteúdo de notas/creating_admin_roles_schema.sql>

-- 8. Push subscriptions (PWA)
<conteúdo de notas/creating_push_subscriptions_schema.sql>
```

Depois verifica: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'` — deve ter ~10 tabelas.

## Environment Variables (Vercel)

Anota estas 7 variáveis — você vai copiar pro Vercel no passo 3 de DEPLOY.md:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` — copiar do `.env.local`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — copiar do `.env.local`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — **Service Role Key** do painel Supabase (Settings → API)
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — resultado de `npx web-push generate-vapid-keys`
- [ ] `VAPID_PRIVATE_KEY` — resultado de `npx web-push generate-vapid-keys`
- [ ] `VAPID_SUBJECT` — ex: `mailto:seu-email@aqui.com`
- [ ] `PUSH_WEBHOOK_SECRET` — resultado de `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Repo & Git

- [ ] Commit com todas as mudanças (bookmarks + PWA) está feito — `git log` mostra o commit
- [ ] `.env.local` **NÃO** está em git — verifica `.gitignore`
- [ ] Todos os `notas/*.sql` estão no repo — `git ls-files | grep notas/`

## Pronto?

Se tudo acima está OK, siga [DEPLOY.md](DEPLOY.md) passo-a-passo.
