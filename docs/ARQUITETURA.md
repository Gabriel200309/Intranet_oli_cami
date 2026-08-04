# Arquitetura — Portal Oliveira & Camilo no Supabase

## Visão geral

```
Front-end (portal.html ou app novo)
        │  (supabase-js, com a "anon key" pública)
        ▼
Supabase Auth ──── funcionarios (RLS aplica as regras de setor/gestor/admin)
        │
        ▼
Postgres (todas as tabelas, Row Level Security ativado em 100% delas)
        │
        ▼
Edge Function "analisar-erro-ia" ──HTTPS──> api.anthropic.com
   (roda no servidor do Supabase; ANTHROPIC_API_KEY fica só aqui)
```

## Por que isso resolve as limitações do protótipo original

O protótipo (`Prototipo_intranet_oli_cami.html`) era um único arquivo HTML/JS rodando 100% no navegador. Isso significava que:

- **Toda "permissão" era só de fachada** — qualquer pessoa podia abrir o DevTools e alterar `state.userRole` para virar administrador, ou simplesmente ler `state.metas`/`state.employees` (que já vinham completos na memória do navegador, mesmo que a tela escondesse parte deles).
- **Não existia banco de dados real** — tudo era perdido ao recarregar a página.
- **A chave da API do Claude nunca poderia estar no protótipo** — por isso construímos um backend Node à parte.

Com Supabase:

- **Row Level Security (RLS) é aplicado pelo banco, não pelo front-end.** Testei isso de verdade: um usuário do setor de Acordos tentando fazer `UPDATE funcionarios SET nivel = 'Administrador'` na própria linha recebe `UPDATE 0` — a política de RLS bloqueia mesmo sendo o dono da própria linha, porque só admin tem permissão de escrita em `funcionarios`. Isso fecha em definitivo a falha de auto-promoção que existia no protótipo.
- **O banco é real e persistente** (Postgres gerenciado).
- **A Edge Function** é o único lugar que fala com a Anthropic — a `ANTHROPIC_API_KEY` fica em "Project Settings → Edge Functions → Secrets", nunca no navegador.
- **Realtime nativo** para notificações e chat — sem precisar simular "tempo real" numa única aba.
- **Auth nativo** substitui o backend próprio de e-mail/código que tínhamos construído para "esqueci minha senha" (veja abaixo).

## Autenticação: "esqueci minha senha" vira `signInWithOtp`

O sistema nunca teve senhas de verdade (o protótipo aceitava qualquer senha para um e-mail cadastrado). No Supabase, a forma correta e nativa de fazer isso é usar o login por link/código mágico do próprio Supabase Auth, em vez de reconstruir um sistema de código por e-mail do zero:

```js
// 1. Pede o código
await supabase.auth.signInWithOtp({ email });

// 2. Usuário digita o código de 6 dígitos recebido por e-mail
const { data, error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'email' });
// se error for null, o usuário já está autenticado (data.session existe)
```

Isso substitui por completo o backend próprio de "código de acesso" que tínhamos construído (`ia-manutencao-backend/src/auth.js`) — o Supabase já cuida de gerar, expirar e validar o código, e do envio do e-mail (usando o servidor de e-mail padrão do Supabase em desenvolvimento, ou um provedor SMTP customizado em produção, configurável em Authentication → Email Templates / SMTP Settings no painel).

## Como um funcionário existe no sistema

1. Um administrador cria o usuário em **Authentication → Users → Add user** (ou via API `supabase.auth.admin.createUser`), definindo o e-mail.
2. O UUID gerado é usado para criar a linha correspondente em `funcionarios` (nome, setor, cargo, nível etc.) — é esse vínculo (`funcionarios.id = auth.users.id`) que faz toda a segurança de RLS funcionar.
3. Só depois disso a pessoa consegue de fato usar `signInWithOtp` com aquele e-mail.

Automatizar o passo 2 com um trigger (`on auth.users insert`) é possível, mas foi deixado manual de propósito: assim, um cadastro de e-mail nunca cria acesso a um "funcionário fantasma" sem setor/cargo definidos — o administrador sempre completa o cadastro em Administração → Funcionários antes da pessoa poder entrar de verdade em qualquer tela protegida por setor.

## Storage (arquivos)

Crie os buckets abaixo em Storage (podem ser criados pelo painel ou via `supabase storage`):

| Bucket | Público? | Uso |
|---|---|---|
| `cursos` | privado (ou público se os vídeos não forem sensíveis) | vídeos/PDFs/apresentações das aulas e materiais extras |
| `relatos-erro` | privado | prints/vídeos anexados em "Reportar Erro" |
| `avatares` | público | fotos de perfil/palestrantes |

Para buckets privados, adicione políticas de Storage equivalentes (ex.: só o dono do arquivo ou admin pode ler `relatos-erro`).

## Sequência de deploy

```bash
supabase login
supabase link --project-ref <seu-project-ref>
supabase db push                      # aplica as migrations em supabase/migrations/
supabase db seed                       # (ou cole supabase/seed.sql no SQL Editor)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy analisar-erro-ia
```

Veja `docs/GUIA_MIGRACAO_FRONTEND.md` para o mapeamento de cada tela do protótipo para as tabelas/consultas correspondentes.
