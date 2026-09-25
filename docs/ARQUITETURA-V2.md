# Arquitetura v2: Appwrite (auth e storage) + backend próprio (dados)

Decidida em 24/09/2026. Substitui o uso do TablesDB e das Functions do Appwrite.

## Motivo

- O TablesDB do Appwrite self-hosted (1.8, sobre MariaDB) não tem JOIN nem agregação. Por isso o app dependia de tabelas de estatística e de Functions.
- O executor de Functions trava com execuções simultâneas (timeout de 14 a 30 s) e aparece como "No matching executor found" nos logs.
- O Managed PostgreSQL da documentação do Appwrite existe só no Cloud.

## Divisão

| Camada | Onde |
|---|---|
| Login, cadastro, recuperação de senha (SMTP pelo Brevo), bloqueio de conta, papéis | Appwrite Auth |
| Imagens de carros (`car-images`) e logos de série (`series-logos`), com preview redimensionado | Appwrite Storage, lido direto pelo app |
| Carros, séries, atributos, coleção, estatísticas, portal | `backendToSave` (Bun + Elysia + Drizzle + Postgres), branch `v2` |

Não se usam as tabelas nem as Functions do Appwrite. Elas são removidas depois da virada.

## Identidade: mesmo id nos dois lados

- `users.id` (uuid) no Postgres é igual ao `$id` do usuário no Appwrite.
- **Cadastro:** o app gera um UUID e chama `account.create(uuid, email, senha, nome)`. Na primeira requisição autenticada, o backend cria a linha em `users` com esse id.
- **Regra:** toda conta nasce com um UUID. `ID.unique()` não serve, e o backend recusa com 401 um id que não seja UUID.
- **Contas existentes (renaldy.sousa e o usuário de teste):** são recriadas no Appwrite com o UUID do Postgres, e a senha é importada via bcrypt (`users.createBcryptUser`).
- `users.password_hash`, a tabela `refresh_tokens` e as rotas signin, signup, refresh e senha saem do backend.

## Autenticação das requisições

- O app manda `Authorization: Bearer <JWT do Appwrite>`, gerado por `account.createJWT()`, com validade de 15 min, e renova ao receber 401.
- O backend valida o JWT com `GET /v1/account` (header `X-Appwrite-JWT`) e guarda o resultado em cache até ele expirar.
- O papel de admin vem de `labels` contendo `admin`.

## Imagens

- `cars.image_file_id` guarda o id do arquivo no bucket `car-images`, e `series.image_file_id` guarda o do bucket `series-logos`.
- O app monta a URL de preview do Appwrite (largura e WebP). O backend não fica no caminho da imagem.
- O módulo de storage do backend (S3, rustfs, presign, upload) sai.

## Dados

- `collection` guarda só o vínculo entre usuário e carro (sem cópia de campos do carro).
- As estatísticas (total, por série, por ano, posse por série) saem por SQL (JOIN, COUNT, GROUP BY) e não têm tabelas próprias.

## Entrega

1. **Backend, no branch `v2`:** testado contra o dump local; o merge no `main` publica em produção e só acontece com o OK do usuário. Depois do merge, o app antigo deixa de fazer login.
2. **App:** `src/services/*` é trocado por chamadas REST, e as telas não mudam.
