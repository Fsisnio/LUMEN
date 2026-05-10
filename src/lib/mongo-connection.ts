import type { Db } from "mongodb";
import { MongoClient } from "mongodb";

/** True when persistence uses MongoDB (multi-collection backend). */
export function useMongoBackend(): boolean {
  const u = process.env.MONGODB_URI;
  return typeof u === "string" && u.trim().length > 0;
}

export function getMongoClient(): Promise<MongoClient> {
  const g = globalThis as typeof globalThis & { __lumenMongoPromise?: Promise<MongoClient> };
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    return Promise.reject(new Error("MONGODB_URI is not set."));
  }
  if (!g.__lumenMongoPromise) {
    const client = new MongoClient(uri);
    g.__lumenMongoPromise = client.connect();
  }
  return g.__lumenMongoPromise;
}

export async function mongoDb(): Promise<Db> {
  const name = process.env.MONGODB_DB?.trim() || "lumen";
  return (await getMongoClient()).db(name);
}
