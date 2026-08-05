# Keep-alive do Supabase

Projetos gratuitos do Supabase são **pausados automaticamente após 7 dias seguidos sem nenhuma requisição à API**. Este documento explica a análise feita, a solução implementada e os limites dela.

## 1. Análise da arquitetura antes de implementar

O portal é um site estático (HTML/CSS/JS puro, sem build, sem `package.json`) hospedado na Vercel — não existe nenhum backend próprio (Node, Next.js, Express) rodando de forma contínua. A única "atividade" no Supabase hoje acontece quando alguém abre o navegador e usa o sistema (login, leitura de dados, chat, etc.).

Isso significa que:
- **Um keep-alive dentro do próprio front-end (ex.: `setInterval` no navegador) não resolve o problema.** Ele só rodaria enquanto alguém estivesse com a aba aberta — exatamente a situação oposta à que causa a pausa (ninguém acessar por dias).
- **Não há processo de servidor contínuo** onde encaixar um `cron` de aplicação (não existe Express/Next.js rodando 24h).
- A solução precisa ser **externa e independente de qualquer pessoa abrir o site**.

Por isso a escolha foi um **agendamento no GitHub Actions** (o repositório já vive no GitHub), em vez de, por exemplo, criar uma função serverless na Vercel só para isso — evita adicionar uma peça nova de infraestrutura (backend/build) a um projeto que hoje é deliberadamente estático, e roda de forma completamente desacoplada do deploy do site.

## 2. O que foi implementado

**Arquivo criado:** [`.github/workflows/supabase-keep-alive.yml`](../.github/workflows/supabase-keep-alive.yml)

Um workflow do GitHub Actions, agendado, que faz **uma única requisição `GET`, de leitura**, à tabela `modulos` do Supabase — a mesma consulta mínima que a tela **Administração → Conexão Supabase** já usa para "testar conexão" (`js/supabase-client.js`, função `testarConexaoSupabase`). Não é uma rotina nova inventada para este fim: reaproveita um padrão que já existia e já era usado como "sinal de vida" do banco.

Por que essa consulta específica:
- **Não altera nenhum dado** — é um `SELECT`, nunca um `INSERT`/`UPDATE`/`DELETE`.
- **Não expõe nenhuma informação** — a política de RLS da tabela `modulos` (`supabase/migrations/0007_rls_policies.sql`) exige estar autenticado como colaborador/administrador para ver qualquer linha; como a requisição usa só a chave pública `anon` sem login, a resposta é sempre uma lista vazia (`[]`), confirmado em teste real: `HTTP 200`, 2 bytes de resposta.
- **É uma chamada real à API pública do Supabase** (PostgREST), então conta como atividade de verdade para o contador de inatividade — diferente de, por exemplo, um `ping` de rede que nem chegaria a acionar a API.

## 3. Frequência

A cada **3 dias** (`cron: '17 9 */3 * *'`, em UTC — horário quebrado de propósito para não cair nos minutos de pico do GitHub).

Por que 3 dias e não, por exemplo, diário: o limite de pausa é 7 dias. Rodando a cada 3 dias, mesmo que **uma execução inteira falhe** (com as 3 tentativas automáticas já esgotadas), ainda sobram cerca de 4 dias de folga antes do projeto correr risco de pausa — ou seja, seria necessário perder **duas execuções seguidas** para chegar perto do limite. É uma frequência que já dá bastante margem sem gerar tráfego desnecessário.

Também é possível disparar manualmente a qualquer momento pela aba **Actions → Supabase Keep-Alive → Run workflow** no GitHub (foi habilitado via `workflow_dispatch`), útil para testar depois de qualquer mudança.

## 4. Impacto no consumo do Supabase

Praticamente nulo:
- 1 requisição a cada 3 dias ≈ 10 requisições/mês.
- Resposta de poucos bytes (`[]`), sem uso de armazenamento, sem escrita, sem processamento pesado no banco.
- Está muito abaixo de qualquer limite do plano gratuito do Supabase (que é medido em requisições/mês na casa das centenas de milhares).
- No lado do GitHub: cada execução leva poucos segundos numa runner `ubuntu-latest` — consumo de minutos do plano gratuito de Actions é irrelevante para este uso (bem menos de 1 minuto por execução, ~10 execuções/mês).

## 5. Tratamento de erros, nova tentativa e logs

- **Nova tentativa automática:** até 3 tentativas por execução, com 15s de espera entre elas, para absorver falhas de rede passageiras.
- **Logs:** cada tentativa registra o código de saída do `curl`, o status HTTP e o corpo da resposta, agrupados na aba **Actions** do GitHub (interface própria de logs, sem precisar de nenhuma ferramenta extra).
- **Alerta de falha:** se as 3 tentativas falharem, o workflow termina com erro (`exit 1`) — o **GitHub Actions automaticamente envia e-mail** para quem tem acesso ao repositório sempre que um workflow agendado falha. Não foi necessário configurar nenhum serviço de notificação à parte.

## 6. Isso funciona depois de novos deploys?

Sim, e de forma totalmente desacoplada: o workflow não faz parte do processo de build/deploy do site na Vercel — ele é lido pelo GitHub diretamente da branch `main` do repositório. Qualquer novo commit/deploy do portal não afeta o agendamento, que continua rodando independentemente.

## 7. Riscos e limitações conhecidas

Sendo direto sobre onde essa estratégia pode falhar:

1. **O GitHub pode desativar workflows agendados automaticamente se o repositório ficar 60 dias sem nenhuma atividade (nenhum commit/push).** Como este projeto está em desenvolvimento ativo, isso não é uma preocupação hoje — mas se o repositório ficar muito tempo parado, vale reativar manualmente em Actions (é só clicar em "Enable workflow", não precisa recriar nada).
2. **O Supabase pode alterar, a qualquer momento, o que conta como "atividade" para efeito de pausa.** A lógica aqui parte do que é documentado/observado hoje (qualquer requisição à API conta); se a Supabase mudar essa regra no futuro (por exemplo, passar a exigir tráfego de um usuário autenticado, ou ignorar chamadas com `anon key`), esta estratégia precisaria ser revisada. Não há garantia contratual da Supabase sobre esse comportamento — é um limite do plano gratuito sujeito a mudança.
3. **Isso é um contorno (workaround), não uma eliminação estrutural do risco.** Enquanto o projeto estiver no plano gratuito, a política de pausa por inatividade continua existindo; o workflow só garante que a condição de pausa nunca seja atingida, na prática.

### A alternativa definitiva

A única forma de **eliminar completamente** o risco de pausa por inatividade — sem depender de nenhum job externo continuar funcionando para sempre — é o **plano pago do Supabase (Pro em diante)**, que não pausa projetos por inatividade. Isso é uma decisão de custo que só vocês podem tomar; o keep-alive aqui é a solução apropriada para continuar no plano gratuito com risco bem reduzido, mas não é uma garantia absoluta do jeito que upgradar de plano seria.
