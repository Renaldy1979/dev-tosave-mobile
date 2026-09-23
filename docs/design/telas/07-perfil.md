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
- Alteração de senha não entra na fase 1 (login simulado, sem senha real).

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
- [ ] Sair pede confirmação e volta à Home como visitante; o voltar não reabre o Perfil.
- [ ] Nenhum item de administração visível, independente do `role`.
