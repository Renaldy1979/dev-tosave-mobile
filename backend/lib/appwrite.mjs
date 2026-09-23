/**
 * Cliente Appwrite (API key) para os scripts de servidor.
 * As credenciais vêm de backend/.env.local via `node --env-file`.
 */
import { Client, TablesDB, Storage, Teams, Users, Functions } from "node-appwrite";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Faltam APPWRITE_* em backend/.env.local");
  process.exit(1);
}

export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

export const tablesDB = new TablesDB(client);
export const storage = new Storage(client);
export const teams = new Teams(client);
export const users = new Users(client);
export const functions = new Functions(client);

export const DATABASE_ID = "tosave";
export const BUCKET_ID = "car-images";
export const ADMINS_TEAM_ID = "admins";

/** true quando o erro do Appwrite é "não encontrado". */
export const isNotFound = (err) => err?.code === 404;
/** true quando o erro do Appwrite é "já existe". */
export const isConflict = (err) => err?.code === 409;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
