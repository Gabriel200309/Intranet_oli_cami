# Portal Oliveira & Camilo — Projeto Supabase

Estrutura completa (schema SQL + RLS + Edge Function) para lançar o portal no Supabase. Todo o SQL abaixo foi **testado de verdade** contra um Postgres real (incluindo simulação de usuários autenticados de diferentes setores) antes de ser entregue — não é só sintaxe, o comportamento de segurança foi verificado na prática.

## Estrutura do projeto

```
supabase-project/
├── supabase/
│   ├── config.toml                          # configuração do CLI do Supabase
│   ├── migrations/                          # rodar em ordem (supabase db push)
│   │   ├── 0001_extensions_types.sql         # extensões + tipos enumerados
│   │   ├── 0002_schema_core.sql              # funcionários, permissões, gestores, módulos, sinalizações
│   │   ├── 0003_schema_metas_cursos.sql      # metas, carteiras, cursos/aulas/materiais/progresso
│   │   ├── 0004_schema_chat_notificacoes.sql # chat, aniversariantes, parabéns, notificações
│   │   ├── 0005_schema_avisos_manutencao.sql # avisos, audiências, links, ferramentas, relatos+IA
│   │   ├── 0006_helper_functions.sql         # funções de permissão (equivalentes ao JS antigo)
│   │   ├── 0007_rls_policies.sql             # Row Level Security de TODAS as tabelas
│   │   ├── 0008_triggers.sql                 # progresso automático de cursos + notificação de parabéns
│   │   ├── 0009_realtime.sql                 # habilita Realtime em notificações e chat
│   │   └── 0010_funcionario_mes_foto.sql     # foto do funcionário do mês
│   ├── seed.sql                              # dados de configuração/exemplo
│   └── functions/
│       ├── analisar-erro-ia/
│       │   ├── index.ts                      # Edge Function: chama o Claude, nunca do navegador
│       │   └── .env.example
│       └── criar-funcionario/
│           └── index.ts                      # Edge Function: cria login + cadastro de um novo colaborador
└── docs/
    ├── ARQUITETURA.md                        # visão geral e por que isso resolve as falhas do protótipo
    └── GUIA_MIGRACAO_FRONTEND.md             # mapeamento state.* → tabela, com exemplos de código
```

## Passo a passo para lançar

```bash
# 1. Instale o CLI do Supabase (se ainda não tiver)
npm install -g supabase

# 2. Crie o projeto em https://supabase.com/dashboard e pegue o project-ref

# 3. Dentro desta pasta:
supabase login
supabase link --project-ref SEU_PROJECT_REF

# 4. Aplique todo o schema (as migrations, em ordem)
supabase db push

# 5. Rode os dados iniciais (permissões padrão, módulos, classificações etc.)
#    Opção A: cole o conteúdo de supabase/seed.sql no SQL Editor do painel
#    Opção B, ambiente local: supabase db reset (roda migrations + seed automaticamente)

# 6. Configure a chave da Anthropic (nunca no front-end)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-SUACHAVE

# 7. Publique as Edge Functions
supabase functions deploy analisar-erro-ia
supabase functions deploy criar-funcionario

# 7b. Crie os buckets de Storage no painel: "cursos" e "avatares" (públicos)

# 8. Crie o primeiro usuário administrador (Authentication > Users no painel, ou API admin)
#    e complete o cadastro de cada um na tabela `funcionarios` (ver seed.sql,
#    seção comentada no final, e docs/ARQUITETURA.md)
```

## O que foi validado localmente antes da entrega

- Todas as 9 migrations + o seed rodam sem erro do início ao fim, em ordem, num Postgres limpo.
- Criei funcionários de teste em setores diferentes (Acordos, Jurídico, RH, Administrador) e, conectando como cada um (sem bypass de RLS, como o Supabase faz de verdade), confirmei:
  - Cada um só vê as metas que deveria (próprio setor, gestor, ou geral).
  - Um colaborador comum **não consegue se autopromover a administrador** mesmo tentando dar `UPDATE` na própria linha — a política de RLS bloqueia (0 linhas afetadas).
  - Só o administrador consegue ler `analises_ia` (diagnóstico técnico completo) — qualquer outro usuário recebe 0 linhas, mesmo sendo o autor do relato.
  - Um colaborador só vê os módulos do próprio setor (ex.: Acordos não vê o módulo do RH).
  - Grupos de chat só aparecem para quem é membro.
  - O trigger de parabéns cria a notificação automaticamente, e o banco recusa (por `unique constraint`) o mesmo remetente enviar parabéns duas vezes para a mesma pessoa.
- Encontrei e corrigi, durante esse teste, uma recursão infinita real numa política de RLS do chat (uma política que consultava a própria tabela que protegia) — corrigida com uma função auxiliar `security definer`, padrão recomendado pelo próprio Supabase para esse tipo de caso.

## Limitações que continuam existindo (e são normais)

- O front-end atual (`Prototipo_intranet_oli_cami.html`) ainda não fala com o Supabase — ele precisa ser adaptado tela por tela para usar `supabase-js` em vez de `state` local. O guia de migração cobre isso com exemplos práticos.
- Upload de vídeos/PDFs dos cursos e anexos de relatos de erro devem passar a usar o Supabase Storage (buckets) em vez de base64 na memória do navegador — os buckets recomendados estão documentados em `docs/ARQUITETURA.md`.
