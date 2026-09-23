# ToSave Backend — Especificação (Appwrite 1.8.1)

Fonte única de verdade do backend do **Projeto 01: app mobile** (fase 2). Dono: agente **Alicerce**.
Contexto de produto: `docs/ESPECIFICACAO-MOBILE.md`, seção "Fase 2".

> **Etapa 1 (esta versão): só projeto.** Nada foi criado no Appwrite. As únicas operações feitas foram leituras (checagem do Appwrite, inspeção da origem em modo só leitura).

## 1. Ambiente

| Item | Valor |
|---|---|
| Servidor | Appwrite **1.8.1** self-hosted (`/v1/health/version` confirmado) |
| Endpoint / Project ID | nota "Appwrite Credentials" → `backend/.env.local` |
| SDK servidor | `node-appwrite` **22.1.3** (última linha compatível com 1.8.x; a 23+ é para 1.9) |
| SDK app | `react-native-appwrite` **0.24.1** fixo (0.12 a 0.24 são para 1.8.x; 0.26+ são para 1.9) |
| Runtime das Functions | **node-16.0**: é o único habilitado no servidor (`_APP_FUNCTIONS_RUNTIMES`). Migrar para node-22 quando for habilitado no VPS |

### Segredos

- `backend/.env.local` guarda `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY` e as credenciais da origem (`SOURCE_PG_*`, `SOURCE_S3_*`). O arquivo está coberto por `.env*` no `.gitignore`. Isso foi verificado com `git check-ignore`.
- Os scripts leem as credenciais com `node --env-file=.env.local`. Nenhum segredo entra no código, no git ou no app.
- O app só conhece endpoint e Project ID, que são públicos.

### Estado atual do Appwrite (checagem só leitura, 23/09/2026)

| Recurso | Estado |
|---|---|
| Databases | nenhum |
| Buckets | 1: `cars` (id `6aa1d4c400269648f7d3`), vazio, limite 30 MB, sem restrição de extensão, compressão `none`, antivírus ligado, `fileSecurity` desligado |
| Usuários / Times / Functions | nenhum |
| Scopes da API key | Leitura OK em databases, tables, buckets, files, users, teams, functions, sites, messaging e health. Os scopes de escrita não foram testados, porque testar exigiria criar algo. `functions.listRuntimes` devolve 401 pedindo o scope `public`, o que é peculiaridade do endpoint e não afeta o deploy. |

Scripts: `npm run check` (Appwrite) e `npm run inspect-source` (origem), ambos só de leitura.

## 2. O que existe na origem (Postgres 17 + RustFS, inspeção só leitura)

| Tabela origem | Linhas | Observações |
|---|---|---|
| `cars` | 10.655 | `id` uuid. `name` (máx. 49), `description` (máx. 504), `serie_id` uuid, `serie` = **posição na série** (`"3/5"`, vazia em 1.043), `collector` texto (`"001"`, vazio em 577, nulo em 92), `color_model` **em inglês** (`blue`, `red`…; vazio/nulo em ~1.100), `toy` (9.713 distintos, **não é único**: 8 vazios e códigos repetidos até 7×), `year` **texto** (100% no formato AAAA, de 1999 a 2026, 28 anos), `brand` **texto livre**, `scale` sempre `1/64`, `imagem_full`/`imagem_thumb` = caminho `/tosave/cars/<hash>_<nome>.jpg` (10.234 carros), `imagem_url_original` = URL do wiki Fandom (10.234) |
| `series` | 357 | `name` (máx. 31), `description` sempre vazia, `picture` (amostra vazia; confirmar), `is_default` (31 destaques) |
| `attributes` | 7 | Super T-Hunt, SubSerie, T-Hunt, Zamac, 2nd Color, 3rd Color, 4th Color |
| `car_attributes` | 995 | no máximo 2 atributos por carro |
| — marcas | — | **não há tabela**. `cars.brand` tem 4 valores: Hot Wheels (10.534), MatchBox (100), Others (16), Maisto (5) |
| — galeria | — | **não há tabela**: nenhum carro tem imagens extras |
| `users`, `collections`, `refresh_tokens` e outras | — | **não migram** (dados de teste; decisão do usuário) |

**RustFS:** o bucket `tosave` tinha **3.896 objetos (436 MB, todos `.jpg`)**, ou seja, ~1.948 pares imagem + `_thumb`. **Os carros referenciam 10.234 imagens.** Então ~8.300 carros podem não ter o arquivo no RustFS; o cruzamento exato ficou pendente (ver §10). Os "20 mil imagens" do briefing são, na prática, 10.234 imagens principais mais os thumbs. **Thumbs não migram**: no Appwrite eles saem de `getFilePreview`.

## 3. Banco (TablesDB)

Database: `tosave`. **Sem relationships**: as ligações são IDs em texto, arrays de IDs e índices.
Os IDs de linha são **determinísticos** (uuid de origem ou slug), o que permite upsert idempotente na migração.

### 3.1 `cars` (~10.655 linhas)

| Coluna | Tipo | Obrig. | Origem / regra |
|---|---|---|---|
| `$id` | — | — | uuid da origem (36 caracteres, válido como ID Appwrite) |
| `title` | varchar(120) | sim | `name` |
| `description` | text | não | `description` |
| `brandId` | varchar(36) | sim | slug da marca (`hot-wheels`) |
| `brandName` | varchar(60) | sim | **desnormalizado** para o card (sem join) |
| `serieId` | varchar(36) | sim | `serie_id` |
| `serieTitle` | varchar(120) | sim | **desnormalizado** |
| `seriePosition` | varchar(16) | não | `serie` (`""` → null) |
| `seriePositionNum` | integer | não | numerador de `seriePosition`. Serve para ordenar "Mais da série", porque em texto `"10/10"` vem antes de `"2/10"` |
| `collector` | varchar(10) | sim (default `""`) | `collector` (null → `""`) |
| `color` | varchar(80) | sim (default `""`) | `color_model` (ver pergunta sobre tradução) |
| `toy` | varchar(20) | sim (default `""`) | `toy` |
| `year` | integer | sim | `year::int` |
| `scale` | varchar(10) | sim | `scale` |
| `imageFileId` | varchar(36) | não | arquivo principal no bucket `car-images` (null = palco vazio) |
| `attributeIds` | varchar(36) **array** | não | ids de `car_attributes` |
| `searchText` | varchar(400) | sim | minúsculas, sem acento: `title toy collector`. Marca e série ficam de fora: são filtros próprios, e assim renomear uma série não obriga a recalcular o texto de cada carro |
| `sourceCreatedAt` | datetime | não | `created_at` da origem |
| `sourceUpdatedAt` | datetime | não | `updated_at` da origem (para migração delta) |

`createdAt`/`updatedAt` do tipo `Car` vêm de `$createdAt`/`$updatedAt`. A migração não consegue gravar a data original em `$createdAt`, por isso ela fica em `sourceCreatedAt` (datetime).

Índices:

| Nome | Tipo | Colunas | Uso |
|---|---|---|---|
| `ft_search` | fulltext | `searchText` | busca livre (`Query.search`) |
| `idx_year_title` | key | `year` DESC, `title` ASC | ordenação padrão da grid |
| `idx_serie_pos` | key | `serieId`, `seriePositionNum`, `title` | filtro por série + "Mais da série" |
| `idx_brand_year` | key | `brandId`, `year` DESC | filtro por marca |
| `idx_toy` | key | `toy` | match exato do código |
| `idx_collector` | key | `collector` | match exato `#001` |

- `attributeIds` fica sem índice: o MariaDB não indexa arrays JSON, e varrer 10 mil linhas custa milissegundos.
- Filtro AND de atributos: um `Query.contains("attributeIds", [id])` por atributo.
- Filtro OR de anos: `Query.equal("year", [2024, 2025])`.

### 3.2 `brands` (4 linhas)

`$id` slug · `name` varchar(60) · `state` enum(`ativa`,`descontinuada`,`em_analise`) default `ativa` · `imageFileId` varchar(36) null · `active` boolean default true · `carCount` integer default 0.
Índice `idx_state` (`state`). O app filtra `state != em_analise`.

### 3.3 `series` (357 linhas)

`$id` uuid da origem · `title` varchar(120) · `description` text · `imageFileId` varchar(36) null · `isDefault` boolean · `carCount` integer default 0, **mantido no servidor** (§6).
Índices: `idx_default_title` (`isDefault`, `title`) e `idx_title` (`title`).

### 3.4 `attributes` (7 linhas)

`$id` uuid da origem · `title` varchar(60) · `description` text.

### 3.5 `car_images` (galeria; nasce vazia)

`carId` varchar(36) · `fileId` varchar(36) · `position` integer (>= 1; a posição 0 é sempre `cars.imageFileId`).
Índice `idx_car_pos` (`carId`, `position`). Preenchida pelo portal na fase 3.

### 3.6 `catalog_meta` (1 linha, `$id = "global"`)

`totalCars` integer · `years` integer array (decrescente) · `updatedAt` datetime.
Existe por dois motivos:

1. O Appwrite **limita a contagem `total` a 5.000** (`APP_LIMIT_COUNT`). O catálogo inteiro, com 10.655 carros, sairia como 5.000. Contagens filtradas (por série, marca ou ano) ficam abaixo disso.
2. Não existe `DISTINCT` para listar os anos.

**A verificar na criação:** o limite de 5.000 no 1.8.1.

### 3.7 `collection_items` (até 1.000+ por usuário)

| Coluna | Tipo | Regra |
|---|---|---|
| `$id` | — | determinístico: `ci_` + hash(userId:carId) com 32 caracteres. Torna o upsert idempotente |
| `userId` | varchar(36) | dono |
| `carId` | varchar(36) | |
| `quantity` | integer **min 1, max 99** | o próprio banco recusa valores fora da faixa |
| `carTitle`, `carToy`, `carCollector`, `carYear`, `carColor`, `carScale`, `carSeriePosition`, `carImageFileId`, `brandId`, `brandName`, `serieId`, `serieTitle` | iguais aos de `cars` | **desnormalizados** do carro: a lista e a busca da coleção não fazem join |
| `searchText` | varchar(400) | igual ao do carro |

Índices:

| Nome | Tipo | Colunas | Uso |
|---|---|---|---|
| `uq_user_car` | **unique** | `userId`, `carId` | nunca duplica |
| `idx_user_created` | key | `userId`, `$createdAt` DESC | lista padrão (mais recentes) |
| `idx_user_qty` | key | `userId`, `quantity` | filtro Repetidos (`quantity > 1`) |
| `idx_user_title` | key | `userId`, `carTitle` | ordenação alternativa |
| `ft_search` | fulltext | `searchText` | busca na coleção (`userId` = X + `search`) |

Row security **ligada**. Cada linha tem só `read("user:<userId>")`, e só o servidor escreve (§6).

### 3.8 `user_stats` (1 por usuário, `$id = userId`)

`totalItems` integer · `totalModels` integer · `duplicates` integer.
Row security ligada, com `read("user:<userId>")`. Só o servidor escreve.

## 4. Permissões

| Recurso | Usuários autenticados (`users`) | Time `admins` (portal, fase 3) | Dono da linha |
|---|---|---|---|
| `cars`, `brands`, `series`, `attributes`, `car_images`, `catalog_meta` | read (no nível da tabela; row security desligada) | create / update / delete | — |
| `collection_items`, `user_stats` | — | — | read (row security) |
| bucket `car-images` | read (ver pergunta Q3) | create / update / delete | — |

- **Escrita de coleção e estatísticas só pelo servidor**: a Function `collection` usa a API key (§6). O app não tem permissão de escrita nessas tabelas, então não consegue corromper `quantity` nem `user_stats`.
- O time `admins` será criado vazio. Quem entra nele é decidido no portal (fase 3).
- Visitante (`any`) não lê nada do catálogo: o app é travado atrás do login. A exceção possível são as imagens (Q3).

## 5. Storage: bucket `car-images`

| Configuração | Valor | Motivo |
|---|---|---|
| ID | `car-images` | legível. O bucket `cars` existente (vazio, id aleatório) fica intocado; apagá-lo depende do Orquestrador |
| Tamanho máximo | 10 MB | o maior jpg da origem tem < 1 MB |
| Extensões | `jpg`, `jpeg`, `png`, `webp` | |
| Compressão | `none` | jpg/webp já são comprimidos; gzip/zstd não ganha nada |
| Criptografia | desligada | imagem pública de produto |
| Antivírus | **desligado** | uploads confiáveis (migração/admin). Ligado, o ClamAV tornaria 10 mil uploads lentos e, se o container dele não estiver de pé, os uploads falham |
| `fileSecurity` | desligado | permissão do bucket vale para todos os arquivos |
| ID do arquivo | uuid do carro sem hífens (32 caracteres) | idempotente: se já existe (409), a migração pula |

Tamanhos entregues via `getFilePreview`. A transformação no self-hosted é gratuita e o resultado fica em cache no servidor:

| Uso | Parâmetros |
|---|---|
| `imagemThumb` (grids) | `width=400`, `height=0` (sem recorte), `quality=75`, `output=webp` |
| `imagemFull` (detalhe) | `width=1080`, `height=0`, `quality=85`, `output=webp` |
| Zoom (fase 1.5) | `getFileView` (original) |

A migração **aquece o cache** chamando as duas prévias de cada arquivo depois do upload. Assim o primeiro colecionador não paga os ~10 mil redimensionamentos.

## 6. Quem mantém `user_stats`, `series.carCount` e os desnormalizados

### Avaliação

| Opção | Prós | Contras |
|---|---|---|
| **A. App grava a linha + Function por evento recalcula `user_stats`** | app escreve direto; sem cold start no toque | O evento de *update* não traz o valor anterior, então não dá para aplicar delta: é preciso recontar até 1.000+ linhas a cada toque. Execuções concorrentes gravam contagens fora de ordem. O resumo fica atrasado alguns segundos. E o app precisa de permissão de escrita, o que permite gravar desnormalizados falsos |
| **B. App grava a linha + incremento atômico (`incrementRowColumn`) + transação do 1.8, tudo no cliente** | sem Function | Calcular o delta de `duplicates` exige ler o valor antigo, e há corrida entre dois aparelhos. O app precisa de escrita em `user_stats`. A lógica fica espalhada no app |
| **C. Function `collection` síncrona (API key) + transação + incremento atômico** ✅ | Uma chamada por toque. O servidor é a única fonte da verdade: garante 0 a 99, sem duplicata, e preenche os desnormalizados a partir de `cars`. Item e estatísticas mudam na **mesma transação** (atômico). Devolve `{ item, summary }` prontos para a UI | cold start da Function (~1 s na primeira chamada após inatividade) |

### Recomendação: C

O custo de latência some com a UI otimista que o app já tem: o store atualiza na hora e reconcilia com a resposta. Os mecanismos do 1.8 usados são `createTransaction`, `upsertRow`/`deleteRow` com `transactionId`, `incrementRowColumn`/`decrementRowColumn` com `transactionId` e `updateTransaction(commit)`. Todos foram confirmados no SDK 22.1.3.

### Functions (Node 22, `backend/functions/<nome>/`, deploy por script)

| Function | Gatilho | Faz |
|---|---|---|
| `collection` | execução síncrona pelo app (`execute: users`) | `add` (+1), `set` (0 a 99; 0 remove), `remove`. O `userId` vem do header `x-appwrite-user-id`, **nunca do corpo**. Na transação: lê o item, grava ou apaga, e ajusta `user_stats` com os deltas de `totalItems`, `totalModels` e `duplicates` (cruzou 1↔2+). Cria `user_stats` sob demanda. Logging desligado |
| `catalog-sync` | eventos `databases.tosave.tables.{cars,series,brands}.rows.*` + agenda diária 04:00 | Recalcula `series.carCount`, `brands.carCount` e `catalog_meta` (total e anos). Propaga mudanças de título, marca, série e imagem para `cars.*Name/*Title` e `collection_items.car*`, com `updateRows` em lote por query. A agenda diária é a rede de segurança: faz a recontagem completa, que também corrige o caso de carro que mudou de série (o evento não traz a série antiga) |
| `user-cleanup` | evento `users.*.delete` | apaga `collection_items` e `user_stats` do usuário removido |
| `stats-repair` | manual | reconta `user_stats` de um usuário ou de todos a partir de `collection_items` |

Desnormalização só muda quando o **portal** edita o catálogo (fase 3). Enquanto isso, a migração grava tudo consistente.

## 7. Auth

- **E-mail e senha**, cadastro pelo app:
  1. `account.create(ID.unique(), email, password, name)`;
  2. em seguida `account.createEmailPasswordSession`.
- **Nome:** fica no próprio usuário do Auth (`name`). Não há tabela `users`.
- Senha mínima de 8 caracteres (padrão do Appwrite). Sugestão: ligar o dicionário de senhas fracas.

Mapeamento do tipo `User` do app:

| Campo `User` | Fonte no Appwrite |
|---|---|
| `id`, `name`, `email` | `account.get()` |
| `role` | `"ADMIN"` se o usuário estiver no time `admins`, senão `"COLLECTOR"`. O app não precisa disso; ele usa `"COLLECTOR"` |
| `status` | `status` do Auth (true → `active`, false → `blocked`) |
| `expo_push_token` | `prefs.expoPushToken` (`account.updatePrefs`) |

- **Editar perfil:**
  - nome: `account.updateName`;
  - e-mail: `account.updateEmail(email, password)`. **O Appwrite exige a senha atual** para trocar o e-mail (contrato, §9).
- **Sessão:** o `react-native-appwrite` persiste sozinho. A splash chama `account.get()`: 401 manda para o Login.
- **Plataformas no Appwrite:**

  | Uso | Plataforma | Identificador |
  |---|---|---|
  | Expo Go (testes) | Android | `host.exp.exponent` |
  | Expo Go (testes) | iOS | `host.exp.Exponent` |
  | build próprio (depois) | — | `bundleIdentifier`/`package` definidos |

  O `app.json` ainda não define `bundleIdentifier`/`package`.
- **Limites de taxa** do Appwrite (login e cadastro por IP/e-mail) ficam no padrão.

## 8. Paginação no app

- **Cursor sempre:** `Query.limit(20)` + `Query.cursorAfter(<$id do último>)`, com **a mesma ordenação** em todas as páginas. O cursor não degrada como o offset e não repete nem pula itens quando a coleção muda entre páginas.
- **Contagem só na primeira página:** as páginas seguintes passam `total: false` (parâmetro do 1.8), que evita o `COUNT` por página.
- **Catálogo sem filtro:** o total vem de `catalog_meta.totalCars` (limite de 5.000, §3.6).
- **`Query.select`** traz só as colunas do card nas grids (sem `description`).
- **Listas pequenas e estáveis** (marcas, séries, atributos, `catalog_meta`): uma chamada cada (`limit` 500), cache em memória na sessão. Opcional: `ttl` do 1.8 para cache no servidor.
- **Quantidade nos corações:** uma consulta por página visível, `userId` + `Query.equal("carId", [ids da página])`. Nunca a coleção inteira.

## 9. Contrato dos services (`src/services/*`)

> **Status: acordado com o Forja em 23/09/2026.**

Acordos de implementação (Forja):

- **UI otimista:** o `useCollectionStore` atualiza `items` e `summary` antes da chamada e reverte no `catch`. O `{ item, summary }` da Function só confirma e corrige divergência; não trava a UI.
- **Quantidades:** `getCollectionQuantities` serve só às grids de Home, Busca e Detalhe. A tela Coleção usa `getCollectionPaged`. O store guarda um cache de quantidades por `carId` e `carsById` sob demanda; o `summary` vem das mutações.
- **Sessão expirada:** `ServiceError` com `unauthorized` chama um `onUnauthorized()` injetado nos services, que faz `silentlySignOut()`. O `AuthGate` do `_layout` raiz redireciona para `/login`.
- **Imagens:**
  - Usar `storage.getFilePreviewURL(...)`, que devolve `URL` e é chamado com `.toString()`. No 0.24.1, `getFilePreview` **baixa os bytes** (`Promise<ArrayBuffer>`) e não serve para `<Image>`.
  - Passar **só a largura** (altura 0), para manter a proporção original sem recorte. Quem enquadra é o card (`contentFit`).
  - Thumb: `getFilePreviewURL("car-images", fileId, 400, 0, undefined, 75, undefined, undefined, undefined, undefined, undefined, undefined, ImageFormat.Webp)`. Full: igual, com `1080` e `85`. Os parâmetros precisam ser idênticos aos da migração, que aquece o cache.


Regras gerais:

- `react-native-appwrite` 0.24.1 fixo.
- O tipo `Car` não muda: o service monta `imagemThumb`/`imagemFull` como URLs de preview a partir de `imageFileId`.
- Paginação por cursor.
- **`userId` sai dos argumentos da coleção**: o servidor usa a sessão.
- Falha de rede ou sessão expirada lança `ServiceError { code: "unauthorized" | "network" | "unknown" }`. Em `unauthorized`, o app volta para o Login.

### `auth.ts`

| Função | Contrato |
|---|---|
| `signIn(email, password)` | `SignInResult`. Erros: `invalid_credentials` \| `rate_limited` \| `network` \| `unknown` |
| **`signUp({ name, email, password })`** | `{ ok: true; user }` \| `{ ok: false; error: "email_in_use" \| "weak_password" \| "invalid_email" \| "rate_limited" \| "network" \| "unknown" }`. Já cria a sessão |
| **`changePassword(currentPassword, newPassword)`** (novo, fase 2 — tela "Alterar senha" do Perfil, `07-perfil.md` §3.1) | `{ ok: true }` \| `{ ok: false; error: "wrong_password" \| "weak_password" \| "rate_limited" \| "network" \| "unknown" }`. **A sessão continua aberta** no sucesso. Mapeia `account.updatePassword(newPassword, oldPassword)`: 401 → `wrong_password` (mostra no campo Senha atual e limpa), 400 → `weak_password` (mostra no campo Nova senha), 429 → `rate_limited` (banner), outros → `unknown` (banner). Validação local antes: `newPassword.length >= 8`. |
| `signOut()`, `getCurrentUser()` (401 → `null`), `getSession()` | mantidos |
| `getDemoCredentials` | **removido** |

### `users.ts`

| Função | Contrato |
|---|---|
| `updateProfile({ name, email, password? })` | `password` é obrigatório quando o e-mail muda. Erros: `password_required` \| `invalid_password` \| `email_in_use` \| `unknown` |

### `catalog.ts`

| Função | Contrato |
|---|---|
| `listCarsPaged({ ...CarFilters, cursor?, pageSize = 20 })` | `{ items: CarListItem[]; total: number \| null; nextCursor: string \| null }`. `total` só na primeira página |
| `listBySeriePaged(serieId, { excludeId?, cursor?, pageSize = 10 })` | mesmo formato, ordenado por `seriePositionNum` |
| `countCars(filters)`, `listYears()`, `getCarById(id)`, `listBrands()` (sem `em_analise`), `listAttributes()` | mantidos |
| `listSeries({ featured? })` | `Serie[]`. `Serie` ganha `carCount: number` |
| `listCars`, `listBySerie`, `listFeaturedSeries`, `getSeriesCarCount` | **removidos** (não paginados; usar `serie.carCount`) |

### `collection.ts`

| Função | Contrato |
|---|---|
| **`getCollectionPaged({ q?, duplicatesOnly?, cursor?, pageSize = 20 })`** (novo) | `{ items: CollectionItemWithCar[]; total: number \| null; nextCursor: string \| null }`. `car` montado dos campos desnormalizados (`description = ""`) |
| `getCollectionSummary()` | `CollectionSummary`, lido de `user_stats` (zeros se a linha ainda não existe) |
| **`getCollectionQuantities(carIds)`** (novo) | `Record<string, number>`. Uma consulta por página da grid, para os corações |
| `getCollectionQuantity(carId)` | mantido |
| `addToCollection(carId)`, `setCollectionQuantity(carId, qty)`, `removeFromCollection(carId)` | `{ item: CollectionItem \| null; summary: CollectionSummary }`, via Function `collection` |
| `getCollection` | **removido**. O `useCollectionStore` passa a guardar um cache de quantidades por `carId` |

## 10. Plano de migração (origem somente leitura)

### Acesso

| Item | Valor | Situação |
|---|---|---|
| Postgres | host e porta em `backend/.env.local` (fora do git), banco `tosave`, schema `public` | Leitura pelo `usuario_readonly` (GRANT SELECT), sempre com `default_transaction_read_only=on`. O inventário inicial foi feito com o `postgres`, antes da troca pedida pelo usuário |
| RustFS (S3) | `https://tosave-rustfs.8m5sgi.easypanel.host`, bucket `tosave`, prefixo `cars/`, path-style | Só `ListBuckets`/`ListObjectsV2`/`GetObject`. A primeira listagem funcionou (3.896 objetos). **Na segunda, a mesma chave viu zero buckets** (`NoSuchBucket`) |

### Script `backend/scripts/migrate.mjs`

Fases independentes: `--phase=brands|attributes|series|cars|images|meta|verify|all`, com `--dry-run`.

| Fase | O que faz |
|---|---|
| **brands** | `SELECT DISTINCT brand` → 4 linhas com `$id` slug (`hot-wheels`, `matchbox`, `others`, `maisto`), `state=ativa` |
| **attributes** | 7 linhas, `$id` = uuid |
| **series** | 357 linhas, `$id` = uuid; `picture` vazio → `imageFileId` null |
| **cars** | Em lotes de 100 ordenados por `id`: monta a linha (§3.1), junta `attributeIds` de `car_attributes`, resolve `brandName`/`serieTitle` e grava com **`upsertRows`** (idempotente pelo `$id`). `imageFileId` só é preenchido quando a fase images confirma o arquivo |
| **images** | Para cada carro com `imagem_full`: `fileId` = uuid sem hífens. Se o arquivo já existe no bucket, pula. Senão lê o objeto do RustFS (`imagem_full` sem `/tosave/`), faz `createFile`, grava `imageFileId` no carro e aquece as duas prévias. Concorrência 4. Ausente no RustFS → relatório (ver Q1) |
| **meta** | `catalog_meta` (total, anos), `series.carCount` e `brands.carCount` |
| **verify** | Compara contagens origem × destino (carros, séries, atributos, carros com imagem), confere 50 carros sorteados campo a campo e lista divergências |

- **Retomável:** cada fase grava progresso em `backend/.state/migration.json` (último `id` processado, contadores, falhas). O `.gitignore` ganha `backend/.state/`. Rodar de novo continua de onde parou. Como tudo é upsert com ID determinístico, repetir também é seguro.
- **Delta antes da virada:** `--since=<data>` reprocessa só carros com `updated_at` maior que a última execução.
- **Relatórios:** `backend/.state/report-*.csv`, com carros sem imagem, `toy` vazio ou duplicado e falhas de upload.
- **Nada** na origem é alterado. Nenhum SQL além de `SELECT`, e nenhuma chamada S3 além de list/get.

## 11. Ordem de execução (depois da aprovação)

1. Criar database, tabelas, índices, bucket `car-images` e time `admins` com `npm run schema` (idempotente, só cria ou atualiza; nunca apaga).
2. Deploy das Functions.
3. Plataformas Expo Go.
4. Migração: `--dry-run` e depois `all`.
5. `verify`.
6. O Forja liga o app.

## 12. Perguntas em aberto para o usuário

1. **Imagens faltando:** o RustFS listou ~1.950 imagens, mas 10.234 carros apontam para uma. Para os carros sem arquivo:
   - (a) ficam sem imagem (palco vazio); ou
   - (b) a migração baixa de `imagem_url_original` (wiki Fandom), o que envolve direitos de uso das imagens.

   Ou as imagens estão em outro bucket/servidor?
2. **Acessos à origem:**
   - A senha do `usuario_readonly` na nota falha na autenticação: confirmar a senha e o `pg_hba` para o IP de onde rodo.
   - A chave do RustFS deixou de enxergar o bucket `tosave` entre duas listagens. As chaves ou as políticas mudaram? O que preciso: `ListBucket` + `GetObject` em `tosave/cars/*`.
3. **Leitura das imagens:**
   - Recomendado: `read("any")` no bucket `car-images`, com URLs estáveis, cache do `expo-image` e sem precisar mandar a sessão em cada `<Image>`. Os dados do catálogo continuam só para autenticados.
   - Alternativa: só autenticados, o que obriga o app a enviar headers de sessão/JWT em cada imagem.
4. **Cores:** `color_model` está em inglês (`blue`, `red`…). Traduzir para português na migração, com mapa fixo e revisão sua?
5. **Bucket `cars` existente** (vazio, id aleatório): deixar como está e criar `car-images`, reaproveitar, ou apagar? Apagar depende de autorização.
6. **E-mail:** o Appwrite tem SMTP configurado?
   - Sem SMTP não há recuperação de senha nem verificação de e-mail.
   - Exigir e-mail verificado no cadastro agora, ou depois?
7. **Marcas:** as 4 (Hot Wheels, MatchBox, Others, Maisto) entram como `ativa`? "Others" deve aparecer como marca? Grafia "MatchBox" ou "Matchbox"?
8. **`toy` não é único na origem** (códigos repetidos e 8 vazios): aceitar assim (índice comum) e o portal trata depois?
9. **Autorização da etapa 2:** a ordem é a do §11 (schema, Functions, plataformas Expo Go, migração). Todas as operações só criam ou atualizam.

## 13. Estado da implantação (23/09/2026, etapa 2)

### No ar

| Recurso | Situação |
|---|---|
| Database `tosave` | 8 tabelas (§3) com colunas, índices e permissões |
| Bucket `car-images` | leitura pública (`read("any")`, decisão do usuário); escrita só do time `admins`; 10 MB; jpg/jpeg/png/webp; sem compressão, criptografia ou antivírus |
| Time `admins` | criado; 1 membro (a conta importada) |
| Functions | `collection`, `catalog-sync` (eventos + agenda 04:00) e `user-cleanup`, todas em `node-16.0` |

O bucket `cars`, que já existia, **não foi tocado**.

Detalhe das Functions: elas falam com o Appwrite pelo endpoint público (`TOSAVE_ENDPOINT`). O endpoint interno `http` é redirecionado para `https`, e o cliente do Node 16 não segue essa troca.

### Scripts (`backend/`, todos idempotentes)

| Comando | Faz |
|---|---|
| `npm run check` / `probe-scopes` / `inspect-source` / `survey-collections` | inspeção, só leitura |
| `npm run schema` | cria o que falta no schema; nunca apaga |
| `npm run deploy-functions [-- <id>]` | cria/atualiza as Functions e publica o código |
| `npm run migrate -- --phase=all [--restart] [--dry-run]` | migração do catálogo, com checkpoint em `.state/migration.json` |
| `npm run import-user -- --role=admin --admin-team` | importa a conta escolhida e a coleção dela |
| `npm run validate` | validação ponta a ponta; apaga os usuários de teste que ela mesma cria |

`backend/.state/` (checkpoints, relatórios, pacotes de deploy) está no `.gitignore`.

### Números da migração do catálogo (conferidos com a origem)

| Item | Origem | Appwrite |
|---|---|---|
| Carros | 10.655 | 10.655 |
| Séries | 357 | 357 |
| Atributos | 7 | 7 |
| Marcas | 4 | 4 |
| Ligações carro↔atributo | 995 | 995 |
| Carros com caminho de foto (`sourceImagePath`) | 10.234 | 10.234 |

- **Amostra de 50 carros:** 50 conferem campo a campo.
- **`catalog_meta`:** 10.655 carros, 28 anos (1999–2026).
- **`carCount`:** conferido por série e por marca.

**Limpeza aplicada na migração:**

- Espaços invisíveis (U+200B) removidos. Vinham colados em posições como `8/10​`.
- `seriePosition` só é aceita no formato `N/M`. Os 319 valores fora desse formato (como `xyz`) ficam nulos e vão para o relatório de avisos.
- Cores traduzidas para português pelas regras de `lib/colors.mjs`: hex e nomes próprios de pintura ficam como estão; nomes de série no campo de cor viram vazio. O mapeamento completo está em `.state/report-cores.csv`, para revisão.

**Relatórios:** `.state/report-cores.csv`, `report-carros-avisos.csv` (toy vazio, sem foto na origem, posição inválida) e `report-verificacao.csv`.

### Conta migrada (decisão do usuário: só a dele)

- **Conta:** 1 usuário (role `admin` na origem), com o mesmo uuid, e-mail, nome e **hash bcrypt original** (`users.createBcryptUser`), membro do time `admins`.
- **Hash:** o prefixo `$2b$` foi validado antes com um usuário de teste (login OK, usuário apagado). **A contingência (`$2a$` ou senha) não foi usada.**
- **Coleção:** 375 modelos, 379 unidades e 4 repetidos em `collection_items`. O `user_stats` foi recalculado e **confere com a origem**.
- **Demais usuários:** os outros 7 usuários da origem não migraram.

### Pendente de ação manual no console do Appwrite

1. ~~Settings → Services: ligar `Account` e `Functions`~~ **Feito pelo usuário.** Validado em 23/09/2026. `Locale` segue desligado, e o app não usa.
2. **Plataformas (ainda faltam; conferido pelo erro `general_unknown_origin` no login com essas origens):** adicionar Android `host.exp.exponent` e iOS `host.exp.Exponent` (Expo Go). O `app.json` ainda não define `bundleIdentifier`/`package`: quando definir, adicionar também. A API key não tem os scopes `platforms.*`/`projects.*`.
3. **Auth:** e-mail/senha já vem ligado por padrão e o cadastro é aberto. Não há SMTP (decisão: configurar antes de publicar nas lojas).
4. **Runtime:** habilitar `node-22` em `_APP_FUNCTIONS_RUNTIMES` no VPS e trocar `FUNCTIONS_RUNTIME` no deploy. O node-16 já está fora de suporte.

**Validação completa (`npm run validate`, 23/09/2026): 18/18 OK.** Cobre bcrypt `$2b$`, cadastro, login no cliente, catálogo por cursor, `catalog_meta`, busca, `series.carCount`, `add`/`add`/`set 99`/`remove` pela Function (~350 ms quente), `user_stats`, bloqueio de escrita direta e `user-cleanup`. Os usuários de teste foram apagados.

A API key continua sem `projects.*`/`platforms.*`, mesmo com todos os scopes liberados: esses scopes só existem para a sessão do console.

### Fotos (parte 2, a partir da pasta local do usuário)

Script `upload-images.mjs` (a escrever quando a pasta estiver disponível):

1. **Indexa a pasta:** percorre a pasta local recursivamente, indexa pelo nome do arquivo e ignora `*_thumb.jpg`, porque os thumbs saem do `getFilePreview`.
2. **Casa com o carro:** o nome do arquivo é comparado com o nome em `cars.sourceImagePath` (`/tosave/cars/<hash>_<nome>.jpg`). Se houver ambiguidade, usa o caminho relativo `cars/<arquivo>`.
3. **Sobe e vincula:** `fileId` = uuid do carro sem hífens (o 409 indica que já existe, então pula) → `createFile` no `car-images` → `imageFileId` no carro. A `catalog-sync` propaga o vínculo para `collection_items.carImageFileId`.
4. **Aquece o cache:** chama as prévias de 400 e 1080 px, com os mesmos parâmetros do app.
5. **Retoma e reporta:** checkpoint e relatório dos carros sem arquivo e dos arquivos sem carro.
