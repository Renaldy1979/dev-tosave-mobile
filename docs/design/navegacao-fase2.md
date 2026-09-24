# Navegação da fase 2: inventário do app atual e proposta

> Autora: Aquarela (Designer UI/UX) · 23/09/2026 · análise e docs, sem código.
> Referência: app atual do usuário, `github.com/Renaldy1979/TOSAVE-MOBILE` (commit `6f33042 versão 2.0`), clonado só para leitura em `C:/Dev/referencia/TOSAVE-MOBILE`.
> Critério enxuto: nenhuma animação nova; tudo aqui é estrutura, telas e dados.

Resumo:
- O app atual é navegado por **drawer** (menu lateral) com 7 destinos, mais 5 telas de stack.
- O app novo tem **4 abas** e o layout que o usuário prefere.
- A proposta é **5 abas** (Início · Buscar · Coleção · Trocas · Perfil). O que não cabe nelas entra como **atalho contextual** na Home, na Coleção e no Perfil.
- Não há aba "Mais" nem drawer.

---

## 1. Inventário do app atual

Stack técnico do app atual:
- Expo 54, expo-router 6 com `Drawer`, NativeWind, React Query, axios contra uma API REST própria (`/auth`, `/cars`, `/collection`…).
- Push com expo-notifications + Firebase.
- Imagens de perfil no DigitalOcean Spaces.

**Legenda da coluna "App novo":**
- ✅ já existe (fases 1/2 especificadas)
- 🟡 existe em parte
- ❌ falta
- 🛠 admin/portal (não entra no app)

### 1.1 Telas e rotas

| # | Rota (app atual) | Como se chega | O que faz | Dados / endpoints | App novo |
|---|---|---|---|---|---|
| 1 | `index.tsx` | abertura | Redireciona para a Home (logado) ou para o login | sessão (SecureStore: `token`, `refresh_token`) | ✅ splash + guarda de sessão |
| 2 | `(auth)/signin` | sem sessão | **Login e cadastro na mesma tela** (alterna o modo). Cadastro: nome, e-mail, senha **e confirmação**. Erros em modal. Sem "Esqueci a senha". | `POST /auth/signin`, `POST /auth/signup`, refresh `POST /auth/refresh-mobile` | ✅ `02-login` + `08-cadastro` (sem confirmação, por decisão do usuário) |
| 3 | `(drawer)/home` "Home" | drawer | **Catálogo inteiro** em grid de 2 colunas com busca por nome/código, filtros (ano, série, atributos) em modal, total listado, "carregar mais". Cada card tem Ver detalhes, Adicionar e Remover (com modal de confirmação). | `GET /cars?page&limit&name&year&serie&attributeId&userId` (devolve `hasCar`, `quantity`), `GET /filters` | ✅ Home + Busca (o app novo separa vitrine e busca) |
| 4 | `(drawer)/series` "Séries" | drawer | Lista **todas** as séries (imagem, nome, nº de carros, `isDefault`). O card **não é tocável**. | `GET /series` → `{ id, name, picture, carCount, isDefault }` | 🟡 a Home tem só as séries **em destaque**; falta a lista completa |
| 5 | `(drawer)/collections` "Coleção" | drawer | A mesma lista da Home, restrita à coleção do usuário, com filtros do usuário e filtro **repetidos** | `GET /collection?…&repeat`, `GET /filters/{userId}` | ✅ Coleção (resumo, busca, Todos/Repetidos, stepper) |
| 6 | `(drawer)/trade` "Clube de Troca" | drawer | Vitrine pública de **anúncios de troca ou venda** entre colecionadores: foto, série, tipo (TROCA/VENDA), preço, carros desejados, descrição. Contato pelo **WhatsApp** do anunciante. O dono pode "Finalizar" o anúncio. | `GET /trade/public`, `PUT /trade/{id}/complete` | ❌ |
| 7 | `trade/new-trade` "Nova oferta" | botão "Troca / Venda" no detalhe (só se o carro está na coleção) | Cria um anúncio: tipo Troca ou Venda; na venda, preço em R$; na troca, busca **carros desejados** (multi) + descrição | `POST /trade` `{ car_id, type, price, desired_car_ids[], description, status }` | ❌ |
| 8 | `(drawer)/news` "Notícias e Novidades" | drawer | Lista de **notícias** (título, imagem, data) publicadas pela equipe + lista de **"últimas miniaturas atualizadas"** | `GET /news`, `GET /cars/last-updates` | ❌ |
| 9 | `(drawer)/stats` "Estatísticas" | drawer | **Placeholder** (só o texto "Ola"). O service já existe e traz total, coleções, **faltantes**, **% da coleção**, por ano e por série. | `GET /collection/stats/{userId}` → `{ totalCars, collections, missingCars, percentageOwned, byYear[], bySerie[] }` | 🟡 a Coleção e o Perfil têm itens, modelos e repetidos; faltam "faltantes", "%" e os recortes por série e ano |
| 10 | `(drawer)/garage` "Garagem" | drawer | Lista **"Minhas garagens"**: cada garagem tem nome, **"Para: {amigo}"**, nº de modelos separados e status (`OPEN`/`SENT`/`RECEIVED`). Parece um **lote de miniaturas separadas para entregar a outra pessoa**. | `GET /garagens` | ❌ (conceito a confirmar com o usuário, ver §1.3) |
| 11 | `garagem/[id]` | toque numa garagem | Itens da garagem (nome, ano, "adicionado há…"). O botão "Adicionar mais Minis" **não faz nada** (sem handler). | `GET /garagens/{id}`, services `POST /garagens/{id}/items` e `DELETE /garagens/items/{itemId}` existem, mas a tela não usa | ❌ |
| 12 | `details/[carId]` "Detalhes" | card do catálogo ou da coleção | Detalhe: imagem, nome, descrição com "ler mais", série, código, ano, marca, atributos, **controle de quantidade**; com o carro na coleção, botão **"Troca / Venda"** → Nova oferta | `GET /cars/{id}`, `POST /collection/add`, `DELETE /collection/del/{user}/{car}` | ✅ Detalhe (+ galeria, ficha, compartilhar); ❌ atalho "Anunciar" |
| 13 | `notifications/notifications` | **sino** no header, com contador de não lidas | Caixa de **notificações**: tipos "Oferta" (massiva), "Aviso" (individual), sistema; marcar como lida e marcar todas. O toque no push abre o app na rota do payload. | `GET /notifications`, `POST /notifications/{id}/read`, `PATCH /notifications/read-all`, `POST /auth/update-push-token` | ❌ |
| 14 | `profile/profile` "Meu perfil" | só pelo `menu-data-mobile` (não aparece no drawer) | **Placeholder** (texto "Perfil"). Os services já existem: nome, **foto** (upload ao Spaces, remover), **telefone** (usado no WhatsApp das trocas). | `PUT /users/{id}`, `PUT /users/updateprofilepicture` | 🟡 o Perfil novo tem nome, e-mail, tema, sair e alterar senha; foto fica para fase futura; **telefone não existe** |

### 1.2 Funcionalidades transversais

| Funcionalidade | App atual | App novo |
|---|---|---|
| Header com logo, título e **sino de notificações** | sim, em todas as telas do drawer | ❌ não há sino (a Home tem logo e avatar) |
| Menu lateral com **foto e nome** do usuário | sim | ❌ substituído por abas; foto é fase futura |
| Busca por nome e código, filtros ano/série/atributos | sim (modal) | ✅ Busca + FilterSheet (+ marca) |
| Adicionar e remover da coleção, quantidade | sim (modal de confirmação no card) | ✅ coração + stepper + ConfirmDialog |
| Filtro "repetidos" | sim | ✅ |
| Compartilhar carro pelo WhatsApp | não (só o contato do anunciante da troca) | ✅ |
| Galeria de fotos do carro | não (1 imagem) | ✅ |
| Push notifications (Expo + FCM) | sim | ❌ |
| Tema claro/escuro | não (só escuro) | ✅ |
| Sessão com refresh token e logout forçado | sim (JWT próprio) | ✅ pelo Appwrite (sessão + `401` → Login) |

### 1.3 O que é admin/portal (não entra no app)

| Item no app atual | Por que é admin | Destino |
|---|---|---|
| `createCar` (`POST /cars`) em `carServices` | cadastro de catálogo | portal web (pausado) |
| Publicação de **notícias** (`news.published_by`, `visibled`) | conteúdo editorial | portal web; o app **só lê** |
| Notificações **massivas** (`type: "MASSIVE"`) | disparo para todos | portal web / Function; o app **só recebe e lê** |
| `imagem_check` no carro | curadoria de imagem | portal web |
| `role: "admin"` no menu | o app nunca mostra nada de admin (regra do projeto) | — |
| Garagem `type: "MASSIVE"` | provavelmente criada pela equipe para vários usuários | **a confirmar** com o usuário |

**Dúvida para o usuário: o que é a "Garagem"?** Pelo código, é um lote nomeado de miniaturas "separadas para" outra pessoa, com status aberto, enviado e recebido. Pode ser (a) separação para **entrega ou venda a um amigo**, (b) uma **wishlist compartilhada** ou (c) algo da loja. A tela de itens não deixa adicionar nada, e nenhum ponto do app cria garagem. Sem essa resposta, a Garagem fica fora da proposta de abas e entra só como item do Perfil (§2.3).

### 1.4 Resumo do inventário

| Situação | Itens |
|---|---|
| ✅ já coberto pelo app novo | login, cadastro, catálogo/Home, busca e filtros, coleção + repetidos, detalhe + quantidade, sessão |
| 🟡 parcial | Séries (só destaque), Estatísticas (só 3 números), Perfil (sem foto e sem telefone) |
| ❌ falta | **Clube de Troca** (vitrine + nova oferta + finalizar + contato WhatsApp), **Notícias/Novidades**, **Notificações** (caixa + push + sino), **Garagem**, lista completa de **Séries**, **Estatísticas** completas |
| 🛠 fora do app | cadastro de carros, publicação de notícias, disparo massivo, curadoria de imagem, papel admin |

---

## 2. Proposta de navegação para o app novo

### 2.1 Princípios
1. **Abas só para o que é frequente e de primeiro nível.** No máximo 5, que é o limite do iOS e do Material. Hoje o drawer esconde 7 destinos atrás de um toque extra, e o usuário prefere o layout do app novo, que é por abas.
2. **Sem aba "Mais".** Uma aba "Mais" vira gaveta de coisas soltas e repete o problema do drawer. O resto vai para **onde o usuário já está pensando no assunto** (atalhos contextuais).
3. **Identidade mantida:**
   - TabBar ink, logo na Home, cards médios com imagem dominante;
   - Saira itálica nos números;
   - laranja para ação, vermelho para coleção e destaque;
   - tudo com os componentes que já existem (`Header`, `SectionHeader`, `ListRow`, `StatTile`, `EmptyState`, `BottomSheet`).
4. **Nada de admin no app.**

### 2.2 Abas (5)

| Aba | Ícone | Conteúdo | Por que é aba |
|---|---|---|---|
| **Início** | `Home` | vitrine: séries em destaque, **Novidades** (nova faixa), grid do catálogo; **sino** no header | ponto de entrada diário |
| **Buscar** | `Search` | busca + filtros (como hoje) | ação mais usada no catálogo de ~10 mil carros |
| **Coleção** | `Heart` | a coleção + resumo; atalho **"Estatísticas"** | o coração do produto |
| **Trocas** | `Repeat2` | **Clube de Troca**: vitrine de anúncios + "Meus anúncios" | é uma área social inteira, com lista, filtros e criação; fica escondida demais se for só um atalho |
| **Perfil** | `User` | conta, tema, senha + hub pessoal: **Minhas garagens**, **Notificações** (preferências), **Estatísticas** | tudo que é "meu" e pouco frequente |

**Alternativa B (4 abas):** Trocas vira atalho na Home (faixa "Clube de Troca") e no Perfil ("Meus anúncios"). Economiza uma aba, mas enterra a única função **social** do app. **Recomendo a opção A (5 abas).** Escolha B só se o Clube de Troca for pouco usado hoje; o usuário sabe dizer.

### 2.3 Onde fica cada funcionalidade

| Funcionalidade | Onde entra | Forma |
|---|---|---|
| Séries (lista completa) | Home → "Séries em destaque" → **"Ver tudo"** | tela de stack `/series` (grid de SeriesCard, **tocável** → Busca filtrada pela série). Substitui o `?open=serie` do "Ver tudo". |
| Notícias / Novidades | Home → nova faixa **"Novidades"** (cards de notícia) + "Ver tudo" | stack `/novidades` com notícias e "Últimas miniaturas atualizadas" (CarCard `row`) |
| Notificações | **sino** no header ink da Home, com `Badge count` de não lidas | stack `/notificacoes`: lista com lida/não lida, "Marcar todas como lidas" |
| Estatísticas | Coleção → resumo (StatTiles) → **"Ver estatísticas"**; Perfil → StatTiles tocáveis | stack `/estatisticas`: total, faltantes, % da coleção, **progresso por série** (barra) e por ano |
| Clube de Troca | aba **Trocas** | vitrine (grid) + segmento **Todos / Meus anúncios**; card → detalhe do anúncio (contato WhatsApp) |
| Nova oferta | Detalhe do carro (se está na coleção) → **"Anunciar para troca ou venda"**; Trocas → botão "Novo anúncio" (escolhe da coleção) | stack `/trocas/novo` |
| Finalizar anúncio | detalhe do anúncio (só o dono) | Dialog de confirmação |
| Garagem | Perfil → **"Minhas garagens"** (ListRow) | stack `/garagens` e `/garagens/[id]`; **depende da resposta do §1.3** |
| Foto de perfil, telefone | Perfil → "Editar perfil" | campos novos no sheet (fase futura já prevista; o **telefone** passa a ser necessário se o Clube de Troca entrar) |

### 2.4 Mapa ASCII

```
                    ┌──────────────── (tabs) · TabBar ink · 5 abas ────────────────┐
                    │  Início     Buscar     Coleção      Trocas        Perfil       │
                    └────┬──────────┬──────────┬────────────┬──────────────┬───────┘
                         │          │          │            │              │
  Início ────────────────┤          │          │            │              │
   header: logo · 🔔(n) ─┼──▶ /notificacoes                 │              │
   Séries em destaque ───┼──▶ "Ver tudo" ──▶ /series ──▶ Busca?serie=…     │
   Novidades ────────────┼──▶ "Ver tudo" ──▶ /novidades                    │
   grid de carros ───────┼──▶ /car/[id]                                    │
                         │                                                 │
  Buscar ── resultados ──┴──▶ /car/[id]                                    │
                                                                           │
  Coleção ── resumo ── "Ver estatísticas" ──▶ /estatisticas                │
          └─ card ──▶ /car/[id]                                            │
                                                                           │
  /car/[id] ── (na coleção) "Anunciar para troca ou venda" ──▶ /trocas/novo
                                                                           │
  Trocas ── [Todos | Meus anúncios] ── card ──▶ /trocas/[id] ── WhatsApp do anunciante
        │                                         └─ (dono) "Finalizar anúncio" → Dialog
        └─ "Novo anúncio" ──▶ escolher carro da coleção ──▶ /trocas/novo   │
                                                                           │
  Perfil ── identidade · StatTiles ──▶ /estatisticas ◀────────────────────┘
        ├─ Aparência (tema)
        ├─ MEU TOSAVE
        │   ├─ Minhas garagens ──▶ /garagens ──▶ /garagens/[id]   (a confirmar)
        │   ├─ Meus anúncios   ──▶ aba Trocas, segmento "Meus anúncios"
        │   └─ Notificações    ──▶ /notificacoes
        ├─ CONTA: E-mail · Alterar senha · (futuro) Excluir conta
        └─ Sair ──▶ /login

  Sem sessão: splash ──▶ /login ⇄ /cadastro (ver README.md)
```

### 2.5 Justificativa
- **Descoberta:** as 7 entradas do drawer viram 5 abas visíveis mais 4 atalhos contextuais, e nenhum destino fica a mais de 2 toques.
- **Contexto:** estatísticas nascem da Coleção, notícias e séries da vitrine, anúncios do carro que o usuário tem. O atalho aparece quando faz sentido, e não numa lista genérica.
- **Uma mão:** abas ficam na base, ao alcance do polegar (DS §1, princípio 4); o drawer abre no topo esquerdo.
- **Consistência:** não surge nenhum padrão novo de navegação. Tudo é aba, stack ou sheet que o app já tem.
- **Custo de implementação:** as telas novas são listas e fichas com os componentes existentes. As únicas peças de UI novas são o **sino com contador** (IconButton + `Badge count`), a **barra de progresso** das estatísticas e o **card de anúncio**.

### 2.6 Impacto nos documentos existentes (quando aprovado)
- `componentes.md` §6 TabBar: 5 itens; §7 HomeHeader: sino no lugar do avatar (o avatar migra para o Perfil) ou os dois lado a lado.
- `03-home.md`: faixa "Novidades"; "Ver tudo" das séries vai para `/series`.
- `06-colecao.md`: link "Ver estatísticas".
- `07-perfil.md`: grupo "MEU TOSAVE".
- Specs novas: `10-trocas.md`, `11-novidades.md`, `12-notificacoes.md`, `13-estatisticas.md`, `14-series.md`, `15-garagens.md` (se confirmada). O número 09 ficou com o menu.

> **Decisão do usuário (24/09/2026):** as abas saem e entra um **menu hambúrguer (drawer)**. Ver `telas/09-menu-drawer.md`. As funcionalidades desta análise entram como **itens do menu** quando existirem, e não como abas nem atalhos. As §2.2 (5 abas) e §2.4 (mapa) ficam como histórico; os atalhos contextuais da §2.3 continuam válidos como complemento.

---

## 3. Backend novo para o Alicerce avaliar

Base: Appwrite 1.8.1 (Auth, TablesDB, Storage, Functions, Messaging). Esta seção **não define contrato**: é a lista do que as telas propostas precisariam. O Alicerce e o Forja decidem a forma.

| # | Funcionalidade | Precisa de | Observações |
|---|---|---|---|
| B1 | **Séries completas** com contagem | `series.carCount` (coluna mantida por Function ou contagem no servidor) | ~10 mil carros: não contar no app |
| B2 | **Novidades: notícias** | tabela `news` (título, conteúdo, imagem, link, visível, publicada em) + bucket `news` no Storage | escrita só pelo portal/admin; leitura para usuários autenticados |
| B3 | **Novidades: últimas atualizadas** | query por `$updatedAt` desc em `cars` (índice) | sem tabela nova |
| B4 | **Notificações (caixa)** | tabelas `notifications` (título, corpo, tipo individual/massiva, alvo, dados/rota, expira em) e `notification_reads` (usuário, notificação, lida em); contagem de não lidas no servidor | massiva sem copiar uma linha por usuário: usar `notification_reads` para o estado de leitura |
| B5 | **Push** | Appwrite **Messaging** com provider FCM/APNs + `account.createPushTarget`, ou uma Function que chama o Expo Push | decisão técnica do Alicerce; o app atual usa Expo Push + FCM (`google-services.json`) |
| B6 | **Estatísticas** | agregados por usuário: total, modelos, repetidos, **faltantes**, **% da coleção**, **por série** (possui/total) e **por ano** | a especificação já diz "estatísticas mantidas no servidor"; faltantes por série exige o total de carros por série (B1) |
| B7 | **Clube de Troca** | tabela `trade_listings` (carro, dono, tipo TROCA/VENDA, preço, descrição, status ATIVO/FINALIZADO, criado em) + `trade_desired_cars` (anúncio, carro) | permissões: leitura para autenticados, escrita e finalização só do dono; validar no servidor que o carro está na coleção do dono (Function ou regra) |
| B8 | **Contato da troca** | **telefone** do anunciante (perfil) | dado pessoal exposto a outros usuários: exige consentimento explícito ("mostrar meu WhatsApp nos anúncios"), a avaliar com o usuário |
| B9 | **Garagens** | tabelas `garages` (nome, dono, tipo, usuário-alvo, status) + `garage_items`; busca do usuário-alvo por e-mail via **Function** (clientes não listam usuários no Appwrite) | só depois de confirmar o conceito (§1.3) |
| B10 | **Foto de perfil** | bucket `avatars` (permissão só do dono para escrever, leitura para autenticados) + referência no perfil | já prevista como fase futura |
| B11 | **Perfil estendido** | tabela `profiles` (ou `prefs` do Appwrite) para telefone e foto | `prefs` é simples, mas não é consultável por outros usuários; para a troca, `profiles` é melhor |

Nenhum item acima é necessário para fechar a fase 2 atual (login, cadastro, catálogo, coleção, detalhe, perfil). São insumo para priorizar a próxima etapa.

## 4. Decisões pendentes (usuário / Orquestrador)
1. **5 abas (opção A, recomendada)** ou 4 abas com Trocas como atalho (opção B)?
2. O que é a **Garagem** (§1.3)? Ela continua existindo?
3. O **Clube de Troca** entra? Com ele, entra o **telefone** no perfil e o consentimento de exibição.
4. Ordem sugerida das novas telas, por valor/custo:
   1. Séries completas
   2. Estatísticas
   3. Notificações (caixa)
   4. Novidades
   5. Clube de Troca
   6. Push
   7. Garagens
