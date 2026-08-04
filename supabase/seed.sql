-- ============================================================================
-- supabase/seed.sql
-- Executado automaticamente após as migrations em `supabase db reset`
-- (ambiente local) ou pode ser rodado manualmente no SQL Editor do projeto
-- hospedado. Contém só o que NÃO depende de usuários já existirem no
-- Supabase Auth. Funcionários, gestores e qualquer coisa que referencie um
-- funcionário (metas, cursos, aniversariantes ligados a alguém, etc.)
-- precisam ser cadastrados DEPOIS que as contas de auth existirem — veja o
-- passo a passo em docs/GUIA_MIGRACAO_FRONTEND.md.
-- ============================================================================

-- Permissões padrão por setor (mesmos valores do protótipo original).
insert into permissoes_setor (setor, acesso_acordos, acesso_juridico, acesso_rh, acesso_financeiro, ver_metas_geral, ver_sinalizacoes_todas, ver_funcionarios_todos) values
  ('Acordos',    true,  false, false, false, false, false, false),
  ('Jurídico',   false, true,  false, false, false, false, false),
  ('RH',         false, false, true,  false, false, true,  true),
  ('Financeiro', false, false, false, true,  true,  false, false),
  ('TI',         false, false, false, false, false, false, false),
  ('Diretoria',  true,  true,  true,  true,  true,  true,  true);

-- Classificações padrão de sinalização.
insert into classificacoes_sinalizacao (nome, cor) values
  ('Leve', '#2F9E6E'),
  ('Média', '#B4881F'),
  ('Grave', '#B8483A'),
  ('Crítica', '#7A1E14');

-- Módulos do Acesso Rápido / menu principal.
insert into modulos (nome, descricao, icone, status, acesso_restrito_texto, link, setor, locked, ordem) values
  ('Painel do Setor de Acordos', 'Negociações e acordos em andamento', 'scale', 'Online', 'Negociadores e operadores', '', 'Acordos', false, 1),
  ('Painel do RH', 'Colaboradores, ponto e benefícios', 'users', 'Online', null, '', 'RH', false, 2),
  ('Painel Jurídico', 'Processos, prazos e andamentos', 'gavel', 'Online', null, '', 'Jurídico', false, 3),
  ('Modelos de Peças e Petições', 'Biblioteca de petições e modelos', 'file', 'Online', null, '', null, false, 4),
  ('Cursos e Oficinas', 'Treinamentos e certificações internas', 'grad', '3 novos', null, '', null, false, 5),
  ('Arquivos e Lembranças', 'Documentos e memórias do escritório', 'folder', 'Online', null, '', null, false, 6),
  ('Acessos e Senhas', 'Somente líderes e administradores', 'key', 'Restrito', 'Líderes e administradores', '', null, true, 7),
  ('Ferramentas Tecnológicas Úteis', 'Sistemas e apps do dia a dia', 'wrench', 'Online', null, '', null, false, 8),
  ('Instruções de Trabalho', 'Base de conhecimento e procedimentos', 'book', 'Online', null, '', null, false, 9),
  ('Links dos Tribunais', 'Acesso rápido aos portais judiciais', 'link', 'Online', null, '', null, false, 10),
  ('Provas Sociais', 'Depoimentos e resultados', 'sparkles', 'Online', null, '', null, false, 11),
  ('Atlas', 'Inteligência jurídica', 'layers', 'Online', null, '', null, false, 12),
  ('AdvBox', 'Gestão de processos', 'gavel', 'Online', null, '', null, false, 13),
  ('SOSFY', 'Automação de cobrança', 'wallet', 'Online', null, '', null, false, 14);

-- Carteiras de exemplo.
insert into carteiras (nome) values
  ('Carteira Banco Alfa'),
  ('Carteira Financeira Sul'),
  ('Carteira Varejo XPTO');

-- Avisos, links e ferramentas de exemplo.
insert into avisos (titulo, descricao, prioridade, data_exibicao, fixado) values
  ('Novo protocolo digital', 'A partir de agosto, todos os protocolos devem ser feitos pelo sistema digital.', 'alta', '01/08', true);

insert into links_uteis (nome, url) values
  ('TJ-MG', 'https://www.tjmg.jus.br'),
  ('PJe', 'https://pje.tjmg.jus.br');

insert into ferramentas (nome, descricao, url) values
  ('AdvBox', 'Gestão de processos', 'https://advbox.com.br'),
  ('SOSFY', 'Automação de cobrança', 'https://sosfy.com.br');

-- ----------------------------------------------------------------------------
-- A PARTIR DAQUI, os inserts dependem de funcionários já cadastrados
-- (que por sua vez dependem de usuários já criados no Supabase Auth).
-- Deixe como referência/exemplo — descomente e ajuste os UUIDs depois de
-- criar os usuários reais (veja docs/GUIA_MIGRACAO_FRONTEND.md).
-- ----------------------------------------------------------------------------

-- exemplo:
-- insert into funcionarios (id, nome, numero, setor, cargo, nivel, nascimento, telefone, email) values
--   ('00000000-0000-0000-0000-000000000001', 'Rafael Camilo', '0007', 'Diretoria', 'Sócio-Administrador', 'Administrador', '1982-02-19', '(31) 99999-0007', 'rafael.camilo@oliveiracamilo.com.br');
--
-- insert into gestores_setor (setor, funcionario_id) values
--   ('Jurídico', '00000000-0000-0000-0000-000000000001');
--
-- insert into metas (nome, descricao, valor_meta, valor_atingido, data_inicial, data_final, tipo, setor, responsavel_id, status) values
--   ('Meta Geral — Agosto/2026', 'Meta consolidada do mês', 850000, 0, '2026-08-01', '2026-08-31', 'Geral', null, '00000000-0000-0000-0000-000000000001', 'Em andamento');
