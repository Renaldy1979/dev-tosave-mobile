# Análise: upgrade do Appwrite self-hosted 1.8.1 → 2.2.0

Autor: Alicerce · 24/09/2026 · **Só análise.** Nada foi alterado no servidor nem no código.

Legenda:
- **[fonte]** afirmação tirada de nota oficial, com link;
- **[verificado]** conferido por mim no nosso ambiente ou código;
- **[SUPOSIÇÃO]** inferência não confirmada em fonte oficial.

## Fontes

| Fonte | URL |
|---|---|
| Releases oficiais | https://github.com/appwrite/appwrite/releases |
| 1.9.0 | https://github.com/appwrite/appwrite/releases/tag/1.9.0 |
| 1.9.5 | https://github.com/appwrite/appwrite/releases/tag/1.9.5 |
| 1.9.6 | https://github.com/appwrite/appwrite/releases/tag/1.9.6 |
| 2.0.0 | https://github.com/appwrite/appwrite/releases/tag/2.0.0 (anúncio: https://appwrite.io/blog/post/announcing-appwrite-2) |
| 2.1.0 | https://github.com/appwrite/appwrite/releases/tag/2.1.0 |
| 2.2.0 | https://github.com/appwrite/appwrite/releases/tag/2.2.0 |
| 2.3.0 | https://github.com/appwrite/appwrite/releases/tag/2.3.0 |
| Guia de upgrade | https://appwrite.io/docs/advanced/self-hosting/production/updates |
| Compose oficial 2.2.0 | https://github.com/appwrite/appwrite/blob/2.2.0/docker-compose.yml |
| Template do Easypanel | https://github.com/easypanel-io/templates/tree/main/templates/appwrite |
| Compose do Easypanel | https://github.com/easypanel-io/compose/blob/19-01-2026/appwrite/code/docker-compose.yml |
| SDKs (CHANGELOG/README) | https://github.com/appwrite/sdk-for-node · https://github.com/appwrite/sdk-for-react-native |

## 0. Contexto que muda tudo

1. **A 2.2.0 não é mais a última estável.** A **2.3.0** saiu em 23/09/2026, 8 dias depois da 2.2.0. [fonte: releases]
2. **O nosso Appwrite não foi instalado pelo instalador oficial.** Ele roda por um compose do Easypanel (`easypanel-io/compose`, ref `19-01-2026`), travado em `appwrite/appwrite:1.8.1`, console `7.5.7` e executor `0.7.22`. O template do Easypanel está na 1.8.0 no changelog e não tem versão 2.x. [fonte: template e compose do Easypanel; verificado: `/v1/health/version` = 1.8.1]
   - O comando oficial de upgrade (`docker run … --entrypoint="upgrade"`) regenera o compose do diretório `appwrite/` do instalador oficial. **Não é o arquivo que o Easypanel gerencia.** [fonte: guia de upgrade]
   - **[SUPOSIÇÃO]** No nosso caso, o upgrade significa **reescrever à mão o compose do Easypanel** a partir do compose oficial de cada versão, e depois rodar `migrate` no container `appwrite`.
3. **A 2.x muda bastante a composição dos containers.** [fonte: compose oficial 2.2.0]
   - **Entram:**
     - `clickhouse`;
     - `orchestrator` (open-runtimes, substitui o fluxo do executor 0.7);
     - `appwrite-geo`, `appwrite-autogravity`;
     - `appwrite-worker-executions`, `-notifications`, `-jobs`, `-screenshots`;
     - `appwrite-task-interval`.
   - **Atualizados:** Traefik 2.11 → 3.6; console `appwrite/new:1.1.96-self-hosted`; executor 0.7.22 → 0.29.0.
   - **Na 2.3:** entra `appwrite-mqtt`. [fonte: 2.3.0]

## 1. Caminho de upgrade suportado

| Passo | Origem exigida | Comando | Fonte |
|---|---|---|---|
| 1.8.1 → **1.9.0** | 1.8.1 | upgrade + `docker compose exec appwrite migrate` | 1.9.0, "Upgrade Path" |
| 1.9.0 → **1.9.5** | 1.9.0 | upgrade + migrate; "revisar mudanças do compose gerado" | 1.9.5 |
| 1.9.5 → **1.9.6** | 1.9.5 | upgrade (+ reparo automático de atributos de Functions/Sites) | 1.9.6 |
| 1.9.x → **2.0.0** | 1.9.x | upgrade + migrate; "Back up your data first" | 2.0.0 |
| 2.0.0 → **2.1.0** | 2.0.0 | upgrade + migrate (sem mudança de schema) | 2.1.0 |
| 2.1.0 → **2.2.0** | 2.1.0 | upgrade + migrate (console DB, rápido) | 2.2.0 |
| (opcional) → **2.3.0** | **1.9.6 ou mais nova** | upgrade + migrate (mexe em `users`/`identities` de todo projeto) | guia de upgrade, 2.3.0 |

- **Versões intermediárias obrigatórias:** pela regra do guia, é preciso passar por cada versão menor ("upgrade to each minor version's latest patch"). Então **1.8.1 → 1.9.x → 2.x**. [fonte: guia]
  - O guia diz que a 2.3.0 aceita sair de "1.9.6 or any later version". [fonte: guia]
  - **[SUPOSIÇÃO]** Não está documentado se 1.8.1 → 1.9.6 pode ser direto. As notas descrevem 1.8.1 → 1.9.0 → 1.9.5 → 1.9.6.
  - Também não está documentado se 1.9.6 → 2.2.0 pode pular 2.0 e 2.1. As notas da 2.1 e da 2.2 só falam em sair da anterior. **Pelo seguro: um passo por versão, com `migrate` em cada um.**
- **`migrate`:** existe em todas as versões: `docker compose exec appwrite migrate`, ou `--migrate` no upgrade, ou a etapa de migração do instalador web. [fonte: 1.9.0, 2.0.0]
- **Downtime:** o guia não informa. [fonte: guia]
  - **[SUPOSIÇÃO]** Com a nossa base pequena (1 projeto, ~11 mil linhas no catálogo, 1 usuário real, 10 mil arquivos), cada `migrate` deve levar minutos.
  - O grosso do tempo é reescrever e validar o compose no Easypanel em cada passo: **2 a 4 horas de janela** para toda a cadeia, com o app fora do ar.
- **Rollback:** o guia só orienta sobre voltar da 2.3 para a 2.2 (drenar filas antes). Não há `migrate` reverso documentado. **O rollback confiável é o snapshot da VPS.** [fonte: guia; SUPOSIÇÃO quanto à falta de migração reversa]

## 2. Breaking changes contra o NOSSO uso

| Área | O que muda | Afeta o ToSave? | Fonte |
|---|---|---|---|
| **TablesDB: transações** | 2.0: transações recusam *array queries* logo de início. 2.3: commit com falha de permissão vira `failed` + 401 | **Não.** A Function `collection` usa `upsertRow`/`deleteRow`/`increment`/`decrement` com `transactionId`, sem array queries. [verificado no código] | 2.0.0, 2.3.0 |
| **TablesDB: queries** (`contains`, `search`, cursor, `total`) | Nenhuma mudança anunciada. 1.9.5 corrigiu "listRows total casting" | **[SUPOSIÇÃO]** Não. Conferir no ensaio: `validate` + `validate-stats` cobrem cursor, `search`, `contains`, `total` | 1.9.5 |
| **TablesDB: `increment`/`decrementRowColumn`** | Nada anunciado | **[SUPOSIÇÃO]** Não | — |
| **TablesDB: min/max de inteiro** | 2.0: `min`/`max` limitados ao que a coluna comporta | Não (usamos 0..99, 0..1000, anos) | 2.0.0 |
| **TablesDB: novos tipos de string** | 1.9.0: `varchar`/`text`/`mediumtext`/`longtext` | Não quebra: as colunas `string` existentes continuam | 1.9.0 |
| **Storage: prévias** | 1.9.5 corrigiu cache de prévia (chave com projeto, não guardar erro). 2.1: `gravity=auto` opcional (container `autogravity`) | **Não quebra.** `width/height/quality/output=webp` seguem iguais. **[SUPOSIÇÃO]** O cache de prévias pode ser recriado depois do upgrade (primeiros acessos mais lentos) | 1.9.5, 2.1.0 |
| **Functions: runtimes** | Executor 0.7 → open-runtimes executor 0.29 + orchestrator. O `.env` padrão da 2.2 traz `_APP_FUNCTIONS_RUNTIMES=node-22` | **Atenção:** precisa manter `node-22` na variável e **refazer o build** das 4 Functions (`npm run deploy-functions`). **[SUPOSIÇÃO]** Os builds antigos podem não sobreviver à troca de executor; a 2.0 diz que os artefatos sobrevivem ao upgrade 1.9 → 2.0 | 2.0.0, compose 2.2 |
| **Functions: execuções** | 2.2: execuções **só no ClickHouse** (sai a cópia no banco do projeto). 2.3: `duration` inclui o cold start | **ClickHouse vira obrigatório.** Nossas execuções síncronas (`collection`, `serie-progress`) continuam; o histórico antigo some da listagem. `duration` maior só muda a telemetria do `validate` | 2.2.0, 2.3.0 |
| **Functions: headers e variáveis** | 2.2 acrescenta `x-appwrite-user-jwt` quando a chamada usa JWT. Nada removido de `x-appwrite-user-id`/`x-appwrite-key` | **[SUPOSIÇÃO]** Não. A variável `TOSAVE_ENDPOINT` (contorno do redirect http→https) pode deixar de ser necessária; 2.1 menciona "internal jobs endpoint falls back to plain HTTP" | 2.1.0, 2.2.0 |
| **Functions: fila** | 1.9.0: TTL de 7 dias na fila de functions; *stale executions cleanup* | **Melhora** o caso da fila de 16 mil eventos que tivemos | 1.9.0 |
| **Auth: usuário bloqueado** | 1.9.0: bloqueado passa de **401 para 403** | **Não quebra o login:** o app mapeia por `type === "user_blocked"` [verificado: `src/services/auth.ts:109,313`]. Numa sessão já aberta, o 403 não dispara `onUnauthorized` (hoje só 401); ajuste pequeno no `withServiceError` | 1.9.0 |
| **Auth: bcrypt / sessões** | Nada sobre `createBcryptUser`. 1.9.5 corrigiu corridas de cache de sessão email/senha | **[SUPOSIÇÃO]** Não. A conta importada (hash `$2b$`) continua | 1.9.5 |
| **Auth: plataformas/origem** | 1.9.5: "platform type backwards compatibility and deprecated origin validation". 2.1: `capacitor://` | **[SUPOSIÇÃO]** A validação de origem pode ficar mais estrita que hoje (hoje, qualquer `appwrite-android://…` passa, §13). Testar o login pelo Expo Go no ensaio | 1.9.5, 2.1.0 |
| **API keys** | 1.9.0: *resource-based API keys* (nova estrutura). 2.3: fim das *dev keys* | **[SUPOSIÇÃO]** A nossa `standard_…` continua válida (a 1.9.5 inclui migração de API keys). Conferir no ensaio com `npm run check`. Não usamos dev keys | 1.9.0, 1.9.5, 2.3.0 |
| **Permissões / row security / Teams** | 2.0: `teams.total` corrigido. 2.3: o membro sempre vê a própria membership | Não quebra | 2.0.0, 2.3.0 |
| **Removidos** | 2.0: `GET /v1/health/executions`. 2.1: provedores de log não-Sentry. 2.2: `_APP_EXECUTIONS_DUAL_WRITE` etc. 2.3: `_APP_CONSOLE_URL_SCHEME` | Não usamos. **[SUPOSIÇÃO]** O `.env` do Easypanel pode ter variáveis a remover | notas de cada versão |

## 3. Banco de dados: MariaDB × PostgreSQL

- **O PostgreSQL passa a ser o padrão só para instalações novas.** "MariaDB and MongoDB installs stay on their current database; PostgreSQL is the default for new installs only." [fonte: 2.0.0]
- **A nossa instalação continua no MariaDB 10.11**, o mesmo do compose oficial 2.2. [fonte: compose 2.2; verificado: compose do Easypanel usa `mariadb:10.11`]
- **Não há migração automática MariaDB → PostgreSQL** nas notas. [fonte: 2.0.0] Para trocar de motor, seria preciso outra instalação e a ferramenta de *Migrations* entre instâncias. **[SUPOSIÇÃO]** Não há motivo para trocar.
- **MongoDB:** nada a fazer.
- A 2.2 corrigiu um problema que fazia upgrades vindos da 1.x falharem com "Failed to start containers" (healthcheck do MariaDB). Isso reforça **ir direto até a 2.2 ou 2.3**, não parar na 2.0 ou 2.1. [fonte: 2.2.0]

## 4. SDKs

| SDK | Hoje | Alvo declarado das versões novas | Fonte |
|---|---|---|---|
| `node-appwrite` | 22.1.3 (1.8.x) | 25 a 28: 1.9.x. **29.0.0** (02/09): README ainda diz 1.9.x, mas envia `X-Appwrite-Response-Format: 2.0.0`. **Ainda não há versão que declare 2.2** | README/CHANGELOG sdk-for-node |
| `react-native-appwrite` | 0.24.1 (1.8.x) | 0.26 a 0.34: 1.9.x. 0.35.0: 2.0. **1.0.0** (21/09): **2.2.x** | README/CHANGELOG sdk-for-react-native |

**O que muda no nosso código ao subir:**

- **`react-native-appwrite` 1.0.0:**
  - `react-native` vira *peer dependency* (0.35);
  - sai `Account.listLogs` (não usamos);
  - `Execution.functionId` vira `resourceId`/`resourceType` (não usamos [verificado]);
  - **corrige `Storage.createFile` com o fetch do Expo SDK 57+**, que é a nossa versão.
  - `getFilePreviewURL`, `TablesDB` e `Functions.createExecution` seguem iguais.
  - **[SUPOSIÇÃO]** Ajuste pequeno; o Forja confirma com `tsc`.
- **`node-appwrite` 29:**
  - 28.0 removeu `account.createJWT` e `project.createKey` (não usamos);
  - 29.0 troca `Execution.functionId` por `resourceId` (não usamos);
  - `tablesDB.*`, `storage.*`, `users.createBcryptUser`, `functions.*` seguem.
  - **[SUPOSIÇÃO]** Scripts e Functions funcionam com poucos ajustes.
- **Os SDKs atuais continuam funcionando contra 2.2?**
  - **[SUPOSIÇÃO]** Provavelmente sim, por um tempo. O servidor aceita o header `X-Appwrite-Response-Format` e aplica filtros de compatibilidade de resposta.
  - Mas os próprios SDKs avisam que miram uma versão específica. O certo é subir o do app para 1.0.0 e testar o `node-appwrite` 29 nos scripts.

## 5. O que a 2.x traz de útil para o ToSave

**Não há agregações (sum/count/group by) nem contagem acima de 5.000** em nenhuma nota de 1.9.0 a 2.3.0. [fonte: varredura de palavras-chave nas notas de 1.9.0-rc.1 a 2.3.0] O desenho atual continua necessário: `user_stats`, `user_series_stats`, `user_year_stats`, `catalog_meta` e `year_counts`.

Ganhos reais, em ordem de valor para nós:

1. **API de projeto pública na API key** (1.9.5): plataformas, serviços, métodos de Auth, SMTP, políticas. Hoje isso exige o console; depois dá para automatizar com scripts. [fonte: 1.9.5]
2. **Impersonation** (1.9.0 e 1.9.5): o admin vê o app como o usuário, sem senha. Ajuda a depurar problemas como o da coleção vazia sem violar a regra de não criar sessão como o usuário. [fonte: 1.9.0, 1.9.5; SUPOSIÇÃO: precisa do nosso OK de política]
3. **Políticas de senha e de e-mail** no self-hosted (1.9.5, 2.2): bloquear e-mail descartável no cadastro. [fonte]
4. **Fila de functions com TTL e limpeza de execuções órfãs** (1.9.0) + **orchestrator que explica falha de build** (2.2). [fonte]
5. **Realtime com filtros de query** (1.9.0): o app pode ouvir mudanças da própria coleção e das estatísticas em vez de reler. [fonte]
6. **`gravity=auto` nas prévias** (2.1): recorte inteligente nos cards de carro. Opcional, pesa CPU (container `autogravity`). [fonte]
7. **API S3** (2.1): subir fotos com ferramentas S3 no portal. [fonte]

**Custo:** mais containers, sobretudo o **ClickHouse**, obrigatório para execuções na 2.2.
- **[SUPOSIÇÃO]** Na nossa VPS da Hostinger, isso pode pedir 1 a 2 GB de RAM a mais.
- **Conferir a RAM e o disco livre da VPS antes.** Eu não tenho acesso a essa informação.

## 6. Plano de upgrade seguro

**Pré-requisitos:**
- janela de manutenção avisada;
- decisão sobre o alvo (**recomendo 2.3.x**, a última estável, em vez da 2.2.0);
- RAM e disco da VPS conferidos para o ClickHouse.

1. **Ensaio primeiro, em cópia.**
   1. Snapshot da VPS na Hostinger.
   2. Restaurar o snapshot numa **VPS temporária**.
   3. Fazer todo o caminho lá.
   4. Só depois repetir na produção.
2. **Backup na produção, com o app parado:**
   1. snapshot da VPS;
   2. `mysqldump` do MariaDB (`docker exec` no container `mariadb`);
   3. `tar` dos volumes `appwrite-uploads`, `appwrite-functions`, `appwrite-builds`, `appwrite-config`;
   4. cópia do `.env` e do compose do Easypanel.
3. **Congelar o tráfego:**
   1. pausar a assinatura de eventos da `catalog-sync` (`lib/catalog-sync.mjs`);
   2. esperar a fila de functions esvaziar;
   3. avisar que o app fica fora do ar.
4. **Passo a passo, com `migrate` e `npm run check` depois de cada versão:**
   1. `1.8.1 → 1.9.0 → 1.9.5 → 1.9.6`: trocar as imagens no compose do Easypanel pelas do compose oficial da versão, aplicar as mudanças de serviço e rodar `docker compose exec appwrite migrate`.
   2. `1.9.6 → 2.0.0 → 2.1.0 → 2.2.0` (→ `2.3.x`): a cada passo, comparar com o compose oficial da tag (ClickHouse, orchestrator, geo, autogravity, workers novos, Traefik 3.6) e rodar `migrate`.
   3. Manter `_APP_FUNCTIONS_RUNTIMES=node-22` e o `.env` coerente com as notas; remover as variáveis descontinuadas.
5. **Pós-upgrade no backend:**
   1. `npm run deploy-functions` (rebuild no executor novo);
   2. `npm run validate` (18 testes);
   3. `npm run validate-stats` (17 testes);
   4. conferir as contagens (`migrate -- --phase=verify`) e a conta real (375 itens, `user_stats` 379/375/4), só lendo;
   5. pedir uma prévia de foto conhecida e ver status 200 com `image/webp`.
6. **SDKs:**
   - app (Forja): `react-native-appwrite` 1.0.0, com `tsc` e bundle;
   - backend (eu): `node-appwrite` 29.x num branch, repetindo o passo 5.
7. **Teste do app no Expo Go:**
   - login com a conta real;
   - Coleção e Perfil com 379/375/4;
   - coração;
   - tela Séries e Estatísticas;
   - prévia das fotos.
8. **Rollback:** se qualquer passo falhar sem correção rápida, **restaurar o snapshot da VPS** (item 2). Não tentar voltar versão com `migrate`.

## 7. Recomendação

**Não atualizar agora. Atualizar depois, com condições.**

**Por quê:**
- O ganho direto para o ToSave é moderado: nenhuma agregação nova, e o desenho atual de estatísticas continua igual.
- O custo é alto:
  - cadeia de **7 versões**;
  - **compose do Easypanel reescrito à mão** em cada passo, sem template 2.x;
  - **ClickHouse obrigatório**;
  - troca de executor, com rebuild das Functions;
  - SDKs com a primeira versão alinhada à 2.2 saída há 3 dias no React Native, e ainda nenhuma no Node.
- O backend acabou de ser validado ponta a ponta na 1.8.1.

**Condições para fazer:**
1. **Fechar a fase 2** (app estável no Expo Go com o usuário).
2. **Alvo = 2.3.x**, a mais nova; a 2.2.0 já foi superada.
3. **Ensaio completo numa VPS clonada** do snapshot, com `validate` + `validate-stats` + teste do app.
4. **Conferir RAM e disco** para o ClickHouse.
5. **`node-appwrite` com versão declarada para 2.2 ou 2.3** (ou o 29.x aprovado no ensaio).
6. **Decidir antes das lojas.** Se as políticas de e-mail, a API de plataformas e a impersonation forem importantes para a publicação, o upgrade entra no roteiro pré-lojas. Senão, pode esperar.
7. **Alternativa a avaliar com o usuário:** em vez de reescrever o compose do Easypanel, fazer uma **instalação 2.3 nova pelo instalador oficial** e migrar o projeto com a ferramenta de *Migrations* entre instâncias (1.9.5 ampliou a cobertura). Ficaria no MariaDB ou no PostgreSQL, e o compose seria o oficial daí em diante. **[SUPOSIÇÃO]** Pode ser mais limpo que 7 reescritas manuais; precisa de avaliação própria.
