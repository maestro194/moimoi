import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

// Lazy initialization — the DB client is created on first use,
// so the build process doesn't fail without DATABASE_URL set.
let _db: DrizzleClient | null = null;

export function getDb(): DrizzleClient {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Copy .env.local.example to .env.local and fill in your Neon connection string.',
      );
    }
    const sql = neon(url);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Convenience re-export: call getDb() everywhere instead of db directly.
// This allows pages to import { db } and use it naturally.
export const db = new Proxy({} as DrizzleClient, {
  get(_target, prop: string | symbol) {
    const instance = getDb();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

export type DB = typeof db;
