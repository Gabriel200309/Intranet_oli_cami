-- ============================================================================
-- 0023_atendimento_equipe.sql
-- Registro de Atendimentos (atendimentos_chat) ganha um vínculo PRÓPRIO com
-- a equipe, escolhido no momento do cadastro — até aqui a equipe só era
-- deduzida indiretamente a partir da equipe ATUAL do colaborador
-- (funcionarios.equipe_id), então não dava para escolher/registrar a
-- equipe junto do colaborador na tela de cadastro, e um atendimento antigo
-- "mudava" de equipe silenciosamente se o colaborador trocasse de equipe
-- depois.
--
-- Mesmo padrão já usado para colaborador_nome/setor nesta tabela: um
-- vínculo por id (para relatórios/join) mais uma cópia do nome no momento
-- do cadastro (para nunca depender de o colaborador continuar na mesma
-- equipe depois).
--
-- Migração 100% incremental e não destrutiva:
--   - nenhuma tabela/coluna existente é alterada, renomeada ou removida;
--   - as 2 colunas novas são opcionais (NULL por padrão), então todo
--     atendimento já cadastrado continua funcionando normalmente — quando
--     equipe_id é nulo, o front-end continua caindo de volta para a equipe
--     ATUAL do colaborador (comportamento anterior), preservado como
--     fallback.
-- ============================================================================

alter table atendimentos_chat add column if not exists equipe_id uuid references equipes(id) on delete set null;
alter table atendimentos_chat add column if not exists equipe_nome text;
comment on column atendimentos_chat.equipe_id is 'Equipe escolhida no cadastro do atendimento (junto do colaborador) — ver Administração > Equipes. Nulo em atendimentos registrados antes desta migração: o front-end cai de volta para a equipe ATUAL do colaborador nesse caso (ver equipeIdEfetivaDoAtendimento() em js/eficiencia-dashboard.js).';
comment on column atendimentos_chat.equipe_nome is 'Nome da equipe no momento do cadastro (histórico) — mesmo padrão de colaborador_nome/setor: se a equipe for renomeada ou excluída depois, o atendimento já registrado continua mostrando o nome que tinha.';

create index if not exists idx_atendimentos_chat_equipe_id on atendimentos_chat(equipe_id);

select '✅ Migração 0023 concluída com sucesso.' as status;
