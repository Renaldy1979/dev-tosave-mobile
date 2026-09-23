# 07 — Perfil

| | |
|---|---|
| Rota | `app/(tabs)/perfil.tsx` → `/perfil` (tab **Perfil**) |
| Acesso | **exige sessão**. Sem sessão, a tab aparece como "Entrar" (`LogIn`) e o toque abre o login em modal (`next=/perfil`); por deep link, a tela mostra o `LoginGate` |
| Dados | `auth.getSession()` (User: name, email, role, status), `collection.summary()`, `users.updateProfile({ name, email })`, `auth.signOut()` |

Dados do colecionador, preferências do app e saída. Sem telas administrativas (o app nunca mostra nada de ADMIN, mesmo que `role = ADMIN`).

## 1. Layout

```
┌───────────────────────────────┐
│ Perfil                        │  Header large
│                               │
│            ╭────╮             │  Avatar 88 com anel flame (2 pt)
│            │ AS │             │  iniciais font-display
│            ╰────╯             │
│         Ana Souza             │  h2 font-display fg
│      ana@email.com            │  body-sm fg-muted
│    [ ✎ Editar perfil ]        │  Button outline sm
│                               │
│ ┌─────────┬─────────┬───────┐ │  resumo da coleção (StatTile ×3), tocável → Coleção
│ │   48    │   41    │   7   │ │
│ │ ITENS   │ MODELOS │REPETID│ │
│ └─────────┴─────────┴───────┘ │
│                               │
│ APARÊNCIA                     │  eyebrow fg-subtle
│ [ ☾ Escuro | ☀ Claro | ▢ Sistema ] │ SegmentedControl
│                               │
│ CONTA                         │
│ ┌───────────────────────────┐ │  grupo surface rounded-lg border
│ │ ♥  Minha coleção        › │ │  ListRow → /colecao
│ │ ✉  E-mail   ana@email.com │ │  ListRow informativa
│ │ 🔒 Alterar senha        › │ │  ListRow → sheet "Alterar senha" (fase 2, §3.1)
│ └───────────────────────────┘ │
│                               │
│ ┌───────────────────────────┐ │
│ │ ⎋  Sair                   │ │  ListRow danger
│ └───────────────────────────┘ │
│                               │
│      [logo-light / logo 96]   │  Logo auto, opacidade 60%
│         Versão 1.0.0          │  caption fg-subtle (expo-constants)
└───────────────────────────────┘
```

- `ScrollView` com gutter 16, seções separadas por 32 pt.
- Avatar: iniciais do nome (até 2 letras). Não há upload de foto na fase 1.
- **Fase futura (depois da fase 2):** foto de perfil e demais dados do colecionador serão editados aqui, no Perfil. O Cadastro (`08-cadastro.md`) pede só nome, e-mail e senha.
- **Fase 2:** "Sair" faz `router.replace("/login")` (app travado). O `LoginGate` deixa de existir.

## 2. Hierarquia
1. Identidade (avatar, nome, e-mail)
2. Números da coleção
3. Aparência (tema)
4. Conta
5. Sair
6. Marca e versão

## 3. Editar perfil
BottomSheet `snapPoints ["dynamic"]`, título "Editar perfil":
- Input "Nome" (`autoComplete="name"`, obrigatório, 2–60 caracteres).
- Input "E-mail" (obrigatório, formato válido).
- Footer: "Cancelar" (ghost) + "Salvar" (primary; habilitado só se algo mudou e é válido; loading ao salvar).
- Sucesso: fecha o sheet, atualiza a tela, Toast success "Perfil atualizado."
- Erro de validação: inline nos campos (mesmas mensagens do login para e-mail; "Informe seu nome.").
- Erro do service: banner no sheet "Não foi possível salvar agora. Tente novamente." (sheet continua aberto com os valores).
- Alteração de senha não entra na fase 1 (login simulado, sem senha real). Na fase 2, ver §3.1.

## 3.1 Alterar senha (fase 2)

Entrada: ListRow "Alterar senha" (ícone `Lock`, `ChevronRight`) no grupo CONTA, logo abaixo de E-mail. Abre um BottomSheet `snapPoints ["dynamic"]` com o título "Alterar senha", igual ao "Editar perfil". Os inputs usam `BottomSheetTextInput`, e o footer fica acima do teclado.

| Campo | Config | Validação no app | Mensagem (texto oficial) |
|---|---|---|---|
| Senha atual | `variant="password"` com olho, `autoComplete="password"`, `textContentType="password"`, `returnKeyType="next"`, foco automático | obrigatória | "Informe sua senha atual." |
| Nova senha | `variant="password"` com olho, `autoComplete="new-password"` (Android: `"password-new"`), `textContentType="newPassword"`, `returnKeyType="go"` (envia), hint "Mínimo de 8 caracteres." | obrigatória; mínimo de 8 caracteres | "Crie uma nova senha." / "A senha precisa ter pelo menos 8 caracteres." |

- **Sem confirmação de senha**, igual ao Cadastro: o olho de mostrar e ocultar faz esse papel.
- Footer: "Cancelar" (`ghost`) + "Salvar" (`primary`, loading ao salvar). "Salvar" fica sempre habilitado; ao tocar com erro, o foco vai para o primeiro campo inválido.
- O erro de campo só aparece depois do primeiro blur ou da primeira tentativa de envio.
- Chamada: `account.updatePassword(novaSenha, senhaAtual)`.

| Resultado (Appwrite) | Onde aparece | Texto oficial |
|---|---|---|
| Sucesso | fecha o sheet + Toast success; **a sessão continua** (não desloga) | "Senha alterada." |
| `401` (senha atual incorreta) | erro no campo Senha atual; o campo é limpo e recebe foco | "Senha atual incorreta." |
| `400` (senha fraca) | erro no campo Nova senha | "Senha fraca. Use pelo menos 8 caracteres." |
| `429` | banner no sheet | "Muitas tentativas. Aguarde alguns minutos e tente de novo." |
| Sem rede / timeout | banner no sheet | "Sem conexão. Verifique sua internet e tente novamente." |
| Qualquer outro erro | banner no sheet | "Não foi possível alterar a senha agora. Tente novamente." |

- O banner é o mesmo do Login (`bg-flame-soft border-flame/40` + `AlertCircle`). Todo erro é anunciado ao leitor de tela, e o sheet continua aberto com os valores digitados.
- Enquanto a chamada não volta: campos com `editable={false}`, "Cancelar" desativado, e arrastar para baixo ou o back do Android não fecham o sheet.
- Fechar sem salvar descarta os campos. Ao reabrir, o sheet começa vazio (senhas nunca ficam guardadas em estado).

## 4. Tema
- SegmentedControl com **Escuro** (`Moon`), **Claro** (`Sun`), **Sistema** (`Smartphone`). Padrão: Escuro.
- Troca imediata, com crossfade da tela inteira de 200 ms (snapshot + fade) para evitar piscar; sem animação com movimento reduzido.
- Persistido em `tosave.theme`. "Sistema" acompanha `useColorScheme()` em tempo real.

## 5. Sair
- Toque em "Sair" abre Dialog: título "Sair da sua conta?", texto "Você continua podendo explorar as miniaturas, mas precisará entrar de novo para ver sua coleção.", ações "Sair" (`danger`) + "Cancelar" (`ghost`).
- Confirmar: `auth.signOut()` → limpa sessão e store da coleção → `router.replace("/")` (Home como visitante; a tab Perfil volta a ser "Entrar"). Preferência de tema e `onboarding.seen` são mantidos.

## 6. Navegação

| Ação | Destino |
|---|---|
| Resumo da coleção / "Minha coleção" | `router.push("/colecao")` (troca de tab) |
| Tocar em "REPETIDOS" | `router.push("/colecao?dup=1")` |
| Editar perfil | BottomSheet na própria tela |
| Alterar senha (fase 2) | BottomSheet na própria tela (§3.1) |
| Sair | Dialog → `router.replace("/")` |

## 7. Estados

| Estado | Visual |
|---|---|
| **Carregando** (> 150 ms) | `ProfileSkeleton` (círculo 88 + 2 linhas + 3 stats); seções de aparência e sair já renderizadas (não dependem de dados) |
| **Conteúdo** | layout acima |
| **Coleção vazia** | StatTiles mostram `0` (números, não empty state) e, abaixo deles, link `primary-text` "Explorar miniaturas" → `/busca` |
| **Sem nome** | Avatar com ícone `User`; título mostra o e-mail |
| **Erro ao carregar o resumo** | `ErrorState sm` no lugar dos StatTiles; o resto da tela funciona |
| **Erro ao carregar o usuário** | `ErrorState lg` + "Tentar novamente", mantendo visível o botão "Sair" (o usuário nunca fica preso) |
| **Erro ao sair** | Toast "Não foi possível sair agora." (na fase 1 o signOut local não deve falhar; o estado existe para a fase 2) |

Nenhuma lista nesta tela, portanto os empty states oficiais não se aplicam aqui.

## 8. Acessibilidade
- Nome como `header`.
- SegmentedControl `radiogroup` com "Tema: Escuro, selecionado, 1 de 3".
- "Sair" com `accessibilityHint="Encerra a sessão neste aparelho"`.

## 9. Critérios de aceite
- [ ] Mostra nome, e-mail e números da coleção do colecionador.
- [ ] Editar nome e e-mail com validação e feedback.
- [ ] Tema Escuro/Claro/Sistema aplicado na hora e persistido.
- [ ] (Fase 2) Alterar senha:
  - senha atual + nova senha com mínimo de 8 caracteres, sem campo de confirmação;
  - erros 401, 400, 429 e sem rede com os textos oficiais;
  - sucesso mostra o Toast "Senha alterada." e mantém a sessão;
  - toques de 44 pt, teclado nunca cobre campo nem botão, certo nos dois temas.
- [ ] Sair pede confirmação e volta à Home como visitante; o voltar não reabre o Perfil.
- [ ] Nenhum item de administração visível, independente do `role`.
