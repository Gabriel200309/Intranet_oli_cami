# Comparativo: Intranet Oliveira & Camilo × Sistema de gestão jurídica/CRM apresentado em 15/09/2026

> Base da análise: código deste repositório na `main`, em 29/09/2026. Tudo o que está aqui foi verificado no código.
> Quando uma informação depende de configuração, de uso real ou de outro sistema, isso está sinalizado.

---

## 1. Resumo executivo

- **A intranet e o sistema apresentado resolvem problemas diferentes.** A intranet é um portal interno de gestão de pessoas e operação: avisos, metas, cursos, chat interno, sinalizações de colaboradores, indicadores de atendimento, controle de computadores e reporte de erros.
- **A intranet não tem cadastro de clientes nem de processos.** Também não tem tarefas, integração com WhatsApp, e-mail, tribunais ou Asaas, nem portal do cliente.
- **Das 27 funcionalidades apresentadas:** a intranet tem 0 completas, 7 parciais, 18 ausentes e 2 que não dá para concluir só pelo código.
- **Parte da gestão de processos parece estar em outra ferramenta.** O próprio código aponta o **AdvBox** como "Gestão de processos" e o **SOSFY** como "Automação de cobrança". Eles aparecem como atalhos, sem integração.
- **As dores relatadas não vêm de um defeito da intranet.** Elas vêm do fato de ela não guardar dados de clientes e processos. Construir isso dentro dela seria um projeto grande: cadastro de clientes e processos, integração com tribunais e WhatsApp, portal do cliente e relatórios.
- **Recomendação preliminar: complementar.** Adotar um sistema jurídico/CRM para clientes, processos, tarefas e portal do cliente. Manter a intranet para o que só ela faz (seção 4), ligando as duas por links e, depois, por integração.
- **Migrar tudo significaria perder** os indicadores de eficiência e qualidade, os cursos internos, o controle de computadores e as sinalizações, que o sistema novo não mencionou.

---

## 2. Visão geral da intranet

### Como é construída (stack)
- **Site estático** em HTML, CSS e JavaScript puro, sem framework e sem etapa de compilação (`index.html`, pasta `js/`, cerca de 8.600 linhas).
- **Banco de dados e login no Supabase** (Postgres na nuvem):
  - 37 tabelas, com regras de acesso por setor e cargo (`supabase/migrations/0001` a `0027`, com políticas de segurança em `0007_rls_policies.sql`);
  - armazenamento de arquivos nos buckets `cursos` e `avatares` (`0011_storage_buckets.sql`);
  - atualização em tempo real para chat e notificações (`0009_realtime.sql`).
- **3 funções de servidor** (`supabase/functions/`):
  - `criar-funcionario`;
  - `alterar-senha-funcionario`;
  - `analisar-erro-ia`, que manda o relato de erro para a IA Claude, da Anthropic.
- **1 rotina agendada:** um "sinal de vida" a cada 3 dias para o Supabase gratuito não ser pausado (`.github/workflows/supabase-keep-alive.yml`). Não existe nenhuma outra rotina automática: nenhum envio agendado, relatório automático ou busca em tribunal.

### Módulos e telas (menu em `js/data.js`, roteamento em `js/router.js`)

| Tela | O que faz | Onde está |
|---|---|---|
| Início (painel) | Acesso rápido aos sistemas, pauta de audiências, metas do mês, avisos, funcionário do mês, aniversariantes, links úteis e ferramentas | `js/router.js` (`renderDashboardView`), `js/render-layout.js` |
| Acordos, Jurídico, RH, Financeiro, Arquivos, Instruções | Páginas por setor. Mostram uma descrição e o botão **"Abrir sistema"**, um link externo configurável. Jurídico mostra a pauta de audiências, Financeiro mostra as metas e RH mostra a equipe | `js/router.js` (`renderNavSectionView`) |
| Cursos e Oficinas | Plataforma interna de ensino a distância, com aulas em vídeo, PDF e arquivo, materiais para baixar e progresso por colaborador | `js/router.js`, `js/cursos-helpers.js`, tabelas `cursos`, `aulas`, `progresso_cursos` |
| Calculadora | Calculadoras de honorários (gestão de passivo, aditivo, planos de assessoria) | `js/calculadora.js` |
| Chat | Chat interno entre colaboradores e grupos, em tempo real | `js/chat.js`, tabelas `chat_*` |
| Metas | Metas gerais, por setor e por carteira, com painel de acompanhamento | `js/metas-dashboard.js`, tabelas `metas`, `carteiras` |
| Notificações | Parabéns de aniversário e avisos do sistema | `js/router.js`, tabela `notificacoes` |
| Sinalizações de Colaboradores | Registro de ocorrências ou erros por colaborador, com classificação colorida, tipo de erro, prazo e status aberta/resolvida | `js/sinalizacoes.js`, tabela `sinalizacoes` |
| Eficiência, Qualidade e Alertas | Registro de Atendimentos com linha do tempo, tempo de resposta, resolução e status "Aguardando"; notas de qualidade; atendimentos de referência; indicadores por equipe e colaborador | `js/eficiencia-dashboard.js`, tabelas `atendimentos_chat`, `atendimento_chat_eventos`, `avaliacoes_qualidade`, `atendimentos_referencia` |
| Computadores e Equipamentos | Inventário, manutenções, máquinas reserva, histórico e exportação em CSV | `js/computadores.js`, tabelas `computadores`, `manutencoes_computador` e outras |
| Reportar Erro | Relato de problemas no sistema, com análise automática por IA e envio por Gmail/Outlook | `js/reportar-erro.js`, `supabase/functions/analisar-erro-ia` |
| Manual do Sistema | Manual de uso dentro do portal | `js/manual.js` |
| Administração (20 abas) | Setores, equipes, funcionários, audiências, avisos, metas, links, permissões, grupos de chat, cursos, tipos de erro etc. | `js/admin.js` (`ADMIN_TABS`) |

### Integrações externas encontradas
| Integração | Tipo | Evidência |
|---|---|---|
| Supabase (banco, login, arquivos, tempo real) | Integração real | `js/supabase-client.js`, `js/data-sync.js` |
| Anthropic (IA Claude) | Integração real, só para analisar os erros reportados | `supabase/functions/analisar-erro-ia/index.ts` (chamada a `api.anthropic.com`) |
| Gmail / Outlook | Não é integração: abre a tela de escrever e-mail no navegador, já preenchida | `js/reportar-erro.js` (`abrirEnvioBugReport`) |
| ChatGuru | Não é integração: campo onde se cola manualmente o link da conversa | `supabase/migrations/0021_atendimento_link_chatguru.sql`, coluna `link_chatguru` |
| YouTube / Vimeo | Exibição de vídeos das aulas | `js/router.js` (`renderAulaConteudo`) |
| AdvBox, SOSFY, Atlas, Microsoft 365, Google Workspace, tribunais (TJMG, TJSP, PJe, Projudi, e-SAJ, CNJ...) | Só atalhos (links) | `js/data.js` (`MODULES_SEED`, `TOOLS_SEED`, `LINKS_SEED`) |
| **WhatsApp, Asaas, APIs de tribunais, CRM comercial, envio de e-mail pelo servidor** | **Não encontrados** | Nenhuma ocorrência no código |

---

## 3. Tabela comparativa

Legenda: ✅ Tem · 🟡 Parcial · ❌ Não tem · ❓ Não identificado

### Comunicação e integrações
| Funcionalidade | Sistema novo | Intranet | Evidência no código | Observação |
|---|---|---|---|---|
| WhatsApp direto das tarefas, com mensagens anexadas | Sim (R$ 250/número/mês) | ❌ | Nenhuma ocorrência de "whatsapp" no código | O mais próximo é o link manual do ChatGuru no atendimento (`atendimentos_chat.link_chatguru`). Não envia nem recebe mensagens. |
| E-mail por Google e Microsoft | Sim | 🟡 | `js/reportar-erro.js` (linhas 154–157) | Só em "Reportar Erro", e só abre o Gmail ou o Outlook no navegador com o texto pronto. O sistema não envia e-mail nem guarda cópia. Não há SMTP configurado (`js/auth.js`, linha 89: "backend sem SMTP configurado"). |
| Caixa de e-mail conectada, criando pastas de atendimento | Sim | ❌ | Nenhum código lê caixa de e-mail | — |

### Gestão de processos
| Funcionalidade | Sistema novo | Intranet | Evidência no código | Observação |
|---|---|---|---|---|
| Cadastro de processos (manual, Excel, número CNJ) | Sim | ❌ | Não existe tabela de processos entre as 37 tabelas | O painel Jurídico só tem o botão "Abrir sistema" (`js/data.js`, módulo 3 "Painel Jurídico": "Processos, prazos e andamentos", link externo). AdvBox aparece como "Gestão de processos" (`TOOLS_SEED`). |
| Capa customizável e campos por área | Sim | ❌ | — | — |
| Timeline automática do processo | Sim | 🟡 | `atendimento_chat_eventos` (migração `0020`), `renderAtendimentoChatDetalhe` | Existe linha do tempo automática, mas **do atendimento**, não do processo. |
| Modelos de documentos preenchidos automaticamente | Sim | ❌ | `js/data.js`, módulo 4 "Modelos de Peças e Petições" | É só um atalho para um sistema ou pasta externa. Não gera documentos. |
| Link temporário (48h) para o cliente | Sim | ❌ | — | — |
| Etiquetas coloridas como filtro, replicadas nas tarefas | Sim | 🟡 | tabela `classificacoes_sinalizacao` (campo `cor`), `js/sinalizacoes.js` | Existem classificações coloridas, mas só para sinalizações de colaboradores. Não há processos nem tarefas para etiquetar. |

### CRM e clientes
| Funcionalidade | Sistema novo | Intranet | Evidência no código | Observação |
|---|---|---|---|---|
| Prospects × clientes, formulários distintos | Sim | ❌ | Não existe tabela de clientes | "Cliente" aparece só como **texto livre** em `atendimentos_chat.cliente` e `audiencias.cliente`. |
| Carteiras de clientes por etiquetas | Sim | 🟡 | tabela `carteiras` (`0003_schema_metas_cursos.sql`), `js/access-control.js` | A "carteira" da intranet é só um nome usado para metas por carteira. Não guarda clientes. |
| Visão consolidada dos processos de um cliente | Sim | ❌ | — | Sem cadastro de cliente e de processo, não há o que consolidar. |

### Portal do cliente
| Funcionalidade | Sistema novo | Intranet | Evidência no código | Observação |
|---|---|---|---|---|
| Cliente vê processos e andamentos | Sim | ❌ | Login só para funcionários (tabela `funcionarios` ligada a `auth.users`) | A intranet é só para uso interno. |
| Cliente envia arquivos, vê tarefas e pagamentos | Sim | ❌ | — | O upload de arquivos existe, mas só para cursos e fotos (buckets `cursos` e `avatares`). |
| Cliente solicita consultas | Sim | ❌ | — | — |
| Acesso para agentes externos | Sim | ❌ | Perfis só internos (`CARGOS_ACESSO` em `js/data.js`) | — |

### Automações e tarefas
| Funcionalidade | Sistema novo | Intranet | Evidência no código | Observação |
|---|---|---|---|---|
| Tipos de tarefa configuráveis | Sim | ❌ | Não existe tabela de tarefas | O mais parecido são os "Tipos de Erro" configuráveis (tabela `tipos_erro_sinalizacao`), que servem só para sinalizações. |
| Sugestão de próximas tarefas | Sim | ❌ | — | — |
| Tarefa automática ao receber intimação ou mensagem | Sim | ❌ | Nenhuma rotina de leitura de tribunal ou mensagem | A única rotina agendada é o "sinal de vida" do Supabase. |
| SLA com alerta ao gestor | Sim | 🟡 | `js/eficiencia-dashboard.js` (`calcTempoPrimeiraRespostaMin`, `enviarAlertaAtendimentoChat`); `sinalizacoes.prazo` (migração `0016`) | A intranet **mede** o tempo de resposta e o cumprimento de prazo. Porém o "alerta" é **registrado manualmente** por uma pessoa. Nenhum aviso automático é disparado quando o prazo estoura. |
| Fluxos por questionário com múltiplos caminhos | Sim | ❌ | — | — |

### Relatórios
| Funcionalidade | Sistema novo | Intranet | Evidência no código | Observação |
|---|---|---|---|---|
| 80+ modelos, exportação PDF/Excel, envio automático | Sim | 🟡 | Painéis em `js/eficiencia-dashboard.js` e `js/metas-dashboard.js`; CSV em `js/computadores.js` (`exportarComputadoresCSV`, `exportarManutencoesCSV`) | A intranet tem painéis na tela, com filtros por período, setor, equipe e colaborador. Só computadores e manutenções exportam, e em CSV (abre no Excel). Não há PDF nem envio automático. |
| Relatório por cliente (consultivo, andamentos, horas) | Sim | ❌ | Não há cadastro de cliente nem apontamento de horas | — |

### Financeiro
| Funcionalidade | Sistema novo | Intranet | Evidência no código | Observação |
|---|---|---|---|---|
| Módulo financeiro | Sim (ativável) | 🟡 | `js/router.js` (seção "Financeiro"), tabela `metas` (`valor_meta`, `valor_atingido`); `js/calculadora.js` | Mostra metas financeiras, com valores **digitados** pelo administrador, e calculadoras de honorários. Não tem contas a receber ou a pagar, boletos nem lançamentos. |
| **Integração com o Asaas** | — (o escritório usa hoje) | ❌ | Nenhuma ocorrência de "asaas" no código | A intranet **não se conecta ao Asaas**. O SOSFY ("Automação de cobrança") aparece só como atalho. |

### Escala e suporte (informativo)
| Item | Sistema novo | Intranet | Evidência no código | Observação |
|---|---|---|---|---|
| Volume (200 mil+ processos, 230+ usuários) | Sim | ❓ | `docs/KEEP_ALIVE.md`, `.github/workflows/supabase-keep-alive.yml` | O projeto roda no **plano gratuito** do Supabase, com o limite de pausa por inatividade. O código carrega tabelas inteiras para o navegador após o login (`js/data-sync.js`). Isso funciona bem hoje, mas não foi pensado para centenas de milhares de registros. |
| Suporte humano e treinamento | Sim | ❓ | Existem o manual interno (`js/manual.js`, `MANUAL-DO-USUARIO.html`) e o "Reportar Erro" com IA | O suporte depende de quem mantém a intranet. Isso não se conclui pelo código. |

**Placar:** ✅ 0 · 🟡 7 · ❌ 18 · ❓ 2 (os dois itens informativos de escala e suporte).

---

## 4. O que só a intranet faz (o que perderíamos numa migração completa)

Nada disto foi citado na apresentação do sistema novo:

1. **Painel de Eficiência, Qualidade e Alertas.** Tempo de resposta ao cliente, atendimentos resolvidos ou não, status "Aguardando", ranking por equipe, reincidências e linha do tempo protegida contra alteração pelo próprio avaliado (`js/eficiencia-dashboard.js`, migrações `0016`–`0027`).
2. **Avaliação de qualidade dos atendimentos.** Nota de 0 a 10 em oito critérios (clareza, cordialidade, proatividade, cumprimento de promessas etc.) e atendimentos de referência (tabelas `avaliacoes_qualidade`, `atendimentos_referencia`).
3. **Sinalizações de Colaboradores.** Registro de erros por pessoa, com tipo de erro, prazo, classificação e privacidade por setor (`js/sinalizacoes.js`, migração `0013_sinalizacoes_privacidade.sql`).
4. **Cursos e Oficinas (EAD interno).** Aulas, materiais e progresso de cada colaborador.
5. **Metas** gerais, por setor e por carteira, com controle de quem vê cada meta.
6. **Controle de computadores e equipamentos.** Inventário, manutenções, máquinas reserva, histórico e exportação.
7. **Calculadoras de honorários** (passivo, aditivo, planos de assessoria).
8. **Comunicação interna:** chat em tempo real, avisos, aniversariantes com envio de parabéns e funcionário do mês.
9. **Reportar Erro com análise por IA.**
10. **Permissões por setor e cargo** e um "hub" de atalhos para todos os sistemas do escritório (AdvBox, SOSFY, tribunais etc.).

> Parte disso (chat, avisos, cursos) existe em ferramentas genéricas de mercado. Os itens 1, 2 e 3 são específicos do jeito de trabalhar do escritório e foram construídos sob medida. São os que mais pesam na decisão.

---

## 5. Análise das dores atuais

| Dor relatada | O código explica? | Seria difícil resolver dentro da intranet? |
|---|---|---|
| **Informações espalhadas em vários sistemas** | **Sim.** A intranet foi desenhada como um "hub de atalhos": cada setor tem um botão "Abrir sistema" para um sistema externo (`renderNavSectionView`), e os dados de clientes e processos ficam fora dela (AdvBox, SOSFY, ChatGuru, tribunais). Ela reúne os links, mas não os dados. | **Alto.** Trazer os dados exige integrar cada sistema (AdvBox, ChatGuru, Asaas, tribunais), o que depende de cada um oferecer API. |
| **Advogado abre várias abas para ver um cliente** | **Sim.** Na intranet, "cliente" é só um texto digitado no atendimento e na audiência (`atendimentos_chat.cliente`, `audiencias.cliente`), sem cadastro único que ligue as informações. | **Médio a alto.** Um cadastro de clientes com página própria é médio. Preencher essa página com processos, conversas e pagamentos exige as integrações acima. |
| **Não há pasta única com os processos do cliente** | **Sim.** Não existe tabela de processos, e o armazenamento de arquivos só tem os buckets `cursos` e `avatares`. | **Alto.** Exige criar processos e documentos do zero e, para ter valor real, buscar dados nos tribunais. |
| **CRM comercial da empresa dos sócios: a intranet se conecta?** | **Não.** Não há nenhuma integração com CRM (buscas por "crm", "hubspot", "pipedrive" e "rdstation" sem resultado). No máximo, o administrador pode cadastrá-lo como link de atalho. | **Médio**, se o CRM tiver API. Isso precisa ser confirmado (seção 6). |

**Conclusão das dores:** as três primeiras vêm diretamente da falta de cadastro de clientes e processos. Esse é justamente o núcleo do sistema novo, e o ponto em que ele leva mais vantagem.

---

## 6. Pontos a confirmar

### Com a equipe
1. **O AdvBox ainda é usado para processos?** Ele aparece no código como "Gestão de processos". Se sim, o sistema novo substituiria o AdvBox, não a intranet, e a comparação real passa a ser AdvBox × sistema novo.
2. **O SOSFY ainda é usado para cobrança?** Qual é a relação dele com o Asaas?
3. Qual é o volume real: número de processos, clientes e usuários? Isso define se o plano gratuito do Supabase ainda serve.
4. **O Registro de Atendimentos e as avaliações de qualidade são usados de fato no dia a dia?** Isso define o peso do item 4 na decisão.
5. Qual é o CRM comercial dos sócios e se ele tem API ou exportação?
6. Como o ChatGuru é usado hoje e se ele seria substituído pelo WhatsApp do sistema novo.

### Com o fornecedor
1. **Integração com o Asaas**: nativa? De mão dupla (cobrança gerada no sistema e baixa automática)?
2. **API e webhooks abertos**, para ligar o sistema à intranet (por exemplo, levar ao painel de Eficiência os atendimentos e tarefas registrados no sistema novo) e ao CRM dos sócios.
3. **Importação de dados** do AdvBox ou de planilhas, e **exportação** dos nossos dados se sairmos (os dados continuam nossos?).
4. **Login único (SSO)** com Google ou Microsoft, para não criar mais uma senha.
5. Se o WhatsApp exige número dedicado, se usa a API oficial e se o custo de R$ 250 é por número ou por usuário.
6. Se o módulo financeiro, o portal do cliente e os relatórios estão no preço base ou são pagos à parte.
7. Se a busca por número CNJ e a captura de intimações cobrem os tribunais que usamos (TJMG, TJSP, TRF1, PJe, Projudi, e-SAJ).
8. Se existe avaliação de qualidade e produtividade por colaborador, parecida com o painel de Eficiência da intranet.

---

## 7. Esforço estimado para a intranet cobrir as lacunas (caso a opção seja evoluir, não migrar)

| Lacuna | Esforço | Por quê |
|---|---|---|
| Cadastro de clientes (prospect × cliente, carteiras, etiquetas) | **Médio** | Tabelas e telas novas no mesmo padrão das existentes. Não depende de terceiros. |
| Cadastro de processos (manual e por planilha) + página do cliente com seus processos | **Médio** | Idem. A importação de planilha exige cuidado com a validação dos dados. |
| Busca por número CNJ e captura de intimações | **Alto** | Depende de fornecedor de dados de tribunais (pago) e de rotinas agendadas no servidor, que a intranet ainda não tem. |
| Tarefas com tipos, responsáveis, prazos e alerta automático de SLA ao gestor | **Médio** | O painel de Eficiência já tem boa parte da lógica de tempo e prazo. Falta a rotina que dispara o alerta sozinha. |
| WhatsApp integrado (enviar e receber) | **Alto** | Exige a API oficial do WhatsApp ou um provedor, webhooks e custo por mensagem ou número. |
| Envio de e-mail pelo sistema / caixa conectada | **Médio / Alto** | Envio simples é médio (configurar SMTP). Ler a caixa e criar pastas automaticamente é alto. |
| Integração com o Asaas | **Médio** | O Asaas tem API pública. Exige guardar a chave no servidor e rotinas de conciliação. |
| Integração com o CRM dos sócios | **Médio** (se houver API) | Depende do CRM. |
| Portal do cliente (processos, arquivos, pagamentos, link de 48h) | **Alto** | Novo tipo de usuário (externo) e revisão completa das regras de segurança, hoje feitas só para funcionários. |
| Modelos de documentos preenchidos automaticamente | **Médio** | Depende dos cadastros de cliente e processo existirem antes. |
| Relatórios em PDF/Excel e envio automático | **Médio** | Exportar em CSV já existe em Computadores e é fácil replicar. PDF e envio agendado exigem rotina no servidor. |
| Escala para 200 mil+ processos | **Médio** | Mudar para plano pago do Supabase e passar a carregar os dados por página, não tudo de uma vez. |

**Leitura geral:** evoluir a intranet para cobrir o núcleo do sistema novo (clientes, processos, tarefas, tribunais, WhatsApp e portal do cliente) é, na soma, um projeto de **esforço alto** e contínuo, com manutenção interna. Além do desenvolvimento, sobram os custos de terceiros: dados de tribunais, WhatsApp e plano do Supabase.

Por isso a recomendação preliminar é **complementar**:
- usar o sistema novo para o jurídico e o relacionamento com o cliente;
- manter a intranet para gestão interna e qualidade;
- priorizar, se o fornecedor oferecer API, uma integração simples que alimente o painel de Eficiência da intranet com os atendimentos e tarefas registrados no sistema novo.
