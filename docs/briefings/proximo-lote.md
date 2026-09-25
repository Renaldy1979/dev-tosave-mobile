# Handoff: próximo lote (25/09/2026)

Os agentes começaram do zero (`/clear`). Leia antes:
- `docs/ARQUITETURA-V2.md`: a decisão de arquitetura;
- `C:\Dev\backendToSave\docs\API-V2.md`: o contrato das rotas `/v2`.

## Estado

- **App:** `C:\Dev\tosave-mobile` já usa o backend v2 por REST (`src/services/_http.ts`, JWT do Appwrite). O Appwrite fica só para o login e as imagens.
- **Backend:** `C:\Dev\backendToSave`, branch `v2`. O `.env.local` aponta para o dump local de produção.
- **Nada está commitado.** NUNCA commitar no `main` do `backendToSave`: ele publica em produção.
- **Backend local do usuário:** porta 3333, no terminal "Shell". Não mate esse processo; para testar, use a sua instância na porta 3334.
- **Contas no Appwrite, ambas com UUID:**
  - `renaldy.sousa@gmail.com`: admin, conta REAL, não gravar nela;
  - `cstein78@gmail.com`: conta de teste, liberada.
- **Teste no aparelho:** APK de preview (`eas build -p android --profile preview`) ou o build de desenvolvimento com o Metro.

## A fazer (Forja)

1. **Bug: lista deslizante invisível na Coleção.** Na tela `app/(drawer)/colecao.tsx`:
   - o botão Ordenar e o toque longo nos carros não mostram nada;
   - o Todos/Repetidos, no mesmo cabeçalho, funciona, então os toques chegam;
   - os `BottomSheet` desta tela não aparecem.
   - A tela passou a usar `FlashList` na reescrita; na versão do HEAD funcionava.
   - A troca de `enableDynamicSizing` por `onLayout` no `BottomSheet.tsx` não resolveu.
   - Conferir as listas do Perfil, que usam o mesmo componente.
2. **Tirar o +/− do card da lista da Coleção.** A quantidade passa a ser alterada só no Detalhe do carro, que já tem isso.
3. **Diálogo do Sair:** já centralizado e sem ícone; falta a validação do usuário.

## Decisões pendentes do usuário

- Destaques: 31 séries (Postgres) ou as 8 com logo.
- A senha do Postgres está exposta no `docker-compose.yml`.
- O `/admin` está aberto em produção hoje (a v2 exige admin).
- A URL do backend de produção, com HTTPS, antes do build de loja.
- **Futuro:** versão web do app com o painel admin em `tosave.cloud`.
