/* ================= MANUAL DO SISTEMA (seção interna) =================
   Documentação de uso completa, no mesmo formato/estilo do manual de
   referência do Portal Financeiro: sidebar própria com busca, badges de
   "quem acessa" por seção, passos numerados, tabelas de campo, callouts
   e glossário — só que para este portal, e vivendo dentro da própria
   área de conteúdo (não é um arquivo à parte). Estilos escopados em
   .manual-doc para nunca vazar pro resto do app. */
function renderManualView() {
  document.getElementById('content').innerHTML = manualHTML();
  ligarComportamentosManual();
}

function manualHTML() {
  return `
  <style>
    .manual-doc {
      --m-ink: #201F1D; --m-paper: #FAF9F6; --m-paper-raised: #FFFFFF;
      --m-text: #1c1a15; --m-text-muted: #6b6455;
      --m-gold: #96721A; --m-gold-soft: #F2E7C8; --m-line: #E6E2D8;
      --m-good: #2A8A61; --m-good-bg: #E4F2EB;
      --m-warn: #9a5b1f; --m-warn-bg: #f7ecdd;
      --m-danger: #A73F32; --m-danger-bg: #F7E6E3;
      --m-font-display: 'Playfair Display', Georgia, serif;
      --m-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Consolas, monospace;
      margin: -28px; display: grid; grid-template-columns: 270px minmax(0,1fr);
      min-height: calc(100% + 56px); background: var(--m-paper); color: var(--m-text);
      font-size: 14.5px; line-height: 1.6;
    }
    #portal.dark .manual-doc {
      --m-ink: #0e0d0b; --m-paper: #17150f; --m-paper-raised: #201d16;
      --m-text: #efe9db; --m-text-muted: #b3ab97; --m-gold: #d9b565; --m-gold-soft: #4a3c22;
      --m-line: #34302484; --m-good: #7bbd88; --m-good-bg: #1f2c22;
      --m-warn: #e0a25c; --m-warn-bg: #33291a; --m-danger: #e08a8a; --m-danger-bg: #332120;
    }
    .manual-doc a { color: var(--m-gold); text-decoration: none; }
    .manual-doc a:hover { text-decoration: underline; }
    .manual-sidebar { background: var(--m-ink); color: #cfc9ba; padding: 24px 18px 40px; position: sticky; top: 0; align-self: start; height: calc(100vh - 120px); overflow-y: auto; }
    .manual-brand { padding-bottom: 16px; margin-bottom: 14px; border-bottom: 1px solid #2a2620; }
    .manual-brand .kicker { font-family: var(--m-font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #d9b565; }
    .manual-brand h1 { font-family: var(--m-font-display); font-size: 1.1rem; font-weight: 700; margin: 5px 0 2px; color: #f5f1e6; text-wrap: balance; }
    .manual-brand p { margin: 0; font-size: 11.5px; color: #8f8874; }
    .manual-search input { width: 100%; background: #1c1a14; border: 1px solid #322d24; border-radius: 7px; color: #efe9db; padding: 8px 10px; font-size: 12.5px; font-family: inherit; margin-bottom: 16px; outline: none; }
    .manual-search input::placeholder { color: #756e5b; }
    .manual-search input:focus { border-color: #d9b565; }
    .manual-navgroup-title { font-family: var(--m-font-mono); font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: #756e5b; padding: 12px 8px 5px; }
    .manual-navlink { display: block; padding: 5px 8px; border-radius: 6px; font-size: 12.5px; color: #cfc9ba; cursor: pointer; line-height: 1.35; }
    .manual-navlink:hover { background: #1e1b15; color: #f5f1e6; text-decoration: none; }
    .manual-hidden { display: none !important; }
    .manual-totop { display: block; margin-top: 14px; padding: 7px 8px; font-size: 11.5px; color: #8f8874; border-top: 1px solid #2a2620; cursor: pointer; }
    .manual-totop:hover { color: #f5f1e6; }

    .manual-main { padding: 40px clamp(20px,4vw,64px) 100px; max-width: 860px; }
    .manual-hero { margin-bottom: 44px; padding-bottom: 32px; border-bottom: 1px solid var(--m-line); }
    .manual-hero .eyebrow { font-family: var(--m-font-mono); font-size: 10.5px; letter-spacing: .13em; text-transform: uppercase; color: var(--m-gold); }
    .manual-hero h1 { font-family: var(--m-font-display); font-size: clamp(1.7rem,3.2vw,2.3rem); font-weight: 700; line-height: 1.15; margin: 8px 0 12px; text-wrap: balance; max-width: 20ch; color: var(--m-text); }
    .manual-hero .lede { font-size: 1rem; color: var(--m-text-muted); max-width: 62ch; margin: 0 0 18px; }
    .manual-rolelegend { display: flex; flex-wrap: wrap; gap: 8px; }
    .manual-rolechip { display: inline-flex; align-items: center; gap: 6px; font-family: var(--m-font-mono); font-size: 11.5px; padding: 4px 9px; border-radius: 999px; border: 1px solid var(--m-line); background: var(--m-paper-raised); color: var(--m-text-muted); }
    .manual-rolechip strong { color: var(--m-text); font-weight: 700; }

    .manual-grouptitle { font-family: var(--m-font-display); font-size: 1.45rem; font-weight: 700; margin: 54px 0 5px; text-wrap: balance; color: var(--m-text); }
    .manual-grouptitle:first-of-type { margin-top: 0; }
    .manual-grouplede { color: var(--m-text-muted); max-width: 62ch; margin: 0 0 26px; font-size: .95rem; }

    .manual-module { padding: 26px 0 30px; border-top: 1px solid var(--m-line); scroll-margin-top: 20px; }
    .manual-module:first-of-type { border-top: none; }
    .manual-modulehead { margin-bottom: 14px; }
    .manual-modulehead .eyebrow { font-family: var(--m-font-mono); font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: var(--m-text-muted); }
    .manual-modulehead h3 { font-family: var(--m-font-display); font-size: 1.3rem; font-weight: 700; margin: 5px 0 8px; text-wrap: balance; color: var(--m-text); }
    .manual-modulehead .lede { color: var(--m-text-muted); max-width: 64ch; margin: 0 0 10px; }
    .manual-accessrow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 4px; }
    .manual-accessrow .label { font-size: 11.5px; color: var(--m-text-muted); margin-right: 2px; }
    .manual-badge { font-family: var(--m-font-mono); font-size: 10.5px; padding: 2px 7px; border-radius: 5px; background: var(--m-gold-soft); color: var(--m-text); border: 1px solid var(--m-line); }
    .manual-badge.everyone { background: transparent; }
    .manual-path { font-family: var(--m-font-mono); font-size: 11.5px; color: var(--m-text-muted); background: var(--m-paper-raised); border: 1px solid var(--m-line); border-radius: 5px; padding: 1px 6px; }
    .manual-sub { font-size: .96rem; font-weight: 700; margin: 22px 0 8px; color: var(--m-text); }
    .manual-doc p { max-width: 66ch; margin: 0 0 12px; }
    .manual-steps { list-style: none; counter-reset: mstep; margin: 0 0 18px; padding: 0; max-width: 66ch; }
    .manual-steps > li { counter-increment: mstep; position: relative; padding: 2px 0 2px 36px; margin-bottom: 11px; min-height: 24px; }
    .manual-steps > li::before { content: counter(mstep); position: absolute; left: 0; top: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--m-paper-raised); border: 1px solid var(--m-gold); color: var(--m-gold); font-family: var(--m-font-mono); font-size: 11.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .manual-steps b { font-weight: 700; }
    .manual-field { font-family: var(--m-font-mono); font-size: .86em; background: var(--m-paper-raised); border: 1px solid var(--m-line); border-radius: 4px; padding: 1px 5px; }
    .manual-plain { margin: 0 0 16px; padding-left: 18px; max-width: 64ch; }
    .manual-plain li { margin-bottom: 5px; }
    .manual-callout { display: flex; gap: 9px; border-radius: 8px; padding: 11px 14px; margin: 14px 0 18px; max-width: 66ch; font-size: .88rem; border: 1px solid var(--m-line); }
    .manual-callout .icon { font-family: var(--m-font-mono); font-weight: 700; flex-shrink: 0; }
    .manual-callout p { margin: 0; }
    .manual-callout.tip { background: var(--m-good-bg); border-color: color-mix(in srgb, var(--m-good) 30%, var(--m-line)); }
    .manual-callout.tip .icon { color: var(--m-good); }
    .manual-callout.atencao { background: var(--m-warn-bg); border-color: color-mix(in srgb, var(--m-warn) 30%, var(--m-line)); }
    .manual-callout.atencao .icon { color: var(--m-warn); }
    .manual-callout.restrito { background: var(--m-danger-bg); border-color: color-mix(in srgb, var(--m-danger) 30%, var(--m-line)); }
    .manual-callout.restrito .icon { color: var(--m-danger); }
    .manual-fieldtable-wrap { overflow-x: auto; margin: 0 0 18px; }
    table.manual-fieldtable { border-collapse: collapse; width: 100%; max-width: 66ch; font-size: .87rem; }
    table.manual-fieldtable th { text-align: left; font-family: var(--m-font-mono); font-size: 10px; letter-spacing: .05em; text-transform: uppercase; color: var(--m-text-muted); font-weight: 500; padding: 5px 12px 5px 0; border-bottom: 1px solid var(--m-line); }
    table.manual-fieldtable td { padding: 7px 12px 7px 0; border-bottom: 1px solid var(--m-line); vertical-align: top; }
    table.manual-fieldtable td:first-child { font-family: var(--m-font-mono); font-size: .85em; white-space: nowrap; color: var(--m-text); }
    table.manual-fieldtable tr:last-child td { border-bottom: none; }
    .manual-twocol { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 28px; }
    @media (max-width: 900px) { .manual-twocol { grid-template-columns: 1fr; } .manual-doc { grid-template-columns: 1fr; } .manual-sidebar { display: none; } }
    .manual-statuspill { display: inline-block; font-family: var(--m-font-mono); font-size: 11px; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--m-line); margin: 2px 3px 2px 0; white-space: nowrap; }
    .manual-faq { border-top: 1px solid var(--m-line); padding: 12px 0; }
    .manual-faq:last-child { border-bottom: 1px solid var(--m-line); }
    .manual-faq summary { cursor: pointer; font-weight: 700; font-size: .94rem; list-style: none; display: flex; justify-content: space-between; gap: 10px; }
    .manual-faq summary::-webkit-details-marker { display: none; }
    .manual-faq summary::after { content: "+"; font-family: var(--m-font-mono); color: var(--m-gold); flex-shrink: 0; }
    .manual-faq[open] summary::after { content: "\\2013"; }
    .manual-faq p { margin: 9px 0 0; color: var(--m-text-muted); max-width: 64ch; }
    .manual-footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid var(--m-line); color: var(--m-text-muted); font-size: 11.5px; }
  </style>

  <div class="manual-doc">
    <nav class="manual-sidebar" id="manualNavRoot">
      <div class="manual-brand">
        <p class="kicker">Manual do sistema</p>
        <h1>Portal Corporativo</h1>
        <p>Oliveira &amp; Camilo</p>
      </div>
      <div class="manual-search"><input type="search" id="manualBusca" placeholder="Buscar uma seção..."></div>
      <div id="manualNavGroups">
        ${manualNavGroup('Comece por aqui', [['comece','Como entrar e como o menu funciona'],['perfis','Níveis e restrições de acesso']])}
        ${manualNavGroup('Painel inicial', [['inicio','01 · Painel inicial (dashboard)'],['aniversariantes','02 · Aniversariantes e Funcionário do mês']])}
        ${manualNavGroup('Dia a dia', [['cursos','03 · Cursos e Oficinas'],['metas','04 · Metas'],['chat','05 · Chat interno'],['calculadora','06 · Calculadora'],['notificacoes','07 · Notificações'],['sinalizacoes','08 · Sinalizações de Colaboradores'],['reportarerro','09 · Reportar Erro']])}
        ${manualNavGroup('Administração', [['admin-acessorapido','10 · Acesso rápido'],['admin-setores','11 · Setores'],['admin-funcionarios','12 · Funcionários'],['admin-audiencias','13 · Audiências'],['admin-avisos','14 · Avisos'],['admin-metas','15 · Gestão de Metas'],['admin-funcionariomes','16 · Funcionário do mês'],['admin-aniversariantes','17 · Aniversariantes'],['admin-links','18 · Links e Ferramentas'],['admin-classificacoes','19 · Classificações'],['admin-permissoes','20 · Permissões de acesso'],['admin-gruposchat','21 · Grupos de chat'],['admin-cursos','22 · Cursos (cadastro)'],['admin-parabens','23 · Relatório de Parabéns'],['admin-manutencaoia','24 · Central de Manutenção IA'],['admin-supabase','25 · Conexão Supabase']])}
        ${manualNavGroup('Referência', [['glossario','Glossário'],['duvidas','Perguntas frequentes']])}
      </div>
      <div class="manual-totop" onclick="document.getElementById('content').scrollTo({top:0,behavior:'smooth'})">↑ Voltar ao topo</div>
    </nav>

    <main class="manual-main">
      <div class="manual-hero">
        <p class="eyebrow">Manual de uso · toda a equipe</p>
        <h1>Como usar o Portal Corporativo</h1>
        <p class="lede">Este manual explica, seção por seção, o que cada área do sistema faz e como realizar as tarefas do dia a dia. Use o menu ao lado (ou a busca no topo dele) para pular direto para o que você precisa.</p>
        <div class="manual-rolelegend">
          <span class="manual-rolechip"><strong>Todos</strong> — painel inicial, cursos, chat, calculadora</span>
          <span class="manual-rolechip"><strong>Por setor</strong> — módulos e metas do próprio setor</span>
          <span class="manual-rolechip"><strong>RH / Diretoria</strong> — acesso cruzado mais amplo, por padrão</span>
          <span class="manual-rolechip"><strong>Administrador</strong> — vê e configura tudo</span>
        </div>
      </div>

      <section class="manual-module" id="comece">
        <div class="manual-modulehead"><p class="eyebrow">Antes de começar</p><h3>Como entrar e como o menu funciona</h3></div>
        <ol class="manual-steps">
          <li>Na tela de login, escolha o tipo de acesso (<b>Sou usuário</b> ou <b>Sou administrador</b>), informe seu <b>e-mail corporativo</b> e a <b>senha</b>, e entre.</li>
          <li>Colaborador novo, sem conta ainda? O administrador cria o acesso em <a href="#admin-funcionarios">Administração → Funcionários</a> — sem isso, mesmo com o e-mail certo, o login é recusado.</li>
          <li>Esqueceu a senha? Use <b>Esqueci minha senha</b> na tela de login: um código de 6 dígitos é enviado por e-mail, válido por 10 minutos, e substitui a senha antiga.</li>
          <li>Depois de entrar, a barra lateral mostra a navegação por setor (Início, Acordos, Jurídico, RH, Financeiro, Arquivos, Cursos, Instruções) e, abaixo, o grupo <b>Ferramentas</b> (Calculadora, Chat, Metas, Notificações, Sinalizações, Reportar Erro e este Manual).</li>
          <li>Para sair, clique no seu avatar no canto superior direito do cabeçalho.</li>
        </ol>
        <div class="manual-callout tip"><span class="icon">i</span><p>O sino no cabeçalho mostra notificações em tempo real (parabéns recebidos, por exemplo) — não precisa recarregar a página.</p></div>
      </section>

      <section class="manual-module" id="perfis">
        <div class="manual-modulehead"><p class="eyebrow">Antes de começar</p><h3>Níveis e restrições de acesso</h3></div>
        <p>O acesso é organizado por <b>setor</b> do seu cadastro, não por pessoa. Por padrão, cada setor só enxerga o próprio painel — acesso cruzado a outro setor, ver a meta geral, ver sinalizações de todos os setores ou ver o quadro completo de funcionários exige uma permissão concedida explicitamente pelo administrador (veja <a href="#admin-permissoes">Permissões de acesso</a>).</p>
        <div class="manual-fieldtable-wrap">
          <table class="manual-fieldtable">
            <thead><tr><th>Situação</th><th>O que você vê</th></tr></thead>
            <tbody>
              <tr><td>Colaborador comum</td><td>O painel do próprio setor; metas Gerais, as próprias e a meta coletiva do setor; funcionários do próprio setor.</td></tr>
              <tr><td>Setor com acesso liberado</td><td>Tudo isso, mais o que o administrador liberou especificamente para o setor (RH e Diretoria já vêm, por padrão, com acesso mais amplo).</td></tr>
              <tr><td>Gestor de um setor</td><td>Todas as metas do(s) setor(es) que administra, incluindo metas de carteira e individuais de colegas.</td></tr>
              <tr><td>Administrador</td><td>Acesso completo a todas as telas, setores e ao painel de Administração.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="manual-callout atencao"><span class="icon">!</span><p>Se um módulo aparece com cadeado ou "Sem permissão", não é um erro — reflete a configuração do seu setor. Fale com o administrador se acredita que deveria ter acesso.</p></div>
      </section>

      <h2 class="manual-grouptitle">Painel inicial</h2>
      <p class="manual-grouplede">A tela que você vê ao entrar (item <span class="manual-path">Início</span>) — um resumo do que importa hoje.</p>

      <section class="manual-module" id="inicio">
        <div class="manual-modulehead">
          <p class="eyebrow">01 · Painel inicial</p><h3>Acesso rápido, audiências, metas, avisos, links</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge everyone">todos, com conteúdo ajustado ao setor</span></div>
        </div>
        <h4 class="manual-sub">Acesso rápido</h4>
        <p>Cartões para os sistemas e painéis do escritório. Cartões com cadeado são restritos (ex.: <em>Acessos e Senhas</em>, só para líderes e administradores); os demais abrem o link configurado pelo administrador em <a href="#admin-acessorapido">Acesso rápido</a>.</p>
        <h4 class="manual-sub">Pauta de audiências — hoje</h4>
        <p>Lista das audiências do dia (horário, cliente, advogado responsável e status). É informativa; quem inclui/altera é o administrador em <a href="#admin-audiencias">Audiências</a>.</p>
        <h4 class="manual-sub">Metas do mês</h4>
        <p>Resumo das metas gerais e do seu setor, com barra de progresso. <span class="manual-path">Ver painel completo de metas</span> leva ao detalhamento (veja <a href="#metas">Metas</a>).</p>
        <h4 class="manual-sub">Avisos importantes</h4>
        <p>Comunicados da diretoria, com prioridade (barra colorida: vermelha=alta, dourada=média, verde=baixa) e data. Fixados aparecem primeiro.</p>
        <h4 class="manual-sub">Links úteis e Ferramentas</h4>
        <p>Atalhos para tribunais, órgãos e sistemas do dia a dia, mantidos pelo administrador em <a href="#admin-links">Links e Ferramentas</a>.</p>
      </section>

      <section class="manual-module" id="aniversariantes">
        <div class="manual-modulehead">
          <p class="eyebrow">02 · Painel inicial</p><h3>Aniversariantes e Funcionário do mês</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge everyone">todos</span></div>
        </div>
        <p>Os aniversariantes do card são calculados automaticamente a partir da <span class="manual-field">data de nascimento</span> de cada funcionário — atualiza sozinho conforme o mês muda, sem cadastro manual. Quem faz aniversário <b>hoje</b> ganha destaque (fundo dourado, avatar maior, etiqueta "Hoje 🎂").</p>
        <p>Clique no ícone de bolo para enviar parabéns — a pessoa recebe uma notificação na hora, com seu nome. Só é possível enviar uma vez por pessoa, e não dá para parabenizar a si mesmo.</p>
        <p>O card <b>Funcionário do mês</b> é definido pelo administrador (veja <a href="#admin-funcionariomes">Funcionário do mês</a>) e também tem um botão Parabenizar, que funciona do mesmo jeito quando o destaque está vinculado a um funcionário cadastrado.</p>
      </section>

      <h2 class="manual-grouptitle">Dia a dia</h2>
      <p class="manual-grouplede">As ferramentas do menu inferior, disponíveis para toda a equipe.</p>

      <section class="manual-module" id="cursos">
        <div class="manual-modulehead">
          <p class="eyebrow">03 · Dia a dia</p><h3>Cursos e Oficinas</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge everyone">todos</span></div>
          <p class="lede">Treinamentos internos em vídeo, PDF ou apresentação, com progresso salvo automaticamente por pessoa.</p>
        </div>
        <ol class="manual-steps">
          <li>Abra <span class="manual-path">Cursos</span> no menu principal — só cursos <b>publicados</b> aparecem no catálogo.</li>
          <li>Clique num curso para ver as aulas, o palestrante (com contato/redes sociais, se informados) e os materiais extras.</li>
          <li>Assista/abra cada aula e marque como <b>concluída</b> — o percentual do curso é recalculado automaticamente.</li>
        </ol>
        <p>Seu progresso é individual e fica salvo mesmo saindo e voltando depois.</p>
      </section>

      <section class="manual-module" id="metas">
        <div class="manual-modulehead">
          <p class="eyebrow">04 · Dia a dia</p><h3>Metas</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge everyone">todos, com visão ajustada</span></div>
        </div>
        <p>Painel completo em <span class="manual-path">Metas</span>, com metas Gerais (escritório todo), por Setor ou por Carteira — valor-alvo, valor atingido, prazo e status. O que você vê depende do seu perfil (veja <a href="#perfis">Níveis e restrições</a>).</p>
        <div class="manual-callout tip"><span class="icon">i</span><p>É só acompanhamento — quem cria/edita metas é o administrador em <a href="#admin-metas">Gestão de Metas</a>.</p></div>
      </section>

      <section class="manual-module" id="chat">
        <div class="manual-modulehead">
          <p class="eyebrow">05 · Dia a dia</p><h3>Chat interno</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge everyone">todos</span></div>
        </div>
        <p>Conversas individuais e em grupo, com mensagens em tempo real. Grupos são criados pelo administrador (veja <a href="#admin-gruposchat">Grupos de chat</a>), que também define os membros — você só vê e recebe mensagens de grupos dos quais participa.</p>
      </section>

      <section class="manual-module" id="calculadora">
        <div class="manual-modulehead">
          <p class="eyebrow">06 · Dia a dia</p><h3>Calculadora</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge everyone">todos</span></div>
        </div>
        <p>Três abas de apoio à negociação: <b>Passivo</b> (soma dívidas por tipo e sugere valor de entrada), <b>Aditivo</b> (recalcula um contrato somando novas dívidas, com desconto por perfil do cliente) e <b>Assessoria</b> (estima o plano — Essencial, Estratégico ou Premium — a partir do faturamento e do número de funcionários do cliente). Os resultados recalculam sozinhos conforme você preenche os campos.</p>
      </section>

      <section class="manual-module" id="notificacoes">
        <div class="manual-modulehead">
          <p class="eyebrow">07 · Dia a dia</p><h3>Notificações</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge everyone">todos</span></div>
        </div>
        <p>O sino no cabeçalho e a tela <span class="manual-path">Notificações</span> mostram parabéns recebidos e avisos do sistema, entregues em tempo real (sem precisar recarregar a página).</p>
      </section>

      <section class="manual-module" id="sinalizacoes">
        <div class="manual-modulehead">
          <p class="eyebrow">08 · Dia a dia</p><h3>Sinalizações de Colaboradores</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge">Administrador</span><span class="manual-badge everyone">demais, só o que envolve você</span></div>
        </div>
        <p>Registro de erros, falhas ou pontos de atenção no trabalho de um colaborador — não é para assuntos de clientes. <b>Só administradores registram uma sinalização nova.</b></p>
        <p>Quem vê uma sinalização: administrador; quem tem a permissão "ver sinalizações de todos os setores" (RH/Diretoria, por padrão); gestor do setor; quem registrou; e o próprio colaborador sinalizado, sobre si mesmo. Nenhum outro colega vê.</p>
      </section>

      <section class="manual-module" id="reportarerro">
        <div class="manual-modulehead">
          <p class="eyebrow">09 · Dia a dia</p><h3>Reportar Erro</h3>
          <div class="manual-accessrow"><span class="label">Quem acessa:</span><span class="manual-badge everyone">todos</span></div>
        </div>
        <ol class="manual-steps">
          <li>Abra <span class="manual-path">Reportar Erro</span>, descreva título, área afetada, prioridade e o que aconteceu; anexe prints/vídeos se ajudar.</li>
          <li>Envie — o relato é registrado e, quando o serviço de análise automática está ativo, você recebe um resumo do diagnóstico na mesma tela.</li>
          <li>Você também pode encaminhar por e-mail (Gmail, Outlook, app padrão ou copiando o texto) depois do envio.</li>
        </ol>
      </section>

      <h2 class="manual-grouptitle">Administração</h2>
      <p class="manual-grouplede">Visível só para quem tem nível <b>Administrador</b> — um botão extra aparece no cabeçalho para abrir o painel, com uma aba para cada área.</p>

      <section class="manual-module" id="admin-acessorapido">
        <div class="manual-modulehead"><p class="eyebrow">10 · Administração</p><h3>Acesso rápido</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Define o link de destino e o setor dono de cada cartão do painel inicial. Deixe o setor em branco para um módulo geral, aberto a todos.</p>
      </section>

      <section class="manual-module" id="admin-setores">
        <div class="manual-modulehead"><p class="eyebrow">11 · Administração</p><h3>Setores</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Cria, renomeia e exclui os setores usados em todo o sistema (funcionários, módulos, metas, sinalizações etc.). Renomear atualiza automaticamente tudo que já usa aquele nome; excluir um setor ainda em uso é bloqueado, com aviso claro.</p>
        <div class="manual-callout atencao"><span class="icon">!</span><p>Os 4 setores com toggle de acesso cruzado dedicado (Acordos, Jurídico, RH, Financeiro) também têm item próprio no menu principal. Renomear especificamente um desses 4 não atualiza o rótulo do menu nem essa coluna de acesso — prefira criar um setor novo nesse caso. Criar, excluir ou renomear qualquer outro setor funciona plenamente.</p></div>
      </section>

      <section class="manual-module" id="admin-funcionarios">
        <div class="manual-modulehead"><p class="eyebrow">12 · Administração</p><h3>Funcionários</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Cadastro central da equipe. Uma barra de busca no topo da lista filtra por nome, cargo, setor, nível, número ou e-mail.</p>
        <h4 class="manual-sub">Cadastrar um colaborador novo</h4>
        <div class="manual-fieldtable-wrap">
          <table class="manual-fieldtable">
            <tbody>
              <tr><td>Foto</td><td>Opcional, enviada na hora</td></tr>
              <tr><td>Nome, número, setor, cargo, nível de acesso</td><td>Nível de acesso é o que define permissões (Administrador, Diretor, Líder, Supervisor, Negociador, Cobrador, RH, Jurídico, Financeiro ou TI)</td></tr>
              <tr><td>Data de nascimento, telefone, e-mail</td><td>E-mail é o que a pessoa usa para entrar</td></tr>
              <tr><td>Senha de acesso</td><td>Definida por você agora, mínimo 6 caracteres — repasse à pessoa</td></tr>
            </tbody>
          </table>
        </div>
        <p>Ao cadastrar, o login já é criado com o e-mail e a senha informados — a pessoa já consegue entrar direto, sem precisar de "Esqueci minha senha".</p>
        <h4 class="manual-sub">Trocar a senha de alguém depois</h4>
        <p>Edite o cadastro da pessoa e preencha <span class="manual-field">Nova senha</span> (deixe em branco para não mexer na atual). Por segurança, não é possível ver a senha atual de ninguém — só definir uma nova.</p>
      </section>

      <section class="manual-module" id="admin-audiencias">
        <div class="manual-modulehead"><p class="eyebrow">13 · Administração</p><h3>Audiências</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Gerencia a pauta de audiências exibida no painel inicial: horário, cliente, advogado responsável e status (Confirmada, Cancelada ou Remarcada).</p>
      </section>

      <section class="manual-module" id="admin-avisos">
        <div class="manual-modulehead"><p class="eyebrow">14 · Administração</p><h3>Avisos</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Publica, edita e fixa os comunicados da diretoria, com título, descrição, prioridade e data.</p>
      </section>

      <section class="manual-module" id="admin-metas">
        <div class="manual-modulehead"><p class="eyebrow">15 · Administração</p><h3>Gestão de Metas</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Cria metas Gerais, por Setor ou por Carteira, com valor-alvo, valor atingido, período, responsável e status. Alimenta automaticamente o painel inicial e o painel completo de <a href="#metas">Metas</a>.</p>
      </section>

      <section class="manual-module" id="admin-funcionariomes">
        <div class="manual-modulehead"><p class="eyebrow">16 · Administração</p><h3>Funcionário do mês</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Selecione um colaborador cadastrado para preencher nome, cargo e foto automaticamente — isso também vincula o destaque a essa pessoa, para o botão Parabenizar funcionar de verdade. Nome, cargo, motivo e mensagem também podem ser ajustados manualmente.</p>
      </section>

      <section class="manual-module" id="admin-aniversariantes">
        <div class="manual-modulehead"><p class="eyebrow">17 · Administração</p><h3>Aniversariantes</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>O card do painel inicial já calcula os aniversariantes do mês sozinho, a partir da data de nascimento de cada funcionário — esta aba é complementar, para registrar alguém sem vínculo de cadastro completo, se algum dia for necessário.</p>
      </section>

      <section class="manual-module" id="admin-links">
        <div class="manual-modulehead"><p class="eyebrow">18 · Administração</p><h3>Links e Ferramentas</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Duas listas simples: <b>Links de sistemas</b> (tribunais, órgãos) e <b>Ferramentas</b> (sistemas do dia a dia da equipe) — nome, descrição e URL.</p>
      </section>

      <section class="manual-module" id="admin-classificacoes">
        <div class="manual-modulehead"><p class="eyebrow">19 · Administração</p><h3>Classificações</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Define os níveis de gravidade usados nas sinalizações de colaboradores (ex.: Leve, Média, Grave, Crítica), cada um com uma cor.</p>
      </section>

      <section class="manual-module" id="admin-permissoes">
        <div class="manual-modulehead"><p class="eyebrow">20 · Administração</p><h3>Permissões de acesso</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Duas tabelas: <b>acesso cruzado entre setores</b> (libera um setor ver o painel de outro, a meta geral, sinalizações de todos os setores, ou o quadro completo de funcionários) e <b>gestores por setor</b> (quem enxerga todas as metas do setor que administra). Use o seletor "Visualizando..." no cabeçalho para simular a tela de um colaborador de outro setor e conferir o efeito.</p>
      </section>

      <section class="manual-module" id="admin-gruposchat">
        <div class="manual-modulehead"><p class="eyebrow">21 · Administração</p><h3>Grupos de chat</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Cria grupos internos e escolhe exatamente quem participa — dá para preencher automaticamente por setor ou selecionar manualmente.</p>
      </section>

      <section class="manual-module" id="admin-cursos">
        <div class="manual-modulehead"><p class="eyebrow">22 · Administração</p><h3>Cursos e Oficinas (cadastro)</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Cadastra o curso (nome, tema, descrição, status Publicado/Rascunho, dados do palestrante com foto e redes sociais) e, dentro dele, gerencia as aulas — título, tipo (vídeo, PDF, apresentação ou arquivo), upload real de mídia ou link externo — e os materiais extras para download.</p>
      </section>

      <section class="manual-module" id="admin-parabens">
        <div class="manual-modulehead"><p class="eyebrow">23 · Administração</p><h3>Relatório de Parabéns</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Consulta, somente leitura, quem recebeu e quem enviou parabéns, e quando.</p>
      </section>

      <section class="manual-module" id="admin-manutencaoia">
        <div class="manual-modulehead"><p class="eyebrow">24 · Administração</p><h3>Central de Manutenção IA</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Histórico completo dos relatos enviados em <a href="#reportarerro">Reportar Erro</a> e o diagnóstico técnico gerado pela análise automática (causa provável, solução sugerida, arquivos afetados).</p>
      </section>

      <section class="manual-module" id="admin-supabase">
        <div class="manual-modulehead"><p class="eyebrow">25 · Administração</p><h3>Conexão Supabase</h3><div class="manual-accessrow"><span class="manual-badge">Administrador</span></div></div>
        <p>Confirma se o portal está corretamente conectado ao banco de dados — tela de diagnóstico, não altera nada.</p>
      </section>

      <h2 class="manual-grouptitle" id="glossario">Referência</h2>
      <p class="manual-grouplede">Consulta rápida.</p>
      <section class="manual-module">
        <h4 class="manual-sub" style="margin-top:0;">Status de sinalização</h4>
        <p><span class="manual-statuspill">Aberta</span> · <span class="manual-statuspill">Resolvida</span></p>
        <h4 class="manual-sub">Status de meta</h4>
        <p><span class="manual-statuspill">Em andamento</span> · <span class="manual-statuspill">Atingida</span> · <span class="manual-statuspill">Não atingida</span> · <span class="manual-statuspill">Pausada</span></p>
        <h4 class="manual-sub">Status de curso</h4>
        <p><span class="manual-statuspill">Publicado</span> · <span class="manual-statuspill">Rascunho</span> <span style="color:var(--m-text-muted);">(só administrador vê rascunhos)</span></p>
        <h4 class="manual-sub">Status de análise de erro (IA)</h4>
        <p><span class="manual-statuspill">Enviando</span> · <span class="manual-statuspill">Analisado</span> · <span class="manual-statuspill">Falha na análise</span> · <span class="manual-statuspill">Backend offline</span></p>
      </section>

      <section class="manual-module" id="duvidas">
        <h4 class="manual-sub" style="margin-top:0;">Perguntas frequentes</h4>
        <details class="manual-faq"><summary>Não vejo uma seção que este manual descreve. Por quê?</summary><p>O menu mostra só o que o seu setor/nível tem permissão de usar. Confira o selo de acesso no início de cada seção deste manual — se o seu perfil não estiver listado, fale com o administrador.</p></details>
        <details class="manual-faq"><summary>Cadastrei um funcionário e o login não funcionou. Por quê?</summary><p>Confira se a senha definida no cadastro tem pelo menos 6 caracteres e se o e-mail está correto — é exatamente esse e-mail + senha que a pessoa usa para entrar.</p></details>
        <details class="manual-faq"><summary>Por que não vejo a sinalização de um colega?</summary><p>É o comportamento esperado: só administradores, o gestor do setor, quem registrou e o próprio colaborador sinalizado veem cada sinalização — não é aberto para o setor inteiro.</p></details>
        <details class="manual-faq"><summary>Os aniversariantes do mês sumiram/mudaram. É um bug?</summary><p>Não — a lista é recalculada automaticamente todo mês, a partir da data de nascimento de cada funcionário cadastrado. Se alguém não aparece, confira se a data de nascimento está preenchida no cadastro dela.</p></details>
      </section>

      <footer class="manual-footer">Portal Corporativo Oliveira &amp; Camilo — este manual reflete as telas do sistema no momento em que foi escrito; em caso de dúvida sobre uma tela específica, ela é sempre a fonte da verdade.</footer>
    </main>
  </div>
  `;
}

function manualNavGroup(titulo, itens) {
  return `
    <div class="manual-navgroup" data-group="${esc(titulo)}">
      <p class="manual-navgroup-title">${esc(titulo)}</p>
      ${itens.map(([id, label]) => `<a class="manual-navlink" href="#${id}">${esc(label)}</a>`).join('')}
    </div>
  `;
}

function ligarComportamentosManual() {
  const buscaInput = document.getElementById('manualBusca');
  const grupos = Array.from(document.querySelectorAll('.manual-navgroup'));
  if (buscaInput) {
    buscaInput.addEventListener('input', function () {
      const q = buscaInput.value.trim().toLowerCase();
      grupos.forEach(function (grupo) {
        const links = Array.from(grupo.querySelectorAll('.manual-navlink'));
        let algumVisivel = false;
        links.forEach(function (link) {
          const bate = !q || link.textContent.toLowerCase().indexOf(q) !== -1;
          link.classList.toggle('manual-hidden', !bate);
          if (bate) algumVisivel = true;
        });
        grupo.classList.toggle('manual-hidden', !algumVisivel);
      });
    });
  }
  document.querySelectorAll('.manual-navlink, .manual-doc a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      const href = a.getAttribute('href') || '';
      if (href[0] !== '#') return;
      ev.preventDefault();
      const alvo = document.getElementById(href.slice(1));
      if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
