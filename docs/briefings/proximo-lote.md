# Handoff: lote 4 (28/09/2026)

Os agentes começaram do zero (`/clear`). Leia antes:
- `docs/PLANO-ENTREGA.md`: o plano, os lotes e as decisões aprovadas;
- `C:\Dev\backendToSave\docs\API-V2.md`: o contrato da API.

## Estado

**Lotes 0 a 3 entregues e em produção:** segurança, Notícias, Notificações e Clube da Troca.
- O APK de preview do lote 3 está gerado e aguarda o teste do usuário.
- Os `main` dos três repositórios estão enviados:
  - backend `8a45a18`;
  - web `5c420c7`;
  - app `67a38b5`.

**Regras que continuam valendo:**
- O `main` do backend publica em produção. Trabalhe em branch; o Orquestrador faz o merge e o push.
- Os ids UUID são gerados pelo banco (`gen_random_uuid()`). Nunca use `randomUUIDv7` nem `$defaultFn`, porque a imagem Docker usa Bun 1.1.30.
- As migrations são aditivas e idempotentes, e o SQL roda no DBeaver ANTES do código. Exceção: um DROP roda DEPOIS do deploy do código.
- Antes de reportar: web com `tsc`, lint, `build` e o site testado em modo produção local; backend com e2e, `tsc` e `docker build`.
- **Decisão do usuário:** NÃO trocar os segredos (senha do Postgres e `APPWRITE_API_KEY`).

## A fazer no lote 4

### 1. Páginas legais do site (Lanterna), em `C:\Dev\tosave-web`
- **Branch `feat/paginas-legais`** (WIP em `0e639e2`, já enviada): já existem `/privacidade`, `/termos` e o `legal-page.tsx`, com os links no rodapé, no cadastro e no sitemap, mas **ainda não foram revisados**.
- **`/privacidade`:** o texto vem da nota "Privacidade". O tradutor trocou o nome do app por **"Economizar"**; substitua SEMPRE por **ToSave**. Revise só a forma, sem mudar o sentido jurídico.
  - Confira se o texto cobre: dados coletados (nome, e-mail, telefone opcional, coleção, anúncios do Clube da Troca, token de push); **o telefone é mostrado a outro colecionador quando ele toca em "Revelar contato"**; hospedagem (Hostinger e Appwrite no mesmo servidor); exclusão de conta pelo app; notificações opcionais; e-mail de contato.
  - O que faltar, **não invente**: liste para o usuário decidir.
- **`/termos`:** a nota "TERMOS" é um modelo genérico de site ou blog. Adapte para o ToSave (comunidade de colecionadores e Clube da Troca, com negociação direta entre usuários fora do app e sem pagamento no app).
  - Os dados que só o usuário define ficam como `[A DEFINIR: ...]`: responsável legal, CNPJ ou CPF, cidade do foro e e-mail oficial.
- **Validação:** teste em modo produção local, com `next build` e `next start` numa porta livre, usando `Host: tosave.cloud`. Depois `typecheck`, `lint`, `build` e commit na branch.

### 2. Limpeza do legado (Alicerce), em `C:\Dev\backendToSave`
- **Branch `feat/limpa-legado`**, a partir do `main`, que está limpo. **Nada foi alterado ainda**: a verificação do auto mode caiu antes de ele começar.
- **Remover os módulos antigos**, desde que nada da v2 os importe: `src/modules/news` (antigo), `trade` (antigo), `notifications` (antigo), `garage`, e o comentário de referência no `src/index.ts`.
- **Remover do schema e do código:**
  - a coluna `users.expo_push_token`, em `users.ts`, `middleware/auth.ts` e `types/elysia.d.ts`;
  - as tabelas `garages` e `garage_items`, em `schema/index.ts`, `garages.ts` e `garages_item.ts`.
- ⚠️ **Achado:** o `src/modules/app/account.service.ts` (exclusão de conta v2) faz DELETE e UPDATE em `garages`/`garage_items`. Tire isso também, senão a exclusão de conta quebra depois do DROP.
- **Migration de DROP:** `DROP ... IF EXISTS`. Ela roda **depois** do deploy do código; entregue o SQL no relatório.
- **Validação:** todos os e2e (inclusive a exclusão de conta), `tsc`, `docker build` e commit na branch.

## Para o usuário fechar o lote 4 (depois dos itens acima)

1. Revisar os `[A DEFINIR]` dos termos e os pontos pendentes da política.
2. O Orquestrador faz os merges e envia os `main`. O usuário faz o deploy do `tosave-api-v2` e depois do `tosave-web`.
3. No DBeaver, rodar o SQL de DROP do legado, **depois** do deploy.
4. No painel, em Configurações, trocar as URLs de termos e privacidade para `https://tosave.cloud/termos` e `https://tosave.cloud/privacidade`. O app lê essas URLs, então não precisa de APK novo.
5. Opcional: campo de "motivo" na remoção de anúncio (moderação), se o usuário quiser.

## Depois

- **Lote 5:** app web (`app.tosave.cloud`).
- **Lote 6:** lojas.
