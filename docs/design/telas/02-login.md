# 02 — Login

| | |
|---|---|
| Rota | `app/login.tsx` → `/login`, tela de stack **normal** (não é mais modal). É a **tela de entrada** do app quando não há sessão. |
| Params | `email` (opcional: vem preenchido, ex.: a partir do Cadastro) · `reason=expired` (opcional: sessão expirada) · `reason=deleted` (opcional: conta excluída, `07-perfil.md` §5.1) |
| Acesso | público; **com sessão ativa, redireciona para `/(drawer)`** sem renderizar o formulário |
| Tema | **sempre ink** (`ThemeScope dark`), status bar `light`, nos dois temas |
| Dados | Appwrite Auth: `account.createEmailPasswordSession(email, password)` |
| Fase | **2** (substitui a versão modal da fase 1) |

## O que mudou em relação à fase 1

A partir da fase 2 o app é **travado por login** (`ESPECIFICACAO-MOBILE.md`, seção "Fase 2"). Sem sessão não se navega.

| Fase 1 (sai) | Fase 2 (entra) |
|---|---|
| Modal aberto por gatilhos (coração, tabs Coleção/Perfil) | Tela de entrada do app; nunca é modal |
| Botão X "Fechar" | **Não existe.** Sem sessão não há para onde voltar; o back do Android fecha o app |
| Params `next` e `intent=add&carId` + `useRequireSession()` | Removidos. Todas as telas exigem sessão, então não há ação pendente |
| Título contextual por gatilho | Título único (§3) |
| "Preencher dados de exemplo" e nota de demonstração | **Removidos** |
| Sem cadastro | Link **"Criar conta"** → `08-cadastro.md` |
| Login simulado (`src/mocks/`) | Appwrite Auth |

Consequências nas outras telas:
- a tab Perfil volta a ser sempre "Perfil";
- o `LoginGate` (componentes §C.16) e o botão "Entrar" do header da Home deixam de existir;
- o coração adiciona direto, já que há sessão.

Critério de pronto (enxuto):
- funciona sem crash nem fluxo sem saída;
- está certo nos temas light e dark;
- respeita a safe area;
- usa os textos oficiais;
- tem toque de 44 pt e a11y.

Sem animações extras: o encolhimento animado do topo com teclado vai para a fase 1.5.

## 1. Fluxo de entrada do app

```
splash ──► onboarding.seen ausente? ──► Onboarding ──► Login
   │                                                    ▲
   ├── sem sessão ──────────────────────────────────────┘
   └── com sessão válida ──► /(drawer) (Home)
```

- O splash (`01-onboarding-splash.md`) consulta `account.get()`:
  - sessão válida → `router.replace("/(drawer)")`;
  - sem sessão → `router.replace("/login")` (ou Onboarding na primeira abertura, que no fim leva ao Login).
- **Sessão expirada ou revogada** durante o uso (resposta `401` do Appwrite em qualquer tela) → limpa o estado local e faz `router.replace({ pathname: "/login", params: { reason: "expired" } })`.
- **Sair** (Perfil) → `account.deleteSession("current")` → `router.replace("/login")`. O voltar nunca reabre as tabs.
- O Login sempre entra com `router.replace`, nunca `push`, para o voltar não levar a uma tela protegida.

## 2. Layout

```
┌───────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  topo (≈ 30% da altura): palco ink, conteúdo a partir de insets.top
│░░░      [ LOGO 180pt ]     ░░░│  logo-car.png em marca d'água atrás (opacidade 6%, 140% da largura, cortada)
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  (sem X de fechar)
├───────────────────────────────┤
│  Entre na sua conta           │  display-lg font-display-black ink-fg (header)
│  Sua coleção de miniaturas,   │  body ink-fg/70
│  organizada.                  │
│                               │
│  ⓘ Sua sessão expirou.        │  banner informativo (só com reason=expired, ou após cadastro, §5)
│                               │
│  E-mail                       │
│  [✉  voce@email.com         ] │  Input (leftIcon Mail)
│                               │
│  Senha                        │
│  [🔒 ••••••••            👁 ] │  Input password (leftIcon Lock)
│                               │
│  ⚠ E-mail ou senha incorretos.│  banner de erro (§5)
│                               │
│  [          Entrar          ] │  Button flame lg fullWidth
│                               │
│  Ainda não tem conta?         │  body-sm ink-fg/70 centralizado
│  Criar conta                  │  link primary-text font-sans-medium, min-h-11 → /cadastro
└───────────────────────────────┘  + insets.bottom + 16
```

- Container: `ScrollView` com `keyboardShouldPersistTaps="handled"` dentro de `KeyboardAvoidingView`. O campo focado e o botão ficam sempre visíveis acima do teclado. O topo **não** anima (o encolhimento com teclado é fase 1.5); ele pode simplesmente sair de vista ao rolar.
- Gutter de 24 pt, largura máxima de 440 pt centralizada (tablet).
- Safe area: o topo pinta a área da status bar; o primeiro conteúdo começa em `insets.top`. A base soma `insets.bottom + 16`.
- O gradiente radial `primary/12` atrás da logo é fase 1.5 (opcional).

## 3. Título

Título único, sem variação por contexto:

| Título | Texto de apoio |
|---|---|
| Entre na sua conta | Sua coleção de miniaturas, organizada. |

## 4. Campos e validação

| Campo | Config | Validação (ao sair do campo e ao enviar) | Mensagem |
|---|---|---|---|
| E-mail | `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`, `textContentType="username"`, `returnKeyType="next"` | obrigatório; formato de e-mail; enviado em minúsculas e sem espaços | "Informe seu e-mail." / "E-mail inválido." |
| Senha | `variant="password"`, `autoComplete="password"`, `textContentType="password"`, `returnKeyType="go"` (envia) | obrigatório | "Informe sua senha." |

- O erro de campo só aparece depois do primeiro blur ou da primeira tentativa de envio. Depois disso, o campo revalida ao digitar.
- "Entrar" fica **sempre habilitado**. Ao tocar com erro, o foco vai para o primeiro campo inválido.
- Foco inicial: no e-mail; se ele vier preenchido por param, na senha.
- O Login não valida o tamanho mínimo da senha. Quem define se a senha está certa é o servidor.

## 5. Estados e erros (Appwrite → texto oficial)

| Estado / situação | Visual / comportamento |
|---|---|
| **Inicial** | Campos vazios (ou e-mail preenchido via param), foco conforme §4. |
| **Enviando** | Botão em `loading` ("Entrar" + spinner). Campos com `editable={false}`. O link "Criar conta" fica desativado até a resposta. |
| **Sucesso** | `router.replace("/(drawer)")`. |
| **Credencial inválida** (`401 user_invalid_credentials`) | Banner de erro: "E-mail ou senha incorretos." A senha é limpa e recebe o foco. |
| **Conta bloqueada** (`401 user_blocked`) | Banner de erro: "Esta conta está desativada." |
| **Muitas tentativas** (`429`) | Banner de erro: "Muitas tentativas. Aguarde alguns minutos e tente de novo." |
| **Sem rede / timeout** | Banner de erro: "Sem conexão. Verifique sua internet e tente novamente." |
| **Erro inesperado** | Banner de erro: "Não foi possível entrar agora. Tente novamente." |
| **Sessão já existe** (`401 user_session_already_exists`) | Tratado como sucesso: `router.replace("/(drawer)")`. |
| **Sessão expirada** (`reason=expired`) | Banner **informativo**: "Sua sessão expirou. Entre novamente." Some ao enviar. |
| **Conta excluída** (`reason=deleted`) | Banner **informativo**: "Sua conta foi excluída." Campos vazios. Some ao enviar. |
| **Vindo do Cadastro com a sessão falhando** | Banner informativo "Conta criada. Entre para continuar." e e-mail preenchido (ver `08-cadastro.md` §5). |
| **Aberto já com sessão** | Redireciona para `/(drawer)` antes de renderizar. |

- **Banner de erro:** `rounded-md bg-flame-soft border border-flame/40 px-3 py-2.5`, ícone `AlertCircle` flame + texto `body-sm`, acima do botão.
- **Banner informativo:** `rounded-md bg-surface-2 border border-info/40`, ícone `Info` na cor `info`, abaixo do texto de apoio.
- Todo banner é anunciado ao leitor de tela.
- Nunca mostrar a mensagem técnica do servidor. Sem ponto de exclamação.

Sem empty state (a tela não tem lista).

## 6. Navegação

| Ação | Destino |
|---|---|
| "Criar conta" | `router.push("/cadastro")` (o voltar do Cadastro retorna ao Login) |
| Sucesso | `router.replace("/(drawer)")` |
| Back do Android | comportamento padrão: sai do app (o Login é a raiz quando não há sessão) |

## 7. "Esqueci minha senha": proposta

**Proposta: fica para depois da fase 2** (fase 2.x). O link **não aparece** no Login até o fluxo existir, para não ter botão morto.

Por que não entra agora:
- O Appwrite só faz recuperação por e-mail: `account.createRecovery(email, url)` envia um link, e `account.updateRecovery(userId, secret, password)` conclui.
- Isso depende de **SMTP configurado** no Appwrite do VPS e de uma **URL de retorno** registrada como plataforma. Essa URL pode ser uma página web (o portal, que está pausado) ou um deep link `tosave://recuperar-senha`.
- É infraestrutura do Alicerce, não só de tela.

Quando entrar, o desenho mínimo é:
1. Link "Esqueci minha senha" (`body-sm primary-text`, `min-h-11`) abaixo do campo Senha, alinhado à direita.
2. Tela `/recuperar-senha`, ink:
   - campo E-mail + botão "Enviar link";
   - a resposta é **sempre a mesma**, exista ou não a conta: "Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha." (não revela quais e-mails estão cadastrados).
3. Deep link `tosave://recuperar-senha?userId&secret`:
   - tela "Nova senha" (1 campo com olho, mínimo de 8 caracteres);
   - no sucesso, vai para o Login com o banner informativo "Senha alterada. Entre com a nova senha.";
   - link expirado: "Este link expirou. Peça um novo.", com botão para `/recuperar-senha`.

Enquanto isso, quem esquecer a senha não tem saída pelo app. Isso é aceitável só para testes internos: **antes de publicar nas lojas, este fluxo precisa existir.**

## 8. Acessibilidade
- O título usa `accessibilityRole="header"`.
- Os labels dos campos são visíveis, não só placeholder.
- Ordem de foco: e-mail → senha → mostrar senha → Entrar → Criar conta.
- O link "Criar conta" tem `accessibilityRole="link"` e toque de 44 pt.

## 9. Critérios de aceite
- [ ] Sem sessão, o app abre no Login (depois do onboarding na primeira vez); nenhuma tela das tabs é acessível.
- [ ] Sem X de fechar e sem "Preencher dados de exemplo".
- [ ] "Criar conta" abre o Cadastro, e o voltar retorna ao Login.
- [ ] Entrar leva às tabs com `replace`; o voltar não retorna ao Login.
- [ ] Erros do Appwrite mapeados para os textos oficiais do §5.
- [ ] Sessão expirada leva ao Login com o aviso; Sair leva ao Login.
- [ ] Ink nos dois temas; teclado nunca cobre o campo ativo nem o botão; safe area respeitada.
- [ ] Autofill do iOS e do Android funciona.
- [ ] A tela não importa nada de `src/mocks/`.
