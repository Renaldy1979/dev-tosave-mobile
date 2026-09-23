# ToSave Mobile — Especificação

Fonte única de verdade do **Projeto 01: app mobile**.
Em caso de dúvida, pergunte ao Orquestrador: `maestri ask "Claude Code" "..."`. Não invente requisito fora deste documento.

## Os dois projetos

| Projeto | Pasta | O que é | Situação |
|---|---|---|---|
| **01 — App mobile** | `C:\Dev\tosave-mobile` | App do **colecionador**, em Expo | **Fase atual** |
| **02 — Portal web ADM** | `...\OneDrive\Documents\Projetos\colecao-miniaturas-web` | Painel administrativo (gestor amigável da base Appwrite) | **Pausado**, começa na fase 3 |

> O app mobile foi movido do OneDrive para `C:\Dev\tosave-mobile` em 22/09/2026: a sincronização do OneDrive corrompeu pacotes dentro de `node_modules` durante o install. O portal web ainda está no OneDrive e deve ser movido quando a fase 3 começar.

O portal web já tem um esqueleto Next.js com schema do banco e o design system completo. **Ninguém mexe nele nesta fase.**
Administração (CRUD de carros, séries, marcas, atributos, usuários, settings) é assunto do portal, **nunca do app**.

## Fase 2 — Backend Appwrite + app ligado (decisões do usuário, 23/09/2026)

A fase 1 está entregue (tag `v0.1.0-fase1`). A fase 2 vem **antes** do portal web: primeiro o app e a base conversando sem problemas, depois o painel web, que será só um gestor amigável da mesma base.

- **Backend único: Appwrite 1.8.1** self-hosted no VPS do usuário. Usamos tudo o que ele oferece: Auth, banco (TablesDB), Storage (imagens dos carros) e Functions. A URL e o ProjectId estão na nota "Appwrite Credentials".
  - A **API key nunca** vai para o git nem para o app.
  - O app usa só o SDK client (`react-native-appwrite`), com permissões.
- **Volume:** ~10.000 carros, mais de 20.000 imagens, coleções de ~400 a mais de 1.000 itens por usuário. Nenhuma tela pode carregar a coleção inteira: tudo é paginado e contado no servidor.
- **Migração:** os carros vêm do Postgres do VPS e as imagens do RustFS do VPS, ambos **somente leitura**. Usuários e coleções atuais são de teste e **não migram**.
- **App travado:** sem login não se navega. Fluxo:
  1. splash;
  2. sem sessão, vai para Login, que oferece **Cadastro**;
  3. com sessão, entra nas tabs.

  O colecionador cria a conta **pelo app**, num cadastro simples: nome, e-mail e senha. Foto e demais dados ficam para depois, na tela de Perfil. Como o catálogo é todo autenticado, as permissões ficam mais simples.
- **Alterar senha no Perfil** (senha atual + nova senha), pedido do usuário. Usa `account.updatePassword` do Appwrite.
- **O contador da aba Coleção sai.** O resumo dentro da tela Coleção continua, lido de estatísticas mantidas no servidor.
- O login simulado e os dados de `src/mocks/` são substituídos pelo Appwrite. Os mocks podem continuar existindo para desenvolvimento, mas nenhuma tela os usa.
- Backend: código em `backend/` e especificação em `docs/ESPECIFICACAO-BACKEND.md`. É responsabilidade do agente **Alicerce**.

### Obrigatório antes de publicar nas lojas (fora do escopo da fase 2, não pode ser esquecido)

- **Excluir conta pelo app**, no Perfil. A App Store exige isso de apps que permitem criar conta. No Appwrite, a exclusão precisa de uma Function no servidor, porque o SDK client não apaga o próprio usuário.
- **Esqueci minha senha:** precisa de SMTP configurado no Appwrite e de uma URL de retorno (deep link). O desenho mínimo está em `docs/design/telas/02-login.md` §7. O link não aparece no app até o fluxo existir.
- **URLs de Termos de Uso e Política de Privacidade**, que as lojas exigem. O conteúdo é definido pelo usuário.

## Stack do app

- **Expo** (SDK atual) + **expo-router** + TypeScript
- **NativeWind** para estilos (Tailwind no React Native)
- Fase 1 sem backend; na fase 2, Appwrite (ver a seção acima)

## Escopo da fase 1 — decisão do usuário

**Mockups navegáveis com dados fake.** Telas completas e navegáveis, sem backend.

- Dados de exemplo isolados em `src/mocks/`.
- Todo acesso a dados passa por `src/services/`, com funções assíncronas que hoje leem os mocks.
- A fase 2 troca **apenas** o conteúdo de `src/services/` pelas chamadas à API do portal web. Nenhuma tela deve importar mock direto.
- Login é **simulado** nesta fase (sem autenticação real, sem senha validada contra servidor).

### Critério de pronto da fase 1 — decisão do usuário (23/09/2026)

A fase 1 está pronta quando cada tela:

- **navega e funciona**: nenhum crash, nenhum botão morto, nenhum fluxo sem saída;
- **está certa nos temas light e dark**: contraste legível, safe area correta, StatusBar coerente;
- **usa a identidade e os textos oficiais**: paleta, logo, empty states e mensagens de erro;
- **tem toque mínimo de 44 pt** e rótulos de acessibilidade corretos.

Todo o resto das specs de tela (`docs/design/telas/`) é **fase 1.5 — polimento** e fica registrado em `docs/briefings/fase-1.5-polimento.md`, sem bloquear a entrega. Isso inclui animações, parallax, blur, glow, press scale, haptics finos, TabBar 100% custom, header que colapsa, zoom da galeria, "8 primeiros + Ver todos", buscas recentes e ajustes de desempenho.

Processo por lote:
1. O Forja implementa.
2. O Orquestrador verifica `tsc` e o bundle Android/iOS.
3. A Aquarela faz **uma** revisão e classifica cada item como fase 1 ou fase 1.5.
4. O Forja corrige só os itens de fase 1.
5. O usuário testa no Expo Go.
6. O Ancora commita e dá push.

Não há segunda rodada de revisão do mesmo lote.

## Telas da fase 1

1. **Onboarding / Splash** — abertura com a logo TOSAVE.
2. **Login** — email e senha, simulado.
3. **Home** — lista/grid das miniaturas, com séries em destaque e busca rápida.
4. **Busca e filtros** — tela dedicada, com filtro por ano, série, marca e atributos.
5. **Detalhe do carro** — layout premium, galeria de imagens, informações, descrição, marca, código (toy), ano, atributos, quantidade na coleção, compartilhar via WhatsApp.
6. **Coleção** — itens do usuário, adicionar e remover, filtro por repetidos (quantity > 1).
7. **Perfil** — dados do colecionador.

Não entram nesta fase: cadastro de conta (register), qualquer tela administrativa, notícias, clube de troca/venda.

## Modelo de dados (espelha o portal web)

Os mocks devem seguir estes formatos, para que a fase 2 encaixe sem refatoração. Definição completa em `docs/referencia-web/ESPECIFICACAO-PORTAL-WEB.md`.

- **Car:** id, title, description, brandId, serieId, collector (aceita zeros à esquerda: `001`), color, imagemFull, imagemThumb, seriePosition (ex. `8/10`), toy (código de busca), year, scale (ex. `1/64`), createdAt, updatedAt
- **CarImage:** id, carId, path, position
- **Brand:** id, name, state (situação: ativa / descontinuada / em análise), image, active, createdAt
- **Serie:** id, title, description, imagem, isDefault (destaque; **vários** podem ser destaque), createdAt
- **Attribute:** id, title, description
- **CollectionItem:** id, userId, carId, quantity (padrão 1), createdAt
- **User:** id, name, email, role (ADMIN/COLLECTOR), status, expo_push_token

## Design

A identidade já existe e **deve ser reaproveitada**, não recriada:

- Logo e ícones: `_brand/` (`logo.png` para fundo escuro, `logo-light.png` para fundo claro, `logo-car.png` para a silhueta).
- Paleta oficial, tirada pixel a pixel da logo: laranja `#FD8401` (primary), amarelo `#FFDE21` (accent), vermelho `#FF0000` (flame).
- Tokens, escalas, tipografia, espaçamento, raio, sombra e motion: `docs/referencia-web/design-system.md`.
- Catálogo de componentes equivalente no web: `docs/referencia-web/componentes.md`.

Esses arquivos foram escritos para Tailwind web. A designer **adapta** para NativeWind e para padrões nativos (safe area, tab bar, gestos, toque de 44pt), mantendo a mesma linguagem visual.

Obrigatório: fundo dark com destaques laranja e vermelho, temas light e dark, cards médios, imagens dominantes, bordas levemente arredondadas, navegação minimalista. O app deve parecer produto comercial premium, nunca um CRUD.

## Empty states (texto oficial)

- Sem carros: **"Nenhuma miniatura disponível no momento."**
- Sem conteúdos: **"Nenhum conteúdo disponível."**

## Qualidade

Proibido `TODO` e `FIXME` no código entregue. O app precisa rodar com `npx expo start` sem erro e sem warning de tipo (`npx tsc --noEmit`).

Dados fake são permitidos **apenas** dentro de `src/mocks/`, porque esta fase é de mockups — em nenhum outro lugar.

## Git

Repositório remoto: https://github.com/Renaldy1979/dev-tosave-mobile (branch `main`). Push autorizado pelo usuário em 23/09/2026, sempre sem `--force`.
