# ToSave Mobile — Design (fase 1)

Specs de design do **app do colecionador** (Expo + expo-router + NativeWind). Fonte de requisitos: `docs/ESPECIFICACAO-MOBILE.md`.

| Documento | Conteúdo |
|---|---|
| `design-system-mobile.md` | Tokens (`tailwind.config.js` do NativeWind), temas light/dark, tipografia, densidade, toque de 44 pt, safe area, elevação nativa, motion, estados globais |
| `componentes.md` | Catálogo de componentes com props, anatomia, estados e acessibilidade |
| `telas/01-onboarding-splash.md` | Splash e onboarding |
| `telas/02-login.md` | Login simulado, em modal, pedido só ao adicionar à coleção e ao abrir Coleção ou Perfil |
| `telas/03-home.md` | Home: séries em destaque, busca rápida, grid |
| `telas/04-busca-filtros.md` | Busca e filtros (ano, série, marca, atributos) |
| `telas/05-car-detalhe.md` | Detalhe premium do carro |
| `telas/06-colecao.md` | Coleção do usuário, quantidade, repetidos |
| `telas/07-perfil.md` | Perfil do colecionador |

Referência visual herdada (não editar, é do portal web pausado): `docs/referencia-web/`.

## Mapa de navegação (expo-router)

```
app/
├─ _layout.tsx            Root: fontes, SplashScreen, SafeAreaProvider, GestureHandlerRootView,
│                         ThemeProvider, BottomSheetModalProvider, ToastProvider, SessionProvider, <Stack>
├─ index.tsx              Boot/splash animado → decide a rota inicial (replace)
├─ onboarding.tsx         3 slides; só na primeira abertura
├─ login.tsx              Login simulado, apresentado como MODAL (params next / intent=add&carId)
├─ (tabs)/
│  ├─ _layout.tsx         <Tabs> com TabBar custom (ink); intercepta Coleção e Perfil sem sessão
│  ├─ index.tsx           Home            → "/"                    público
│  ├─ busca.tsx           Busca e filtros → "/busca?q=&year=&serie=&brand=&attr=&focus=1"   público
│  ├─ colecao.tsx         Coleção         → "/colecao?q=&dup=1"    exige sessão
│  └─ perfil.tsx          Perfil          → "/perfil"              exige sessão (tab "Entrar" sem sessão)
└─ car/
   └─ [id].tsx            Detalhe do carro (Stack sobre as tabs, sem TabBar) → "/car/123"   público
```

```
            ┌──────────┐ 1ª vez  ┌────────────┐
  abrir ──▶ │  index   │───────▶ │ onboarding │───┐
            │ (splash) │         └────────────┘   │ Começar / Pular (replace)
            └────┬─────┘                          │
                 │ demais aberturas (com ou sem sessão)
                 ▼                                ▼
     ┌─────────────────────────── (tabs) ───────────────────────────┐
     │  Início ◀──▶ Buscar ◀──▶ Coleção 🔒 ◀──▶ Perfil 🔒 / Entrar    │
     └──────┬───────────┬────────────┬──────────────────────┬───────┘
            │ card      │ card       │ card                 │ sair → volta ao Início (anônimo)
            ▼           ▼            ▼
                    car/[id]  (push; "Mais da série" faz push de outro car/[id])

  🔒 / coração sem sessão ──push──▶ login (modal) ──sucesso──▶ fecha e conclui a ação
                                                  └─fechar──▶ volta sem mudanças
```

**Regras**
- **Acesso anônimo:** Home, Busca e detalhe do carro são públicos (como a home pública do portal web). Login é exigido apenas para: adicionar à coleção (coração / "Adicionar à coleção"), abrir a tab Coleção e abrir a tab Perfil.
- Pedir login = `useRequireSession()` (ver `telas/02-login.md` §1): abre `/login` como modal com o contexto (`next` ou `intent=add&carId`) e conclui a ação após entrar.
- Tabs protegidas: em `(tabs)/_layout.tsx`, `listeners.tabPress` de `colecao` e `perfil` faz `preventDefault()` + `requireSession({ next })` quando não há sessão.
- Fallback de deep link (`tosave://colecao` sem sessão): a própria tela renderiza o `LoginGate` (componentes §C.16) em vez de redirecionar. Evita loop de redirect ao fechar o modal.
- Splash e onboarding usam `router.replace` (o voltar nunca retorna a eles). Sair (Perfil) faz `router.replace("/")`.
- Estado de busca, filtros e "repetidos" vive nos **search params** (`router.setParams`), então o voltar do detalhe restaura a lista exata.
- Deep link (`scheme: "tosave"`): `tosave://car/123` abre o detalhe direto, com ou sem sessão.
- Headers: `headerShown: false` no Stack e nas Tabs; cada tela renderiza seu `Header` (componentes §7).
- Detalhe: `animation: "slide_from_right"`, `gestureEnabled: true`, `fullScreenGestureEnabled: true` (iOS). Login: `presentation: "modal"` (iOS), `animation: "slide_from_bottom"` (Android).

## Contrato de dados das telas (`src/services/`)

As telas chamam só isto. Hoje leem `src/mocks/`; na fase 2 viram chamadas à API. Formatos seguem o modelo da especificação.

| Função | Retorno | Usada em |
|---|---|---|
| `auth.signIn(email, password)` | `Promise<User>` (rejeita com `AuthError` "invalid_credentials") | Login |
| `auth.getDemoCredentials()` | `Promise<{ email; password }>` (só fase 1, login simulado) | Login |
| `auth.signOut()` / `auth.getSession()` | `Promise<void>` / `Promise<User \| null>` | Perfil / boot, `useRequireSession` |
| `users.updateProfile({ name, email })` | `Promise<User>` | Perfil |
| `cars.list({ q?, years?, serieId?, brandId?, attributeIds?, page?, pageSize? })` | `Promise<{ items: CarListItem[]; total: number; page: number }>` | Home, Busca |
| `cars.count(filters)` | `Promise<number>` | "Ver N resultados" do FilterSheet |
| `cars.get(id)` | `Promise<CarDetail>` (car + brand + serie + attributes + images) | Detalhe |
| `cars.listBySerie(serieId, { excludeId, limit })` | `Promise<CarListItem[]>` | "Mais da série" |
| `series.list({ featured? })` | `Promise<Serie[]>` | Home, filtros |
| `brands.list()` / `attributes.list()` / `cars.years()` | opções de filtro | Filtros |
| `collection.list({ q?, duplicatesOnly? })` | `Promise<CollectionEntry[]>` (item + car) | Coleção |
| `collection.summary()` | `Promise<{ items: number; models: number; duplicates: number }>` (só com sessão) | TabBar, Coleção, Perfil |
| `collection.add(carId)` / `collection.setQuantity(itemId, n)` / `collection.remove(itemId)` | `Promise<CollectionItem \| void>` | CarCard, Detalhe, Coleção |

`CarListItem` = `Car` + `brandName` + `serieTitle` (o que o CarCard precisa). Um store leve (Context ou Zustand) guarda o mapa `carId → CollectionItem` para o coração e o stepper refletirem o mesmo estado em todas as telas. Sem sessão, o store fica vazio e nenhuma função de `collection` é chamada.

## Decisões e pendências

Ver `design-system-mobile.md` §15.
