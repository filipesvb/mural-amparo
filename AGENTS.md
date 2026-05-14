<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Estrutura do projeto

- `app/` — App Router (Next.js 16). Server Components por padrão.
- `app/actions.ts` — Server Actions (auth, posts, comments). Ponto único de mutação.
- `app/auth/confirm/route.ts` — callback PKCE de confirmação de e-mail (`exchangeCodeForSession`).
- `utils/supabase/server.ts` — cliente Supabase para Server Components/Actions (`createServerClient` + `next/headers`).
- `utils/supabase/client.ts` — cliente Supabase para Client Components (`createBrowserClient`).
- `utils/types.ts` — tipos compartilhados (Profile, Post, Comment, Like).
- `components/` — Client Components reutilizáveis.
- `proxy.ts` — **substitui `middleware.ts`** nesta versão do Next.js (importado em `next.config.ts`). Refresca a sessão Supabase a cada request. **Não crie `middleware.ts`.**

## Convenções

- **Idioma**: copy de UI, mensagens de erro e comentários em **português (pt-BR)**.
- **Erros em forms**: div inline com classes `bg-red-100 border-2 border-red-800 p-3 text-red-800 text-sm retro-border font-bold`, prefixada com `⚠️`. Sem toasts.
- **Mensagens genéricas em auth**: evite vazar se o e-mail existe ("E-mail ou senha incorretos" em vez de "Usuário não existe").
- **Estilo retro**: classes `retro-border` e token `mural-panel` (cor `#eee8de`) compõem o visual.
- **Imagens**: use `next/image` (substituição recente de `<img>` por `<Image>`).
- **Proteção de rotas**: feita página a página (`if (!user) redirect("/login")`), não via middleware global.
