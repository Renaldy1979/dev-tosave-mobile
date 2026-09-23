/**
 * Cria/atualiza as Functions do ToSave e publica o código (idempotente).
 * Cada pasta em backend/functions/<id> vira um .tar.gz e um novo
 * deployment ativo. Nada é apagado.
 *
 *   npm run deploy-functions              # todas
 *   npm run deploy-functions -- collection
 */
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { InputFile } from "node-appwrite/file";
import { functions, isNotFound, sleep } from "../lib/appwrite.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, ".state", "deploy");
mkdirSync(outDir, { recursive: true });

// O servidor só habilita node-16.0 (_APP_FUNCTIONS_RUNTIMES); trocar para
// node-22 quando o runtime for habilitado no VPS.
const RUNTIME = process.env.FUNCTIONS_RUNTIME ?? "node-16.0";
const DB_EVENTS = (table) => ["create", "update", "delete"].map((a) => `databases.tosave.tables.${table}.rows.*.${a}`);

const FUNCTIONS = [
  {
    functionId: "collection",
    name: "collection",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 15,
    logging: false,
    scopes: ["rows.read", "rows.write"],
  },
  {
    functionId: "catalog-sync",
    name: "catalog-sync",
    execute: [],
    events: [...DB_EVENTS("cars"), ...DB_EVENTS("series"), ...DB_EVENTS("brands")],
    schedule: "0 4 * * *",
    timeout: 300,
    logging: true,
    scopes: ["rows.read", "rows.write"],
  },
  {
    functionId: "user-cleanup",
    name: "user-cleanup",
    execute: [],
    events: ["users.*.delete"],
    schedule: "",
    timeout: 60,
    logging: true,
    scopes: ["rows.read", "rows.write"],
  },
];

const only = process.argv.slice(2);
for (const def of FUNCTIONS.filter((f) => only.length === 0 || only.includes(f.functionId))) {
  const params = {
    ...def,
    runtime: RUNTIME,
    enabled: true,
    entrypoint: "src/main.js",
    commands: "npm install --omit=dev",
  };
  try {
    await functions.get({ functionId: def.functionId });
    await functions.update(params);
    console.log(`= function ${def.functionId} (configuração atualizada)`);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    await functions.create(params);
    console.log(`+ function ${def.functionId}`);
  }

  // Endpoint público (https): o interno (http) é redirecionado para https
  // pelo servidor e o cliente do Node 16 não segue essa troca de protocolo.
  const { variables } = await functions.listVariables({ functionId: def.functionId });
  const endpointVar = variables.find((v) => v.key === "TOSAVE_ENDPOINT");
  const endpoint = process.env.APPWRITE_ENDPOINT;
  if (!endpointVar) {
    await functions.createVariable({ functionId: def.functionId, key: "TOSAVE_ENDPOINT", value: endpoint, secret: false });
  } else if (endpointVar.value !== endpoint) {
    await functions.updateVariable({ functionId: def.functionId, variableId: endpointVar.$id, key: "TOSAVE_ENDPOINT", value: endpoint, secret: false });
  }

  const archive = path.join(outDir, `${def.functionId}.tar.gz`);
  // Caminhos relativos: o GNU tar do Git Bash lê "C:" como host remoto.
  const fnDir = path.join(root, "functions", def.functionId);
  execFileSync("tar", ["-czf", path.relative(fnDir, archive).replace(/\\/g, "/"), "package.json", "src"], { cwd: fnDir });
  const deployment = await functions.createDeployment({
    functionId: def.functionId,
    code: InputFile.fromPath(archive, `${def.functionId}.tar.gz`),
    activate: true,
  });

  // Espera o build terminar para reportar sucesso/erro.
  for (let i = 0; i < 180; i++) {
    const d = await functions.getDeployment({ functionId: def.functionId, deploymentId: deployment.$id });
    if (d.status === "ready") {
      console.log(`  deployment ${d.$id} pronto`);
      break;
    }
    if (d.status === "failed" || d.status === "canceled") {
      console.log(`  deployment ${d.$id} ${d.status}:\n${d.buildLogs}`);
      process.exitCode = 1;
      break;
    }
    await sleep(2000);
  }
}
