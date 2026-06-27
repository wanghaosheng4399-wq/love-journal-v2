import { Pool } from "pg"

const globalForDb = globalThis
const connectionString = process.env.DATABASE_URL

function shouldUseSsl(url) {
  if (!url) return false
  if (url.includes("localhost") || url.includes("127.0.0.1")) return false
  if (url.includes("sslmode=disable")) return false
  return true
}

export const pool = connectionString
  ? globalForDb.loveJournalPool ||
    new Pool({
      connectionString,
      ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : false,
    })
  : null

if (connectionString && !globalForDb.loveJournalPool) {
  globalForDb.loveJournalPool = pool
}

let initPromise = null

export async function ensureDb() {
  if (!pool) return false
  if (!initPromise) {
    initPromise = initDb().catch((error) => {
      initPromise = null
      throw error
    })
  }
  await initPromise
  return true
}

export async function query(sql, params = []) {
  await ensureDb()
  if (!pool) {
    throw new Error("DATABASE_URL is not configured.")
  }
  return pool.query(sql, params)
}

async function initDb() {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    await client.query(`
      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT DEFAULT 'daily',
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        location TEXT DEFAULT '',
        mood INTEGER DEFAULT 3,
        photo_url TEXT DEFAULT '',
        tags TEXT DEFAULT '',
        is_favorite BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS anniversaries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        icon TEXT DEFAULT '♥',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS moods (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        mood INTEGER NOT NULL,
        note TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wishes (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        completed BOOLEAN DEFAULT FALSE,
        target_date TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS letters (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        visible_on TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT DEFAULT ''
      );
    `)

    await client.query(`
      ALTER TABLE records ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
      ALTER TABLE records ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
      ALTER TABLE records ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
      ALTER TABLE records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE anniversaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE wishes ADD COLUMN IF NOT EXISTS target_date TEXT DEFAULT '';
      ALTER TABLE letters ADD COLUMN IF NOT EXISTS visible_on TEXT DEFAULT '';
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_records_date ON records(date DESC);
      CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
      CREATE INDEX IF NOT EXISTS idx_records_favorite ON records(is_favorite);
      CREATE INDEX IF NOT EXISTS idx_anniversaries_date ON anniversaries(date ASC);
      CREATE INDEX IF NOT EXISTS idx_moods_date ON moods(date DESC);
      CREATE INDEX IF NOT EXISTS idx_wishes_priority ON wishes(priority);
      CREATE INDEX IF NOT EXISTS idx_letters_created_at ON letters(created_at DESC);
    `)

    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
