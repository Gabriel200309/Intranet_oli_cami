# Guia de migração do front-end (protótipo → Supabase)

Este guia mapeia cada parte de `state` do protótipo (`Prototipo_intranet_oli_cami.html`) para a tabela/consulta Supabase equivalente. Ele **não substitui** reescrever o front-end — é o roteiro para fazer isso, tela por tela, sem perder nenhuma regra de negócio já construída.

## Configuração inicial

```bash
npm install @supabase/supabase-js
```

```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://SEU-PROJETO.supabase.co',
  'SUA_ANON_KEY_PUBLICA' // esta chave é pública por design; a segurança vem do RLS
);
```

## Login

```js
// Login normal (com senha, se você optar por manter Authentication > Email/Password habilitado)
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// "Esqueci minha senha" / login sem senha:
await supabase.auth.signInWithOtp({ email });
// ...tela pedindo o código...
const { data, error } = await supabase.auth.verifyOtp({ email, token: codigo, type: 'email' });
```

Depois do login, busque o funcionário correspondente:

```js
const { data: meuFuncionario } = await supabase
  .from('funcionarios')
  .select('*')
  .eq('id', (await supabase.auth.getUser()).data.user.id)
  .single();
```

`meuFuncionario.nivel === 'Administrador'` já é a checagem de admin — mas repare que agora **não precisa mais confiar nisso no front-end**: mesmo que alguém force `isAdmin()` a retornar `true` no navegador, toda tentativa de escrita nas tabelas administrativas será rejeitada pelo Postgres.

## Mapeamento state → tabela

| `state.*` no protótipo | Tabela(s) no Supabase | Observação |
|---|---|---|
| `state.employees` | `funcionarios` | RLS já filtra automaticamente por setor/permissão |
| `state.permissoesSetor` | `permissoes_setor` | só admin lê/escreve (RLS) |
| `state.gestoresSetor` | `gestores_setor` | idem |
| `state.modules` | `modulos` | `select * from modulos` já vem filtrado pelo que o usuário pode ver |
| `state.classificacoes` | `classificacoes_sinalizacao` | |
| `state.sinalizacoes` | `sinalizacoes` | |
| `state.carteiras` | `carteiras` | |
| `state.metas` | `metas` | `select * from metas` já aplica `fn_pode_ver_meta` |
| `state.cursos` | `cursos` + `aulas` + `materiais_extras` | use `select *, aulas(*), materiais_extras(*) from cursos` |
| `state.progressoCursos` | `aula_conclusoes` + `progresso_cursos` | progresso é recalculado por trigger — só faça insert/delete em `aula_conclusoes` |
| `state.chatConversas` | `chat_conversas` + `chat_membros` + `chat_mensagens` | |
| `state.aniversariantes` | `aniversariantes` | |
| `state.parabens` | `parabens` | a notificação é criada automaticamente por trigger |
| `state.notificacoes` | `notificacoes` | assine com Realtime (ver abaixo) |
| `state.avisos`, `state.audiencias`, `state.funcionarioMes`, `state.links`, `state.tools` | tabelas de mesmo nome (em português) | |
| `state.bugReports` | `bug_reports` — **não insira direto**, chame a Edge Function | ver abaixo |
| Diagnóstico da IA | `analises_ia` — só admin consegue ler | |

## Exemplo: enviar parabéns (equivalente a `enviarParabens()`)

```js
const { error } = await supabase.from('parabens').insert({
  aniversariante_id: idDoAniversariante,
  remetente_id: meuFuncionario.id,
});
if (error?.code === '23505') {
  // unique_violation -> já enviou parabéns para essa pessoa antes
}
```

A notificação para o aniversariante é criada automaticamente pelo trigger `trg_parabens_notifica` — não precisa inserir em `notificacoes` manualmente.

## Exemplo: marcar aula concluída (equivalente a `toggleAulaConcluida()`)

```js
// marcar concluída
await supabase.from('aula_conclusoes').insert({ funcionario_id: meuFuncionario.id, aula_id });
// desmarcar
await supabase.from('aula_conclusoes').delete().eq('funcionario_id', meuFuncionario.id).eq('aula_id', aula_id);
// o progresso em progresso_cursos é recalculado sozinho pelo trigger
```

## Exemplo: reportar erro (equivalente a `submitBugReport()` + `enviarRelatoParaIA()`)

Não insira direto em `bug_reports` pelo cliente para o fluxo de análise — chame a Edge Function, que grava o relato E aciona a IA numa única chamada:

```js
const { data: sessao } = await supabase.auth.getSession();
const resp = await fetch(`https://SEU-PROJETO.supabase.co/functions/v1/analisar-erro-ia`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sessao.session.access_token}`,
  },
  body: JSON.stringify({
    nomeUsuario, setor, sistemaModulo, titulo, descricao,
    dataHora: new Date().toISOString(),
    urlPagina: window.location.href,
    consoleLogs, jsErrors, stackTrace, anexos,
  }),
});
const { relatoId, status, resumo } = await resp.json();
```

## Exemplo: Central de Manutenção IA (admin) com Realtime

```js
// histórico completo (só funciona se eu for admin — RLS decide, não o front)
const { data: analises } = await supabase
  .from('analises_ia')
  .select('*, bug_reports(*)')
  .order('criado_em', { ascending: false });
```

## Exemplo: assinar notificações em tempo real

```js
supabase
  .channel('minhas-notificacoes')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notificacoes', filter: `destinatario_id=eq.${meuFuncionario.id}` },
    (payload) => mostrarNotificacaoNaHora(payload.new)
  )
  .subscribe();
```

## O que fica mais simples (e o que exige mais trabalho)

**Mais simples:** toda a lógica de "quem pode ver o quê" (setor, gestor, admin) sai do JavaScript e vira `select * from tabela` simples — o banco já devolve só o que a pessoa pode ver. Nenhuma tela precisa mais chamar `hasPermission()`/`moduleAccessCheck()` manualmente antes de decidir o que mostrar.

**Exige mais trabalho:** o protótipo atual gera todo o HTML via `innerHTML` a partir de `state`. Migrar para Supabase significa trocar "ler de `state`" por "ler do resultado de uma query" em cada uma das ~40 funções `render*`. Recomendo migrar módulo por módulo (comece por Funcionários e Metas, que são os mais simples), mantendo o restante do protótipo funcionando com os dados antigos até terminar.
