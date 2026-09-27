# Plano de desenvolvimento e entrega (a partir de 26/09/2026)

Guia vivo: o Orquestrador atualiza este arquivo a cada lote entregue. As referências de detalhe estão em:
- `backendToSave/docs/NEWS-E-TROCA.md`: levantamento de notícias, clube da troca, notificações e garagens;
- `backendToSave/docs/API-V2.md`: contrato da API;
- `tosave-web/docs/briefings/`: briefings do painel e do site.

## Onde estamos

| Frente | Situação |
|---|---|
| **api** (`api.tosave.cloud`) | v2 em produção: catálogo, coleção, admin e rotas públicas da vitrine |
| **adm** (`admin.tosave.cloud`) | lotes 1 e 2 em produção, mais a vitrine e o mínimo de membros |
| **site** (`tosave.cloud`) | no ar: home, vitrine curada e detalhe. A vitrine enxuta está enviada e aguarda deploy |
| **app** (`app.tosave.cloud`) | só cadastro, login e boas-vindas |
| **mobile** | v2 no APK de preview, com o código `toy` nos cards |

## Como cada lote é entregue

1. **Backend (Alicerce):**
   - trabalha em branch;
   - migrations aditivas;
   - roda os testes e2e e o `docker build`;
   - informa o SQL da migration.
2. **Web (Lanterna) e mobile (Forja):**
   - seguem o contrato publicado pelo Alicerce;
   - rodam `tsc`, lint e build;
   - testam o site em modo produção local.
3. **Orquestrador:** revisa, faz os merges e envia o `main`.
4. **Usuário:**
   - roda o SQL no DBeaver **antes** do deploy;
   - faz o deploy no EasyPanel (API primeiro, web depois);
   - valida a web no navegador e o mobile no APK.
5. **Rollback:** o EasyPanel volta ao deploy anterior. As migrations aditivas não quebram o código antigo.

## Lotes

### Lote 0: segurança e ajustes (entregue em 27/09)
- **Desligar as rotas antigas** `news`, `trade`, `notifications` e `garagens`, que estão ativas em produção e têm três falhas graves:
  - push para todos sem ser admin;
  - anúncio em nome de outro usuário;
  - notícia criada por qualquer um.

  Nada usa essas rotas. O código fica no repositório como referência. *(Alicerce; deploy da API)*
- **Vitrine enxuta:** já enviada. *(deploy do `tosave-web`)*
- **Atualizar o papel do Forja** para a arquitetura v2, antes de ele pegar o lote 1. *(Orquestrador)*

### Lote 1: Notícias (em andamento desde 27/09)
- **Backend:** `/v2/news`, com lista paginada, detalhe e só as publicadas; `/admin/news`, com criar, editar, publicar ou despublicar, apagar e imagem no Storage. **Só admin publica.**
- **Painel:** tela de Notícias, com lista, editor e imagem.
- **Mobile:** feed de notícias e detalhe; o link externo abre no navegador.
- **Site (opcional):** as últimas notícias na home, como prova de comunidade viva e ajuda no SEO.

### Lote 2: Notificações (base para a troca)
- **Backend:**
  - registro do token de push do Expo por usuário;
  - envio **só pelo servidor**, por eventos, sem rota aberta de envio;
  - caixa de entrada com lidas e não lidas.
- **Painel:** envio manual de aviso para todos, só para admin e com confirmação.
- **Mobile:**
  - permissão de push;
  - caixa de notificações com badge;
  - o toque na notificação leva à tela certa.

### Lote 3: Clube da Troca
- **Backend `/v2/trade`:**
  - anúncio de **troca ou venda** de um carro **da própria coleção**;
  - carros desejados;
  - finalizar e cancelar;
  - "meus anúncios".
- **Painel:** moderação, com a lista de todos os anúncios e a opção de apagar anúncio abusivo.
- **Mobile:**
  - vitrine de anúncios com filtro Troca e Venda;
  - criar anúncio;
  - meus anúncios;
  - contato pelo WhatsApp.
- **Referência de UX:** o front web antigo (`C:\Dev\frontEndToSaveWEB`, `trade/*`), com as correções do levantamento.
- **Notificações do lote 2:** "novo anúncio que tem um carro que você deseja", "seu anúncio foi finalizado" e similares.

### Lote 4: Dívidas e polimento
- **Segredos:** trocar a senha do Postgres e a `APPWRITE_API_KEY`.
- **Site:** página de política de privacidade e o link no rodapé.
- **Painel:** os ajustes de uso que aparecerem.

### Lote 5: App web (`app.tosave.cloud`)
- O mesmo que o mobile, para membros logados: catálogo completo, coleção, busca, perfil, notícias e clube da troca.
- Reaproveita os componentes do site e do painel, e os contratos dos lotes 1 a 3.
- O guest que se cadastra no site cai direto no app web.

### Lote 6: Lojas
- Build de produção do Android na Play Store e depois do iOS.
- Ícones, capturas de tela, política de privacidade e versão mínima pelo `app_config`.

## Decisões de produto (aprovadas pelo usuário em 27/09/2026: todas conforme a recomendação; #8 = uso zero, tabelas v2 redesenhadas sem migrar dados)

| # | Pergunta | Recomendação |
|---|---|---|
| 1 | Notícia só admin publica? | **Sim.** |
| 2 | Notificações: só automáticas pelo servidor, mais o aviso manual do admin? | **Sim.** |
| 3 | Anunciar exige ter o carro na coleção? | **Sim.** Evita anúncio falso. |
| 4 | O anúncio reserva a unidade, ou seja, não pode anunciar a mesma unidade duas vezes? | **Sim.** Um anúncio ativo por unidade da coleção. |
| 5 | Os "carros desejados" vêm do catálogo geral ou da própria coleção? | **Do catálogo geral.** Buscar na própria coleção era um erro do front antigo. |
| 6 | O telefone do anunciante fica exposto direto ou atrás de um botão "revelar contato"? | **"Revelar contato"**, só para logados, e o telefone nunca vai na listagem. |
| 7 | Garagens: entram, ficam para depois ou saem? | **Saem por ora.** Há 0 registros e nenhuma tela; voltam se houver demanda. |
| 8 | As tabelas antigas estão zeradas: é uso real zero ou dado perdido? | Confirmar. Se foi uso zero, as tabelas v2 podem ser redesenhadas sem migrar dados. |
| 9 | Venda com preço: só informativo, sem pagamento no app? | **Só informativo.** A negociação acontece no WhatsApp. |
