# 01 — Splash e Onboarding

| | |
|---|---|
| Rotas | `app/index.tsx` (splash/boot) · `app/onboarding.tsx` |
| Acesso | público |
| Tema | **sempre ink** (`ThemeScope dark`), status bar `light`, nos dois temas |
| Dados | `auth.getSession()`, AsyncStorage `tosave.onboarding.seen`, `tosave.theme` |

## 1. Splash

### 1.1 Splash nativo (antes do JS)
Configurado no `app.json` (DS §2): fundo `#0B0B0D`, `logo.png` 220 pt centralizada. Fica visível até fontes, tema salvo e sessão carregarem (`SplashScreen.preventAutoHideAsync()` no root; `hideAsync()` quando `index.tsx` montar o splash animado, que começa **idêntico** ao nativo, sem salto).

### 1.2 Splash animado (`app/index.tsx`)

```
┌───────────────────────────────┐
│                               │  bg ink #0B0B0D
│                               │
│         [ LOGO 220pt ]        │  centro óptico (−24 pt do centro)
│                               │
│        ▬▬▬▬▬▬▬▬░░░░░░░         │  barra flame 120×3 pt, 32 pt abaixo da logo
│                               │
│                               │
│      Sua coleção de           │  caption ink-fg/50, na base (insets.bottom + 24)
│      miniaturas, organizada.  │
└───────────────────────────────┘
```

**Sequência (total máx. ~1,2 s, nunca bloqueia além do necessário):**
1. 0 ms: logo já na posição do splash nativo.
2. 0–400 ms: barra flame preenche da esquerda para a direita (0 → 100%, `easing.out`) enquanto `getSession()` resolve. Se a sessão demorar, a barra para em 85% e pulsa até resolver.
3. Ao resolver: logo escala 1 → 1.04 e faz fade out junto com a barra (250 ms), e `router.replace` para o destino.
4. Destino:
   - `onboarding.seen` ausente → `/onboarding`
   - ~~nos demais casos → `/(tabs)` (Home), com ou sem sessão~~ (fase 1).
   - **Fase 2 (app travado):** sessão válida (`account.get()`) → `/(tabs)`; sem sessão → `/login`. "Pular" e "Começar" do onboarding passam a levar a `/login` (ou a `/(tabs)` se já houver sessão). Ver `02-login.md` §1.

**Movimento reduzido:** sem escala; barra aparece cheia; fade simples de 200 ms.

### 1.3 Estados
| Estado | Comportamento |
|---|---|
| Carregando | É o próprio splash. |
| Erro ao ler a sessão (storage corrompido) | Trata como "sem sessão": limpa a chave e segue para a Home como visitante. Sem mensagem. |
| Fontes falharam | Segue com fonte de sistema (não trava o app); registra em `console.warn` só em `__DEV__`. |

Sem empty state (tela não lista conteúdo).

## 2. Onboarding

Só na primeira abertura. 3 slides em pager horizontal, com a proposta do app. Não pede dados nem permissões.

```
┌───────────────────────────────┐
│                         Pular │  ghost sm, topo direito (insets.top + 8); some no último slide
│                               │
│   ┌───────────────────────┐   │
│   │                       │   │  ilustração 1:1, largura − 48
│   │   [ composição de     │   │  (ver conteúdo por slide)
│   │     miniaturas ]      │   │
│   └───────────────────────┘   │
│                               │
│   Explore o                   │  display-lg font-display-black ink-fg, 2 linhas
│   catálogo                    │
│   Séries, marcas e anos em    │  body-lg ink-fg/70, máx. 3 linhas
│   um só lugar.                │
│                               │
│   ━━  ─  ─                    │  indicador: ativo 24×4 flame, inativos 8×4 white/25
│                               │
│  [        Próximo         ]   │  Button primary lg fullWidth (último: flame "Começar")
└───────────────────────────────┘  + insets.bottom + 16
```

### 2.1 Conteúdo dos slides

| # | Título | Texto | Ilustração |
|---|---|---|---|
| 1 | Explore o catálogo | Séries, marcas e anos em um só lugar. | 3 CarCards fictícios empilhados em leque (rotações −6°, 0°, 6°), usando `logo-car.png` como imagem no palco, com badges `#001`, `#024`, `#107`. |
| 2 | Monte sua coleção | Adicione suas miniaturas e controle as repetidas. | Um CarCard grande com o coração ativo (flame + glow) e o stepper `− 2 +`, Badge "Repetido ×2". |
| 3 | Compartilhe | Mostre suas miniaturas para os amigos pelo WhatsApp. | Card do carro com o botão "Compartilhar" (ícone WhatsApp) em destaque. |

As ilustrações são **composições de componentes reais** (CarCard, Badge, FavoriteButton), renderizadas em escala e sem interação (`pointerEvents="none"`), não imagens estáticas. Assim acompanham o design system sem assets extras. Os textos são fixos no componente da tela (conteúdo de interface, não dado de mock).

### 2.2 Hierarquia
1. Ilustração (≈ 45% da altura útil)
2. Título Saira itálica
3. Texto de apoio
4. Indicador de progresso
5. CTA

### 2.3 Interação e navegação
- Swipe horizontal entre slides (`FlatList pagingEnabled` ou `react-native-pager-view`); o CTA "Próximo" avança com animação.
- Ilustração com parallax leve: desloca 0,3× a velocidade do swipe (desligado com movimento reduzido).
- "Pular" e "Começar": gravam `tosave.onboarding.seen = "1"` e fazem `router.replace("/(tabs)")` (Home, como visitante). O onboarding não pede login.
- Back do Android: no slide 1 sai do app (comportamento padrão); nos demais volta um slide.
- A11y: indicador anuncia "Passo 2 de 3"; cada slide é um grupo com título como `header`.

### 2.4 Estados
| Estado | Comportamento |
|---|---|
| Falha ao gravar `onboarding.seen` | Segue para a Home mesmo assim (na próxima abertura o onboarding reaparece; aceitável). |
| Tela pequena (altura < 640 pt) | Ilustração cai para 35% da altura e o título para `display-md`. |

Sem loading (conteúdo local) e sem empty state.

## 3. Critérios de aceite
- [ ] Splash nativo e animado são visualmente contínuos (sem piscar branco, sem salto da logo).
- [ ] Sempre ink, independente do tema escolhido.
- [ ] Onboarding aparece só uma vez; "Pular" funciona em qualquer slide.
- [ ] Nenhum `router.push` nessas telas: o voltar nunca retorna ao splash.
- [ ] CTA e "Pular" respeitam safe area e têm ≥ 44 pt.
