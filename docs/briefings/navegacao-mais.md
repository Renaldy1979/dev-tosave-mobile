# Lote: navegação com barra inferior + tela "Mais" (mobile e web)

Aprovado pelo usuário em 28/09/2026. Vale para o app mobile (`C:\Dev\tosave-mobile`) e para o app web do colecionador (`C:\Dev\tosave-web`, `src/app/sites/app`).

## Objetivo

As duas plataformas passam a ter a mesma navegação:
- barra inferior;
- tela **Mais** no estilo do Mercado Livre: uma tela comum, que não é gaveta nem painel que sobe de baixo, e que concentra toda a árvore de navegação e mais itens "estacionados".

## Ordem oficial dos itens (única para mobile e web)

1. Início
2. Buscar
3. Coleção
4. Notícias
5. Séries
6. Clube da Troca
7. Estatísticas
8. Notificações
9. Perfil
10. Sair

As novas funcionalidades entram nesta lista e a ordem é ajustada aos poucos. A lista fica num arquivo único por plataforma (mobile: `src/navigation/drawerItems.ts` ou um sucessor; web: `src/components/app/nav.ts`).

## Barra inferior (celular, nas duas plataformas)

- **Itens:** Início, Buscar, Coleção, Notícias e **Mais**.
- **Sino:** fica no topo (cabeçalho), com o contador de não lidas. O botão ☰ e o menu lateral (Drawer) saem do mobile.

## Tela Mais

- **Onde fica:** é uma aba própria, `mais`, montada por uma lista configurável dividida em seções. Acrescentar um item deve custar uma linha.
- **Navegação:**
  - item que está na barra: o toque troca para a aba dele;
  - item que não está na barra: abre **dentro** da aba Mais (pilha própria), a aba Mais continua ativa e o voltar (seta e botão voltar do Android) retorna para a lista do Mais.
- **Layout:**
  1. **Cartão do usuário** no topo (foto ou inicial, nome, `toy`/e-mail), que leva ao Perfil.
  2. **Seção "Navegação":** os itens 1 a 9 da ordem oficial, TODOS, incluindo os que estão na barra. Notificações mostra o contador de não lidas.
  3. **Seção "Ajuda e informações":** os valores vêm de `GET /v2/config`; valor vazio esconde o item.
     - Falar com o suporte: `supportEmail`, abre `mailto:`.
     - Política de privacidade: `privacyUrl`.
     - Termos de uso: `termsUrl`.
     - Sobre o ToSave: mostra a versão do app (no mobile, a do build; na web, pode ser só "ToSave web").
  4. **Sair:** em vermelho, com o diálogo de confirmação que já existe.

## Específico do mobile (Forja)

- **Layout de abas:** trocar `Drawer` por `Tabs` do expo-router em `app/(drawer)/_layout.tsx`. O grupo pode ser renomeado para `(tabs)`. Não entra dependência nativa nova.
- **Rotas:** as telas que não estão na barra (Séries, Troca, Estatísticas, Notificações, Perfil) passam a viver na pilha da aba Mais. Atualizar TODOS os pontos que navegam para elas: push notification, links internos, atalhos da Início, deep links.
- **Cabeçalho:** o `RootHeader` perde o ☰ e fica com o sino.
- **Espaço embaixo:** conferir as telas com elementos fixos embaixo (toast, galeria, botões, listas) para não ficarem atrás da barra (safe area).
- **Botão voltar do Android:** em qualquer aba que não seja o Início, volta para o Início (`backBehavior`), e dentro da pilha do Mais volta para a lista do Mais.
- **Critérios:** `tsc` e bundle Android pelo Metro limpos. O teste real é o APK de preview, feito pelo usuário.

## Específico da web (Lanterna)

- **Celular:** o botão Mais passa a ser a página `/mais`, e o painel atual sai. A barra inferior vira Início, Buscar, Coleção, Notícias e Mais.
- **Desktop:** o menu lateral segue a ordem oficial numa lista única (sem os grupos atuais), com a seção "Ajuda e informações" e o Sair embaixo, separados.
- **Critérios:** typecheck e `next build --webpack` limpos, com teste local em modo de produção (`node .next/standalone/server.js` na porta 3006, porque o `output` é `standalone`).

## Regras

- **Commits:** na branch `feat/navegacao-mais` de cada repositório, sem push. O Orquestrador mescla depois da validação.
- **Contas e dados:** não criar contas nem dados de teste em produção sem perguntar.
- **Respostas:** curtas.
