-- ============================================================================
-- 0017_atendimentos_chat.sql
-- Registro manual de atendimentos (início do contato + primeira resposta),
-- pedido explicitamente para dar dado real aos indicadores "Tempo de
-- primeira resposta" e "Chats em Aguardando" do Painel de Eficiência,
-- Qualidade e Alertas — que antes mostravam "Sem dados suficientes" porque
-- não existia nenhum registro desse tipo no sistema (o chat interno é
-- mensagem direta entre colegas, sem status de fila).
--
-- Migração 100% incremental e não destrutiva: cria só uma tabela nova e um
-- tipo novo; nenhuma tabela/coluna existente é alterada.
-- ============================================================================

create type atendimento_status as enum ('aguardando', 'respondido', 'finalizado');

create table atendimentos_chat (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid references funcionarios(id) on delete set null,
  colaborador_nome text,
  setor text references setores(nome) on update cascade on delete restrict,
  cliente text,                          -- opcional, texto livre (quem foi atendido)
  status atendimento_status not null default 'aguardando',
  iniciado_em timestamptz not null default now(),   -- início do atendimento/chat
  primeira_resposta_em timestamptz,                  -- quando a primeira resposta foi dada
  finalizado_em timestamptz,
  registrado_por uuid references funcionarios(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index idx_atendimentos_chat_status on atendimentos_chat(status);
create index idx_atendimentos_chat_colaborador on atendimentos_chat(colaborador_id);
create index idx_atendimentos_chat_setor on atendimentos_chat(setor);

-- Mantém o status coerente automaticamente (mesmo padrão do trigger de
-- sinalizacoes.resolvido_em em 0016): registrar a primeira resposta tira o
-- atendimento de "aguardando"; registrar o fim marca "finalizado".
create or replace function trg_atendimento_chat_status_auto()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.primeira_resposta_em is not null and old.primeira_resposta_em is null and new.status = 'aguardando' then
    new.status := 'respondido';
  end if;
  if new.finalizado_em is not null and old.finalizado_em is null then
    new.status := 'finalizado';
  end if;
  return new;
end;
$$;

create trigger trg_atendimentos_chat_status_auto
before update on atendimentos_chat
for each row execute function trg_atendimento_chat_status_auto();

-- ---------------------------------------------------------------------------
-- RLS — mesmo modelo de acesso das demais tabelas do painel (0016): quem vê
-- é administrador, gestor do setor, quem tem a permissão "ver sinalizações
-- de todas", quem registrou, ou o próprio colaborador do atendimento.
-- Registrar/editar é exclusivo de administradores, mesma regra já aplicada
-- a avaliacoes_qualidade e atendimentos_referencia.
-- ---------------------------------------------------------------------------
alter table atendimentos_chat enable row level security;

create policy atendimentos_chat_select on atendimentos_chat for select
  using (
    fn_is_admin()
    or fn_permissao_setor(fn_meu_setor(), 'ver_sinalizacoes_todas')
    or fn_is_gestor(setor)
    or registrado_por = auth.uid()
    or colaborador_id = auth.uid()
  );
create policy atendimentos_chat_insert on atendimentos_chat for insert
  with check (fn_is_admin() and registrado_por = auth.uid());
create policy atendimentos_chat_update on atendimentos_chat for update
  using (fn_is_admin() or registrado_por = auth.uid() or fn_is_gestor(setor))
  with check (fn_is_admin() or registrado_por = auth.uid() or fn_is_gestor(setor));
create policy atendimentos_chat_delete on atendimentos_chat for delete
  using (fn_is_admin() or registrado_por = auth.uid() or fn_is_gestor(setor));

select '✅ Migração 0017 concluída com sucesso.' as status;
