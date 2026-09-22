# ToSave Mobile — Especificação (Fase 1)

Fonte única de verdade do **Projeto 01: app mobile**.
Em caso de dúvida, pergunte ao Orquestrador: `maestri ask "Claude Code" "..."`. Não invente requisito fora deste documento.

## Os dois projetos

| Projeto | Pasta | O que é | Situação |
|---|---|---|---|
| **01 — App mobile** | `Projetos\app-mobile-tosave` | App do **colecionador**, em Expo | **Fase atual** |
| **02 — Portal web ADM** | `Projetos\colecao-miniaturas-web` | Painel administrativo + API que servirá o app | **Pausado**, começa na fase 2 |

O portal web já tem um esqueleto Next.js com schema do banco e o design system completo. **Ninguém mexe nele nesta fase.**
Administração (CRUD de carros, séries, marcas, atributos, usuários, settings) é assunto do portal, **nunca do app**.

## Stack do app

- **Expo** (SDK atual) + **expo-router** + TypeScript
- **NativeWind** para estilos (Tailwind no React Native)
- Sem backend nesta fase

## Escopo da fase 1 — decisão do usuário

**Mockups navegáveis com dados fake.** Telas completas e navegáveis, sem backend.

- Dados de exemplo isolados em `src/mocks/`.
- Todo acesso a dados passa por `src/services/`, com funções assíncronas que hoje leem os mocks.
- A fase 2 troca **apenas** o conteúdo de `src/services/` pelas chamadas à API do portal web. Nenhuma tela deve importar mock direto.
- Login é **simulado** nesta fase (sem autenticação real, sem senha validada contra servidor).

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

Repositório **local apenas** por enquanto. Conta GitHub do usuário: https://github.com/Renaldy1979, mas o nome do repositório ainda não foi definido e **nenhum push acontece sem confirmação**.
