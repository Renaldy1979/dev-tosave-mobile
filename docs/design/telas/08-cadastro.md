# 08 — Cadastro

| | |
|---|---|
| Rota | `app/cadastro.tsx` → `/cadastro`, tela de stack **normal**, sem modal. Aberta a partir do Login. |
| Params | nenhum |
| Acesso | público; **com sessão ativa, redireciona para `/(tabs)`** sem renderizar o formulário |
| Tema | **sempre ink** (`ThemeScope dark`), status bar `light`, nos dois temas |
| Dados | Appwrite Auth: `account.create(ID.unique(), email, password, name)` seguido de `account.createEmailPasswordSession(email, password)` |
| Fase | **2** |

A partir da fase 2 o app é **travado por login** (`ESPECIFICACAO-MOBILE.md`, seção "Fase 2"). O colecionador cria a conta pelo próprio app. O cadastro é **simples**: nome, e-mail e senha. Nada além disso.

Critério de pronto (enxuto):
- funciona sem crash nem fluxo sem saída;
- está certo nos temas light e dark;
- respeita a safe area;
- usa os textos oficiais;
- tem toque de 44 pt e a11y.

Sem animações extras.

## 1. Layout

```
┌───────────────────────────────┐
│ (‹)                           │  IconButton glass "Voltar", insets.top + 8 → volta ao Login
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  topo ink (≈ 20% da altura), menor que o do Login
│░░░      [ LOGO 120pt ]     ░░░│  logo.png
├───────────────────────────────┤
│  Crie sua conta               │  display-lg font-display-black ink-fg (accessibilityRole header)
│  Sua coleção de miniaturas,   │  body ink-fg/70
│  organizada.                  │
│                               │
│  Nome                         │
│  [👤 Como quer ser chamado  ] │  Input (leftIcon User)
│                               │
│  E-mail                       │
│  [✉  voce@email.com         ] │  Input (leftIcon Mail)
│                               │
│  Senha                        │
│  [🔒 ••••••••            👁 ] │  Input password (leftIcon Lock) com mostrar/ocultar
│  Mínimo de 8 caracteres.      │  hint caption (sempre visível; vira erro quando inválido)
│                               │
│  ⚠ Não foi possível criar…    │  banner de erro (só erros gerais, ver §4)
│                               │
│  [        Criar conta       ] │  Button primary lg fullWidth
│                               │
│  Já tem conta? Entrar         │  body-sm ink-fg/70 + link primary-text (min-h-11)
└───────────────────────────────┘  + insets.bottom + 16
```

- A estrutura é a mesma do Login (`02-login.md` §2):
  - `ScrollView` com `keyboardShouldPersistTaps="handled"` dentro de `KeyboardAvoidingView`;
  - gutter de 24 pt;
  - largura máxima de 440 pt centralizada;
  - o teclado nunca cobre o campo ativo nem o botão.
- **Sem campo de confirmação de senha**, por decisão do usuário. O olho de mostrar/ocultar é a forma de conferir o que foi digitado.
- O botão é `primary`, não `flame`. O `flame` fica reservado a "Entrar" e "Começar" (DS §2).
- Sem marca d'água nem gradiente no topo. É um passo de formulário e a logo basta.

## 2. Hierarquia
1. Título "Crie sua conta"
2. Campos (nome → e-mail → senha)
3. CTA "Criar conta"
4. Saída "Já tem conta? Entrar"

## 3. Campos e validação no app

A validação no app acontece ao sair do campo e ao enviar. O erro de campo só aparece depois do primeiro blur ou da primeira tentativa de envio; a partir daí, o campo revalida enquanto o usuário digita.

| Campo | Config | Validação | Mensagem (texto oficial) |
|---|---|---|---|
| Nome | `autoComplete="name"`, `textContentType="name"`, `autoCapitalize="words"`, `returnKeyType="next"` | obrigatório; 2 a 60 caracteres (após `trim`) | "Informe seu nome." / "Use no máximo 60 caracteres." |
| E-mail | `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`, `textContentType="username"`, `returnKeyType="next"` | obrigatório; formato de e-mail; enviado em minúsculas e sem espaços | "Informe seu e-mail." / "E-mail inválido." |
| Senha | `variant="password"`, `autoComplete="new-password"` (Android: `"password-new"`), `textContentType="newPassword"`, `returnKeyType="go"` (envia) | obrigatória; **mínimo de 8 caracteres** (regra do Appwrite); máximo de 256 | "Crie uma senha." / "A senha precisa ter pelo menos 8 caracteres." |

- "Criar conta" fica **sempre habilitado**. Ao tocar com erro, o foco vai para o primeiro campo inválido.
- O campo Nome recebe foco automático ao abrir a tela.
- O hint "Mínimo de 8 caracteres." fica visível desde o início; com erro, o texto de erro o substitui.
- `textContentType="newPassword"` deixa o iOS sugerir uma senha forte e salvá-la no chaveiro. Isso conta como autofill funcionando.

## 4. Erros do servidor (Appwrite) → texto oficial

| Situação (Appwrite) | Onde aparece | Texto oficial |
|---|---|---|
| E-mail já cadastrado (`409 user_already_exists`) | erro **no campo E-mail** + link abaixo do campo "Entrar com este e-mail" | "Este e-mail já está cadastrado." |
| Senha fraca: curta demais (`400`, argumento `password`) | erro **no campo Senha** | "Senha fraca. Use pelo menos 8 caracteres." |
| Senha comum demais (`400`, argumento `password`, **só se** a política de dicionário estiver ligada no Appwrite) | erro no campo Senha | "Essa senha é muito comum. Escolha outra." |
| Senha com dados pessoais (`400 password_personal_data`, **só se** a política estiver ligada) | erro no campo Senha | "A senha não pode conter seu nome ou e-mail." |
| Muitas tentativas (`429`) | banner | "Muitas tentativas. Aguarde alguns minutos e tente de novo." |
| Sem rede / timeout | banner | "Sem conexão. Verifique sua internet e tente novamente." |
| Qualquer outro erro | banner | "Não foi possível criar sua conta agora. Tente novamente." |

- O banner é o mesmo do Login: `rounded-md bg-flame-soft border border-flame/40 px-3 py-2.5`, com `AlertCircle` flame e texto `body-sm`, posicionado acima do botão.
- Todo erro é anunciado ao leitor de tela.
- Os textos de erro não usam ponto de exclamação e nunca mostram a mensagem técnica do servidor.
- "Entrar com este e-mail" leva a `router.replace({ pathname: "/login", params: { email } })`, com o e-mail já preenchido no Login.
- "Curta demais" e "comum demais" chegam do servidor com o mesmo código `400` no argumento `password`. Como o app já barra senhas com menos de 8 caracteres antes de enviar, um `400` em `password` com 8 ou mais caracteres é tratado como "comum demais".
- As políticas de senha (dicionário, dados pessoais) são configuradas pelo Alicerce no Appwrite. O app só precisa mapear os códigos acima; se uma política estiver desligada, o erro correspondente nunca aparece.

## 5. Estados

| Estado | Visual / comportamento |
|---|---|
| **Inicial** | Campos vazios, foco em Nome. |
| **Enviando** | Botão em `loading` ("Criar conta" + spinner). Campos com `editable={false}`. Voltar, link "Entrar" e back do Android ficam desativados até a resposta. |
| **Sucesso** | Conta criada **e** sessão aberta: `router.replace("/(tabs)")` (o voltar nunca retorna ao cadastro) + Toast success "Conta criada. Bem-vindo, {primeiro nome}." |
| **Conta criada, mas a sessão falhou** | `router.replace({ pathname: "/login", params: { email } })` com o banner **informativo** (borda `info`, não `flame`): "Conta criada. Entre para continuar." |
| **Erro de campo** (validação ou servidor, §3–§4) | Erro abaixo do campo, borda `danger`, foco no campo. A senha **não** é apagada. |
| **Erro geral** (§4) | Banner acima do botão; os campos mantêm os valores digitados. |
| **Aberta já com sessão** | Redireciona para `/(tabs)` antes de renderizar. |

Sem empty state (a tela não tem lista).

## 6. Navegação

| Ação | Destino |
|---|---|
| "Já tem conta? Entrar" / botão voltar / back do Android | `router.back()`. Se não houver histórico, `router.replace("/login")`. |
| "Entrar com este e-mail" | `router.replace({ pathname: "/login", params: { email } })` |
| Sucesso | `router.replace("/(tabs)")` |

## 7. Acessibilidade
- O título usa `accessibilityRole="header"`.
- Os labels dos campos são visíveis, não só placeholder.
- Ordem de foco: voltar → nome → e-mail → senha → mostrar senha → Criar conta → Entrar.
- O olho de mostrar/ocultar tem os labels "Mostrar senha" / "Ocultar senha" e toque de 44 pt.
- O link "Entrar" tem `accessibilityRole="link"` e `min-h-11`.

## 8. Fora do escopo desta tela (fase futura)
- Foto de perfil e demais dados do colecionador (cidade, bio etc.) ficam para depois e serão editados na tela de **Perfil** (`07-perfil.md`).
- Confirmação de e-mail por link (Appwrite `createVerification`).
- Medidor de força de senha.
- Aceite de termos e política de privacidade: pendência para o Orquestrador (ver §9).

## 9. Pendências para o Orquestrador
1. **Exclusão de conta pelo app.** A App Store exige isso de apps que permitem criar conta dentro do app (guideline 5.1.1(v)). Proposta: item "Excluir conta" no Perfil, com confirmação, **antes de publicar na loja**. Não bloqueia os testes pelo Expo Go.
2. **Política de privacidade e termos.** As lojas pedem uma URL de política de privacidade para apps com conta. Sugestão: uma linha de caption abaixo do botão, "Ao criar sua conta, você concorda com os Termos e a Política de Privacidade.", com links, assim que existir uma URL.

## 10. Critérios de aceite
- [ ] Cria a conta com nome, e-mail e senha e entra direto nas tabs.
- [ ] Mínimo de 8 caracteres validado no app e no servidor, com o texto oficial.
- [ ] E-mail já cadastrado mostra "Este e-mail já está cadastrado." e oferece "Entrar com este e-mail".
- [ ] Sem campo de confirmação de senha; olho de mostrar/ocultar funcionando.
- [ ] Nenhum crash e nenhum botão morto; o voltar do Android funciona.
- [ ] Ink nos dois temas; teclado nunca cobre o campo ativo nem o botão; safe area respeitada.
- [ ] Toques de 44 pt; labels de a11y corretos.
- [ ] Autofill de nova senha funciona (iOS sugere senha forte).
