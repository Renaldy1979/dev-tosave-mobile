# ToSave — Plataforma de Coleção de Miniaturas

Especificação oficial do projeto. **Fonte única de verdade** para toda a equipe.
Nenhum agente deve inventar requisito fora deste documento; em caso de dúvida, perguntar ao Orquestrador (`maestri ask "Claude Code" "..."`).

## Stack obrigatória

- Next.js 15+ (App Router) + TypeScript
- Tailwind CSS
- Drizzle ORM + SQLite (better-sqlite3)
- Auth.js (NextAuth) + bcrypt
- React Hook Form + Zod
- Lucide Icons

## Decisões já tomadas pelo usuário (valem sobre o texto original)

1. **ORM: Drizzle.** A especificação original citava `npx prisma migrate dev` no item de execução — isso foi um engano. Usar `drizzle-kit`, expor `npm run db:migrate` e documentar o comando correto no README.
2. **Marca:** `Cars` ganha `brandId` (relação direta com `Brands`), além de `serieId`. O filtro por marca é independente da série.
3. **Galeria:** criar tabela `CarImages` (`id`, `carId`, `path`, `position`). `imagemFull`/`imagemThumb` continuam sendo a imagem principal.
4. **Projeto separado:** esta plataforma web é um repositório próprio. O app mobile Expo (`app-mobile-tosave`) é um projeto irmão e futuro consumidor — por isso `Users.expo_push_token` existe aqui.
5. **`Brands.state`:** guarda a *situação* da marca (ex.: `ativa`, `descontinuada`, `em análise`) — é independente do booleano `active`, que controla apenas se a marca aparece no site.
6. **Git:** por enquanto **somente repositório local**. Nenhum remoto, nenhum push, até o usuário decidir o nome do repositório.
7. **Rota de perfil:** `/profile`, permitindo editar nome, email e senha (senha exige a senha atual).
8. **Séries em destaque:** `isDefault` **não** é exclusivo — várias séries podem ser destaque ao mesmo tempo na home.
9. **`/admin/settings`:** abas de configurações gerais do app **e a gestão de usuários** (listar, alterar role, alterar status).
10. **`imagemThumb`:** gerada pelo backend no upload (redimensionamento no servidor), nunca um segundo upload manual.
11. **Sub-rotas admin:** `/admin/cars/new` e `/admin/cars/[id]/edit` (e equivalentes para séries, marcas e atributos).

## Objetivo

Plataforma de gerenciamento de coleção de miniaturas de carros (Hot Wheels, Matchbox).
O ADMIN cadastra marcas, séries, categorias/atributos, usuários, carros e configurações.
O COLECIONADOR navega pela lista de carros, vê detalhes e adiciona à sua coleção.

Após o login, o colecionador cai direto na listagem de carros existentes.

## Autenticação

Auth.js (NextAuth) com login por email + senha.

- Senhas com bcrypt.
- Sessão persistente.
- Middleware de proteção de rotas.
- Controle por roles.

### Roles

**ADMIN:** painel administrativo, gerenciar carros, marcas e séries.
**COLLECTOR:** navegar, adicionar à coleção, compartilhar via WhatsApp. **Não** acessa rotas administrativas.

## Setup inicial

- **Não criar usuários no seed.**
- Se não existir nenhum usuário ADMIN, redirecionar automaticamente para `/setup`.
- `/setup` pede nome, email, senha e confirmação de senha, e cria o primeiro ADMIN.
- Depois que existir um ADMIN, `/setup` fica permanentemente bloqueada.

## Banco de dados

SQLite exclusivamente. **Nada de dados mockados nem arrays hardcoded** — tudo vem do banco.

### Modelos

**Users:** id, name, email, password, role, status, expo_push_token, createdAt
**Brands:** id, name, state, image, active, createdAt
**Cars:** id, title, description, brandId, serieId, collector (número na coleção, aceita zeros à esquerda: `001`), color (texto ou hexadecimal), imagemFull, imagemThumb, imagemURLOriginal (só para carga manual em lote), imagemCheck (boolean, processo bat manual), seriePosition (ex. `8/10`), toy (código para busca/filtro), year, scale (ex. `1/64`), createdAt, updatedAt
**CarImages:** id, carId, path, position
**Collections:** id, userId, carId, quantity (padrão 1), createdAt
**Series:** id, title, description, imagem, isDefault (destaque na home), createdAt
**Attributes:** id, title, description, createdAt
**CarsAttributes:** id, carId, attributeId

## Rotas

```
/                      home pública
/login
/register
/setup
/collections
/car/[id]
/admin
/admin/cars
/admin/cars/atributes
/admin/series
/admin/brands
/admin/settings
```

## Painel admin

Dashboard exibe: quantidade de carros, de séries, de usuários e de itens em coleção.

**CRUD de carros:** todos os campos exceto id, createdAt, updatedAt. Criar, editar, excluir, listar.
**CRUD de séries:** nome, descrição, imagem, default. Criar, editar, excluir, listar.
**CRUD de marcas** e **CRUD de atributos** nas suas respectivas rotas.

## Upload de imagens

Obrigatório e real — **não aceitar URL digitada manualmente** no formulário.
Arquivos salvos em `/public/uploads`; o banco guarda **apenas o caminho**.
Suportar imagem principal e galeria (`CarImages`).

Exceção: `imagemURLOriginal` continua sendo um campo de texto, pois serve apenas ao processo manual de carga em lote.

## Experiência do colecionador

Home pública com hero principal, busca por nome ou código e lista de todos os carrinhos.
Filtros: atributos, ano e série. Como podem ser muitos, listar os primeiros e oferecer busca ou botão "exibir tudo".

O usuário pode visualizar os carrinhos, abrir detalhes e adicionar à coleção (like/favorito).

### Coleção — `/collections`

Somente autenticado; se deslogado, solicitar login. Coleção salva no banco, com adicionar e remover.

### Página de detalhes

Layout premium, com nome completo, galeria de imagens, informações, descrição, marca, código (toy), ano, atributos e quantidade na coleção.

### Busca e filtros

Busca textual ou por código (toy); filtro por ano, série e marca. Na tela de coleção, filtro adicional por carro repetido (quantity > 1).

## Design obrigatório

O sistema **não** pode parecer um CRUD — tem que parecer um produto comercial premium pronto para produção.

- Estética de referência: https://colecione.app
- Layout moderno, cards médios, imagens dominantes, bordas levemente arredondadas
- Fundo dark, destaques laranja e vermelho
- Navbar minimalista
- Mobile-first, responsividade completa, componentização adequada
- Temas light e dark
- **Logo oficial:** `_brand/logo.png` — wordmark "TOSAVE" em amarelo, silhueta de carro em laranja e chamas em vermelho. A paleta da marca sai daí.

## Empty states

- Sem carros: "Nenhuma miniatura disponível no momento."
- Sem conteúdos: "Nenhum conteúdo disponível."

## Qualidade obrigatória

Proibido: `TODO`, `FIXME`, mock data, dados fictícios hardcoded.
Todas as funcionalidades conectadas ao banco. O projeto deve compilar sem erros.

## Execução esperada

```
npm install
npm run db:migrate
npm run dev
```

Sem ajustes adicionais.

## README

Deve conter instalação, configuração, migrações, execução, estrutura do projeto e credenciais iniciais (explicando a criação via `/setup`).

## Critério de aprovação

Compila sem erros; autenticação funcional; setup inicial funcional; upload funcional; CRUD funcional; favoritos funcionais; SQLite funcional; painel administrativo funcional; interface premium; parece um produto real.

## Fases

**Fase 1 (atual):** login, home, coleção, perfil, painel ADM.
**Fase 2:** visualização por série, notícias e novidades, clube de troca/venda.

## Repositório

Conta GitHub: https://github.com/Renaldy1979 — o nome do repositório ainda precisa ser confirmado pelo usuário antes de qualquer push.
