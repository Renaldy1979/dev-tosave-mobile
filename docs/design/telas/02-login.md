# 02 — Login

| | |
|---|---|
| Rota | `app/login.tsx`, apresentada como **modal** (`presentation: "modal"` no iOS, `animation: "slide_from_bottom"` no Android) |
| Params | `next` (rota para ir depois de entrar, ex. `/colecao`) · `intent=add&carId=123` (ação pendente de adicionar à coleção) |
| Acesso | público; com sessão ativa, fecha sozinho |
| Tema | **sempre ink**, status bar `light` |
| Dados | `auth.signIn(email, password)` — **simulado** na fase 1; `collection.add(carId)` quando há `intent=add` |

O app é navegável sem conta: Home, Busca e detalhe do carro são públicos. O login é pedido **apenas** quando o usuário:
1. toca no coração ou em "Adicionar à coleção" (Home, Busca, detalhe);
2. toca na tab **Coleção**;
3. toca na tab **Perfil** (que, sem sessão, aparece como **Entrar**).

Login simulado: o service valida só o formato e compara com o usuário de exemplo dos mocks; não há senha verificada em servidor. Não existe cadastro nesta fase, portanto **não há link "Criar conta"** nem "Esqueci a senha".

## 1. Como o login é pedido

Hook único `useRequireSession()` (em `src/hooks/`), usado por todos os gatilhos:

```ts
const requireSession = useRequireSession();
// retorna true se já há sessão; senão abre o login com o contexto e retorna false
if (!requireSession({ intent: "add", carId })) return;
if (!requireSession({ next: "/colecao" })) return;
```

| Gatilho | Sem sessão | Depois de entrar |
|---|---|---|
| Coração / "Adicionar à coleção" | abre `/login?intent=add&carId=123`; o coração **não** muda antes do login | executa `collection.add(carId)`, fecha o modal, o usuário continua na mesma tela com o coração ativo + Toast "Adicionada à sua coleção." |
| Tab Coleção | `tabPress` com `preventDefault()` e abre `/login?next=/colecao` | fecha o modal e navega para `/colecao` |
| Tab Perfil ("Entrar") | idem, com `next=/perfil` | fecha o modal e navega para `/perfil` |
| Fechar sem entrar (X, arrastar para baixo, back do Android) | — | volta à tela de origem sem nenhuma mudança; a ação pendente é descartada |

Se o carro da ação pendente já estiver na coleção do usuário que entrou, não soma unidade: só fecha e mostra o coração ativo.

## 2. Layout

```
┌───────────────────────────────┐
│ (✕)                           │  IconButton glass "Fechar", insets.top + 8 (iOS modal: sem inset, tem a alça)
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  topo (≈ 30% da altura): palco ink
│░░░      [ LOGO 180pt ]     ░░░│  logo-car.png em marca d'água atrás (opacidade 6%, 140% da largura, cortada)
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  gradiente radial laranja sutil (primary/12) atrás da logo
├───────────────────────────────┤
│  Entre para                   │  display-lg font-display-black ink-fg
│  salvar sua coleção           │  (título muda conforme o gatilho, ver §3)
│  Guarde suas miniaturas e     │  body ink-fg/70
│  controle as repetidas.       │
│                               │
│  E-mail                       │
│  [✉  voce@email.com         ] │  Input (leftIcon Mail)
│                               │
│  Senha                        │
│  [🔒 ••••••••            👁 ] │  Input password (leftIcon Lock)
│                               │
│  ⚠ E-mail ou senha incorretos.│  banner de erro (só no erro de credencial)
│                               │
│  [          Entrar          ] │  Button flame lg fullWidth
│                               │
│  Ambiente de demonstração:    │  caption ink-fg/50 centralizado
│  use os dados de exemplo.     │  + link "Preencher dados de exemplo" primary-text
└───────────────────────────────┘  + insets.bottom + 16
```

- Container: `ScrollView` com `keyboardShouldPersistTaps="handled"` dentro de `KeyboardAvoidingView`. Com teclado aberto, o topo encolhe para 16% da altura (logo 120 pt, animação 200 ms), mantendo campo focado e botão visíveis.
- Gutter 24 pt, largura máxima 440 pt centralizada (tablet).
- No iOS o modal nativo (`pageSheet`) mostra o cartão com a tela de origem recuada atrás, reforçando que o login é um passo rápido e não uma troca de contexto.

## 3. Título contextual

| Gatilho | Título | Texto de apoio |
|---|---|---|
| `intent=add` | Entre para salvar sua coleção | Guarde suas miniaturas e controle as repetidas. |
| `next=/colecao` | Entre para ver sua coleção | Suas miniaturas ficam salvas na sua conta. |
| `next=/perfil` ou sem contexto | Bem-vindo de volta | Entre para acessar sua conta. |

## 4. Hierarquia
1. Logo (identidade)
2. Título contextual (por que estou vendo isto)
3. Campos
4. CTA "Entrar"
5. Nota de demonstração

## 5. Campos e validação

| Campo | Config | Validação (ao sair do campo e ao enviar) | Mensagem |
|---|---|---|---|
| E-mail | `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`, `textContentType="username"`, `returnKeyType="next"` | obrigatório; formato de e-mail | "Informe seu e-mail." / "E-mail inválido." |
| Senha | `variant="password"`, `returnKeyType="go"` (envia) | obrigatório | "Informe sua senha." |

- Erro de campo só aparece depois do primeiro blur ou da primeira tentativa de envio. Depois disso, revalida ao digitar.
- "Entrar" fica **habilitado** sempre; ao tocar com erro, foca o primeiro campo inválido e dispara haptic Error.
- Campo de e-mail recebe foco automático ao abrir (o usuário chegou com intenção de entrar).
- "Preencher dados de exemplo" preenche e-mail e senha do usuário de exemplo via `auth.getDemoCredentials()` (nunca importando o mock na tela). Existe porque o login é simulado; sai na fase 2.

## 6. Estados

| Estado | Visual / comportamento |
|---|---|
| Inicial | Campos vazios, e-mail focado. |
| Enviando | Botão `loading` ("Entrar" + spinner), campos `editable={false}`, fechar desabilitado (X, gesto e back ignorados). |
| Sucesso | Haptic Light; executa a ação pendente (§1) e fecha com `router.back()`; com `next`, navega em seguida (`router.navigate(next)`). |
| Ação pendente falhou (add) | Sessão fica ativa, modal fecha, Toast danger "Não foi possível atualizar sua coleção." e o coração permanece inativo. |
| Credencial inválida | Banner acima do botão: `rounded-md bg-flame-soft border border-flame/40 px-3 py-2.5`, ícone `AlertCircle` flame + "E-mail ou senha incorretos." `body-sm`. Senha limpa e focada. Haptic Error. Anúncio para leitor de tela. |
| Erro inesperado | Mesmo banner com "Não foi possível entrar agora. Tente novamente." |
| Aberto já com sessão (deep link) | Fecha antes de renderizar o formulário. |

Sem empty state (tela sem lista).

## 7. Navegação
- Sempre aberta por `router.push("/login?…")` a partir de um gatilho do §1 (ou de "Entrar" no header da Home). Nunca é rota inicial.
- Fechar = `router.back()`.
- `next` só aceita caminhos internos que começam com `/` (evita redirecionamento arbitrário por deep link).

## 8. Acessibilidade
- Título com `accessibilityRole="header"`; botão fechar com label "Fechar".
- Labels visíveis nos campos (não só placeholder).
- Ordem de foco: fechar → e-mail → senha → Entrar → preencher exemplo.
- `accessibilityViewIsModal` no container.

## 9. Critérios de aceite
- [ ] Home, Busca e detalhe funcionam sem login.
- [ ] Coração, tab Coleção e tab Perfil/Entrar abrem o login quando não há sessão.
- [ ] Depois de entrar, a ação pendente acontece (carro adicionado ou tab aberta) sem o usuário repetir o toque.
- [ ] Fechar sem entrar não altera nada.
- [ ] Ink nos dois temas; teclado nunca cobre o campo ativo nem o botão.
- [ ] Autofill do iOS/Android funciona.
- [ ] Tela não importa nada de `src/mocks/`.
