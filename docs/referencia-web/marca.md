# ToSave — Marca e assets

> As variantes abaixo foram **derivadas programaticamente** da logo oficial (`_brand/logo.png`), sem redesenho. O usuário pode substituí-las a qualquer momento por versões finais, **mantendo os mesmos nomes de arquivo**, e nada no código muda.

## Arquivos

| Arquivo | Tamanho | Uso |
|---|---|---|
| `_brand/logo.png` | 644×241, fundo transparente | **Original.** Para fundos escuros (`ink`, `bg` do tema dark). |
| `_brand/logo-light.png` | 644×241, fundo transparente | **Para fundos claros** (tema light fora das superfícies ink). |
| `_brand/logo-car.png` | 644×185, fundo transparente | Só a silhueta do carro, sem wordmark nem chamas. Marca d'água, loading de página, OG image. Para fundos escuros. |
| `_brand/favicon/favicon.ico` | 16, 32, 48 | Favicon de navegador |
| `_brand/favicon/icon-32.png` | 32×32 | `<link rel="icon">` PNG |
| `_brand/favicon/icon-192.png` | 192×192 | PWA / Android |
| `_brand/favicon/icon-512.png` | 512×512 | PWA / splash |
| `_brand/favicon/apple-icon.png` | 180×180, cantos retos (o iOS arredonda) | Apple touch icon |

### Onde colocar no Next.js (App Router)
Copiar para as convenções de arquivo do Next. Assim os `<link>` são gerados automaticamente:
```
_brand/favicon/favicon.ico     → src/app/favicon.ico
_brand/favicon/icon-512.png    → src/app/icon.png
_brand/favicon/apple-icon.png  → src/app/apple-icon.png
_brand/logo.png                → public/brand/logo.png
_brand/logo-light.png          → public/brand/logo-light.png
_brand/logo-car.png            → public/brand/logo-car.png
_brand/favicon/icon-192.png    → public/brand/icon-192.png   (manifest)
_brand/favicon/icon-512.png    → public/brand/icon-512.png   (manifest)
```

## Anatomia da logo

A logo original tem **quatro** cores, não três: além de laranja, amarelo e vermelho, há **linhas brancas** no corpo do carro (vidros e vinco lateral). Elas só aparecem sobre fundo escuro. Por isso a original é, na prática, uma logo "para fundo escuro".

| Elemento | Original (dark) | `logo-light` |
|---|---|---|
| Silhueta do carro | `#FD8401` orange-500 | `#E06E00` orange-600 (contraste 3,3:1 sobre branco, acima do mínimo de 3:1 para gráficos; o 500 dá 2,5:1) |
| Linhas do corpo | branco | `#111114` ink |
| Wordmark "TOSAVE" | `#FFDE21` yellow-500 | `#111114` ink |
| Chamas | `#FF0000` red-500 | `#FF0000` (inalterado) |

O wordmark fica escuro no tema claro porque nenhum amarelo legível sobre branco (yellow-800 `#806C00`) preserva a energia da marca. Um amarelo "sujo" parece erro, e o ink deixa o laranja e o vermelho brilharem.

## Regra de uso por superfície

| Superfície | Logo |
|---|---|
| Navbar, Hero, aside de Auth, faixa ink mobile de Auth (sempre dark) | `logo.png` |
| Tema dark: qualquer superfície | `logo.png` |
| Tema light: sidebar do admin (`bg-surface`), rodapé, telas de erro/404, e-mails | `logo-light.png` |

Componente único `<Logo />` (ver `handoff-forja.md`): recebe `variant?: "auto" | "dark" | "light"`. Com `auto`, renderiza as duas imagens e alterna por CSS (`.light` mostra a light), evitando flash no carregamento. Dentro de `.ink`, força `dark`.

Tamanhos: 96 px de largura (navbar mobile), 128 px (navbar desktop, sidebar), 220 px (Auth). Área de respiro = altura do "T".

## Favicon / ícone do app

Construído a partir da silhueta do carro:
- Quadrado `#0B0B0D` (neutral-950) com raio de 22% (o apple-icon tem cantos retos, porque o iOS aplica a própria máscara).
- Silhueta do carro ocupando 88% da largura, levemente acima do centro.
- Abaixo, uma barra com o **gradiente flame** da marca (amarelo → laranja → vermelho), que funciona como "pista" e dá a assinatura de cor mesmo em 16 px.
- Em 16 e 32 px as linhas brancas do corpo são removidas (viravam ruído). Só a silhueta laranja fica.
- Fundo escuro fixo: funciona em abas claras e escuras do navegador.

**Limitação conhecida:** o carro é muito horizontal (3,5:1). Em 16 px ele fica com ~4 px de altura. É legível como "risco laranja + faixa de fogo", mas um ícone vetorial desenhado para tamanho pequeno (ex.: só a traseira com o aerofólio) seria melhor. Recomendação para quando o usuário tiver um designer de marca.

## Cores de marca: referência rápida

| Token | Hex | Papel |
|---|---|---|
| `orange-500` | `#FD8401` | primary / carro |
| `yellow-500` | `#FFDE21` | accent / wordmark |
| `red-500` | `#FF0000` | flame / chamas |
| `neutral-950` | `#0B0B0D` | ink / fundo |
| gradiente flame | `#FFDE21 → #FD8401 (45%) → #FF0000` | assinatura |
