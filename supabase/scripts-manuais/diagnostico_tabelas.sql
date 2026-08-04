-- Cole isto no SQL Editor e rode: mostra quais tabelas de cada migração
-- já existem no seu projeto, para você saber exatamente onde parou.

select
  t.migracao,
  t.tabela,
  case when et.table_name is not null then '✅ existe' else '❌ FALTANDO' end as status
from (values
  ('0002', 'funcionarios'), ('0002', 'permissoes_setor'), ('0002', 'gestores_setor'),
  ('0002', 'modulos'), ('0002', 'classificacoes_sinalizacao'), ('0002', 'sinalizacoes'),
  ('0003', 'carteiras'), ('0003', 'metas'), ('0003', 'cursos'), ('0003', 'aulas'),
  ('0003', 'materiais_extras'), ('0003', 'aula_conclusoes'), ('0003', 'progresso_cursos'),
  ('0004', 'chat_conversas'), ('0004', 'chat_membros'), ('0004', 'chat_mensagens'),
  ('0004', 'aniversariantes'), ('0004', 'parabens'), ('0004', 'notificacoes'),
  ('0005', 'avisos'), ('0005', 'audiencias'), ('0005', 'funcionario_mes'),
  ('0005', 'links_uteis'), ('0005', 'ferramentas'), ('0005', 'bug_reports'), ('0005', 'analises_ia')
) as t(migracao, tabela)
left join information_schema.tables et
  on et.table_schema = 'public' and et.table_name = t.tabela
order by t.migracao, t.tabela;
