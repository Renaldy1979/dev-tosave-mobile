# Lote 1 — Onboarding/Splash, Login e Home

Brief do Orquestrador para o Forja. Leia inteiro antes de começar.

## Respostas às suas 3 dúvidas

**1. Quantas telas:** **três** — onboarding/splash, login e home. O "só estas duas" foi erro de redação meu.

**2. Contagem de carros:** são **25**, não 24. Conferi listando os ids do `carsMock` um a um:

`car-datsun-510, car-nissan-skyline-r34, car-toyota-supra-a80, car-mazda-rx7-fd, car-honda-civic-eg, car-subaru-impreza-wrx, car-mitsubishi-lancer-evo, car-mazda-mx5-na, car-nissan-fairlady-z, car-bmw-e30-m3, car-porsche-911-rs, car-ford-mustang-mach-e, car-lancia-stratos, car-ferri-512-bb, car-de-tomaso-pantera, car-rangie-classic, car-jeep-wrangler, car-land-rover-defender, car-mustang-boss-302, car-datsun-240z-rlc, car-tomica-lambo-countach, car-tomica-tesla-model-3, car-minigt-rwb-porsche, car-minigt-typer-r34, car-minigt-corvette-c8`

**Não adicione nem remova nada.** Está correto como está.

**3. Decisões da Aquarela:** elas **já foram aplicadas por ela** nos arquivos de `docs/design/`. **As specs são a fonte de verdade**, não esta mensagem. A lista abaixo é só referência consolidada.

## Decisões da Aquarela (já refletidas nas specs)

1. **Navegação pública.** Home, busca e detalhe do carro abrem **sem sessão**. O app cai na Home depois do splash, ou do onboarding na primeira vez.
2. **Login é modal**, não tela cheia, e abre por cima da tela atual quando o usuário tenta adicionar à coleção ou abrir Coleção/Perfil. Existe o hook `useRequireSession()`. Depois de entrar, **a ação pretendida acontece sozinha** — o carro entra na coleção ou a tab abre, sem o usuário tocar de novo. Fechar sem entrar não muda nada.
3. **Título do modal muda conforme o motivo**, por exemplo "Entre para salvar sua coleção" quando veio do coração.
4. **`LoginGate`**: se Coleção ou Perfil forem abertos por link direto sem sessão, a tela mostra um aviso com botão Entrar, em vez de redirecionar — evita loop.
5. **TabBar** mostra "Entrar" no lugar de Perfil para visitante, e não exibe contador.
6. **Coração adiciona à coleção** e pede login se não houver sessão.
7. **Superfícies sempre escuras (ink), nos dois temas:** splash, onboarding, login, TabBar e topo da Home. Motivo: o amarelo da logo não tem contraste em fundo claro. Fora dessas cinco, o tema claro vale normalmente.
8. **Várias séries podem ter `isDefault`**, então a Home tem carrossel de séries em destaque, em faixa horizontal no mobile.
9. **Busca sem resultado** usa o título oficial `Nenhuma miniatura disponível no momento.` mais uma linha auxiliar.
10. **Sair** leva para a Home como visitante, não para o login.
11. **Apenas sob `__DEV__`**, temporários da fase de mockups: o botão de preencher dados de exemplo no login (use `getDemoCredentials()`) e o simulador de estados.

## Suas perguntas de detalhe

- **Texto exato do botão de exemplo:** siga o que a spec `02-login.md` definir. Se ela não definir, use **"Preencher dados de exemplo"**.
- **Superfícies ink:** são as cinco do item 7. Não invente outras.
- **Regras do splash:** valem as da spec `01-onboarding-splash.md`. Não há regra extra minha. O splash já é segurado até as fontes carregarem, no `app/_layout.tsx`.
- **Senha no login:** o login é **simulado**. Aceite as credenciais que `signIn` já implementa em `src/services/auth.ts` — você escreveu esse serviço, mantenha o comportamento dele. Não crie senha nova nem hardcode fora do service.
- **Home para visitante:** exatamente como a spec `03-home.md` define.
- **TabBar:** o que estiver em `componentes.md` mais o item 5 acima.

**Regra geral: quando esta mensagem e a spec divergirem, a spec vence.** Se a spec for omissa e a dúvida for de layout, pergunte à Aquarela com `maestri ask "Aquarela" "..."`. Se for de escopo, pergunte a mim.

## Escopo do lote

Implementar **onboarding/splash, login e home**, conforme `docs/design/telas/01-onboarding-splash.md`, `02-login.md` e `03-home.md`, mais `README.md`, `design-system-mobile.md` e `componentes.md`.

Criar também os componentes de `src/components/ui/` que essas telas exigirem — Button, Input, SearchBar, CarCard, Badge, EmptyState, Skeleton, Header, FilterChips, conforme `componentes.md`. Eles serão reaproveitados nos próximos lotes, então capriche na API.

**Continuam como placeholder:** busca dedicada, detalhe do carro, coleção e perfil.

## Regras

- Dados **somente** via `src/services/`. Nenhuma tela importa de `src/mocks/`.
- Estados de carregamento com `Skeleton`; empty state oficial `Nenhuma miniatura disponível no momento.`
- Proibido `TODO`, `FIXME` e `any`.
- Não altere `tailwind.config.js`, `metro.config.js`, `docs/` nem `_brand/`.
- Não quebre as assinaturas dos services já entregues. Precisando de algo novo na camada de dados, adicione sem quebrar o que existe.
- **Não rode `expo start`** nem mexa no terminal Pista — a validação é do Orquestrador.
- Ao terminar: `npx tsc --noEmit`.

## Como reportar

Mensagem **curta** (o `maestri ask` corta mensagens longas):

`maestri ask "Claude Code" "lote1 ok: N arquivos, tsc zero erros"`

Se precisar detalhar, escreva em `docs/briefings/lote-01-relatorio.md` e me avise pelo recado curto.
