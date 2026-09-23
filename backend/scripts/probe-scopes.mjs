/**
 * Sonda, SOMENTE COM LEITURAS, quais scopes de leitura a API key tem.
 * Scopes de escrita não são testados (exigiriam criar algo).
 *
 *   npm run probe-scopes
 */
import { Client, Storage, Messaging, Health, Sites, Query } from "node-appwrite";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const storage = new Storage(client);
const probes = {
  "health.read": () => new Health(client).get(),
  "files.read": async () => {
    const { buckets } = await storage.listBuckets();
    const out = {};
    for (const b of buckets) {
      out[b.$id] = (await storage.listFiles({ bucketId: b.$id, queries: [Query.limit(1)] })).total;
    }
    return out;
  },
  "providers.read": () => new Messaging(client).listProviders(),
  "topics.read": () => new Messaging(client).listTopics(),
  "sites.read": () => new Sites(client).list(),
};

for (const [scope, fn] of Object.entries(probes)) {
  try {
    const out = await fn();
    console.log(`OK   ${scope}`, scope === "files.read" ? JSON.stringify(out) : "");
  } catch (err) {
    console.log(`FALHA ${scope}: ${err.code} ${err.message}`);
  }
}
