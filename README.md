# Portal Corporativo Oliveira & Camilo

Intranet interna do escritório: painéis por setor, avisos, metas, cursos/oficinas (EAD), calculadoras, chat, sinalizações de colaboradores, reporte de erros e administração completa.

Aplicação client-side em HTML/CSS/JavaScript puro (sem build, sem framework) que roda direto no navegador, com [Supabase](https://supabase.com) como backend (auth, banco, Storage, Realtime e a Edge Function de análise de erros por IA). Login, funcionários, avisos, audiências, metas, cursos/aulas/materiais, aniversariantes, parabéns, notificações, sinalizações, links, ferramentas, classificações e permissões por setor gravam direto nas tabelas do Supabase — sem `supabase-config.js` preenchido, o portal ainda funciona com dados de exemplo locais (útil para prototipagem), só não persiste nada. Detalhes do mapeamento tela→tabela em [docs/GUIA_MIGRACAO_FRONTEND.md](docs/GUIA_MIGRACAO_FRONTEND.md).

**Passos manuais que ainda faltam no painel do Supabase** (não dá para automatizar via chave anon):
- Criar o bucket **Storage → New bucket → `cursos`** (público) para upload de vídeos/PDFs/fotos dos cursos.
- Criar o bucket **Storage → New bucket → `avatares`** (público) para a foto dos colaboradores.
- Aplicar a migration nova, `supabase/migrations/0010_funcionario_mes_foto.sql` (cole no SQL Editor se o projeto já estava rodando as migrations anteriores).
- Publicar a Edge Function `analisar-erro-ia` (`supabase functions deploy analisar-erro-ia`) e configurar `ANTHROPIC_API_KEY` nos secrets, para a análise automática de erros funcionar (sem isso, "Reportar Erro" continua salvando o relato, só sem a análise por IA).
- Publicar a Edge Function `criar-funcionario` (`supabase functions deploy criar-funcionario`) — sem isso, o cadastro de novos colaboradores em Administração → Funcionários não funciona (ela cria o login e o cadastro numa só chamada; não precisa de secret extra, só das variáveis padrão do projeto).

## Como rodar localmente

Não há build nem `npm install` — é HTML/JS estático. Só não abra o `index.html` direto como arquivo (`file://`), porque os módulos JS e o Supabase não funcionam bem nesse modo; sirva a pasta com um servidor local simples:

```bash
npx serve .
# ou
python -m http.server 8080
```

Depois abra o endereço indicado no navegador (ex.: http://localhost:8080).

## Configurar o Supabase

1. Copie `supabase-config.example.js` para um novo arquivo `supabase-config.js` (mesma pasta do `index.html` — esse arquivo é ignorado pelo Git, cada ambiente mantém o seu).
2. No painel do projeto Supabase, vá em **Project Settings → API** e copie a **Project URL** e a chave **anon public**.
3. Cole os dois valores em `supabase-config.js`.
4. Se o projeto Supabase ainda não tiver as tabelas, aplique o schema em `supabase/migrations/` (veja `supabase/README.md`).

Sem esse arquivo configurado, o portal funciona normalmente com dados de exemplo locais — só não fica salvando nada de verdade.

## Estrutura do projeto

```
index.html                    ponto de entrada, monta o layout e carrega os módulos JS em ordem
css/styles.css                todo o estilo visual do portal
assets/                       logo e foto de equipe usadas no dashboard
js/
  icons.js                    mapeamento de ícones (Font Awesome)
  data.js                     dados de exemplo (módulos, funcionários, cursos, calculadora, etc.)
  state.js                    estado global da aplicação (em memória)
  supabase-client.js          conexão com o Supabase + captura de diagnóstico para o "Reportar Erro"
  data-sync.js                carrega cada tabela do Supabase para state.* após o login
  access-control.js           regras de permissão por setor/cargo
  cursos-helpers.js           progresso de cursos, formatação de aulas
  aniversarios.js             aniversariantes do mês e envio de parabéns
  auth.js                     tela de login, recuperação de acesso por código
  render-layout.js            sidebar, header, hero, avisos, aniversariantes, links, modal
  admin.js                    painel de administração (todas as abas)
  toast.js                    notificações rápidas (toast)
  calculadora.js              calculadoras financeiras (passivo, aditivo, assessoria)
  chat.js                     chat interno (Supabase Realtime)
  sinalizacoes.js              sinalizações de colaboradores
  reportar-erro.js            reporte de bugs + integração com análise por IA
  metas-dashboard.js          painel de acompanhamento de metas
  router.js                   roteamento de telas e montagem geral (renderAll)
  bootstrap.js                restaura sessão do Supabase ao recarregar a página
supabase/                     schema SQL (migrations), RLS, seed e Edge Function do backend
docs/                         arquitetura do backend e guia de migração do front-end
```

## Backend Supabase

O projeto Supabase completo (schema, RLS, funções auxiliares, triggers, Realtime e a Edge Function de análise de erros por IA) está em [`supabase/`](supabase/README.md). Ele já foi validado localmente contra um Postgres real, incluindo testes de RLS por setor — veja detalhes em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).

## Documentos internos relacionados (fora do Git)

A pasta do projeto também tem dois documentos do Word que não entram no repositório:
- `Logins e senhas Oliveira e Camilo intranet.docx` — credenciais, nunca deve ser versionado.
- `O que falta mudar na intranet-Oliveira&Camilo.docx` — lista de pendências (botões funcionais, permissões por carteira, upload de cursos, notificação de aniversário, abas de procedimentos/chat/sinalizações/relato de erro), ainda não implementadas neste repositório.
