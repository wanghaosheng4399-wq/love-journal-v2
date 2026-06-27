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
  if (!pool) throw new Error("DATABASE_URL is not configured.")
  return pool.query(sql, params)
}

async function initDb() {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nickname VARCHAR(50) DEFAULT '',
        avatar_url TEXT DEFAULT '/avatar.jpg',
        bind_code VARCHAR(20) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS couple_links (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        ended_at TIMESTAMP,
        CONSTRAINT no_self_bind CHECK (requester_id <> receiver_id)
      );

      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        type TEXT DEFAULT 'daily',
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        location TEXT DEFAULT '',
        mood TEXT DEFAULT '平静',
        photo_url TEXT DEFAULT '',
        tags TEXT DEFAULT '',
        is_favorite BOOLEAN DEFAULT FALSE,
        visibility VARCHAR(20) DEFAULT 'private',
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS anniversaries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        icon TEXT DEFAULT '♥',
        visibility VARCHAR(20) DEFAULT 'shared',
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS moods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL DEFAULT '',
        mood TEXT NOT NULL DEFAULT '平静',
        mood_text TEXT DEFAULT '',
        note TEXT DEFAULT '',
        visibility VARCHAR(20) DEFAULT 'shared',
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wishes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        completed BOOLEAN DEFAULT FALSE,
        target_date TEXT DEFAULT '',
        visibility VARCHAR(20) DEFAULT 'shared',
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS letters (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        visible_on TEXT DEFAULT '',
        visibility VARCHAR(20) DEFAULT 'shared',
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL REFERENCES records(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        key TEXT NOT NULL,
        value TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)

    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(50) DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '/avatar.jpg';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bind_code VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE records ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE records ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '';
      ALTER TABLE records ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT '';
      ALTER TABLE records ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
      ALTER TABLE records ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'private';
      ALTER TABLE records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE records ALTER COLUMN mood TYPE TEXT USING mood::text;

      ALTER TABLE anniversaries ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE anniversaries ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'shared';
      ALTER TABLE anniversaries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE anniversaries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

      ALTER TABLE moods DROP CONSTRAINT IF EXISTS moods_date_key;
      ALTER TABLE moods ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE moods ADD COLUMN IF NOT EXISTS date TEXT DEFAULT '';
      ALTER TABLE moods ADD COLUMN IF NOT EXISTS mood_text TEXT DEFAULT '';
      ALTER TABLE moods ADD COLUMN IF NOT EXISTS note TEXT DEFAULT '';
      ALTER TABLE moods ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'shared';
      ALTER TABLE moods ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE moods ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE moods ALTER COLUMN mood TYPE TEXT USING mood::text;

      ALTER TABLE wishes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE wishes ADD COLUMN IF NOT EXISTS target_date TEXT DEFAULT '';
      ALTER TABLE wishes ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'shared';
      ALTER TABLE wishes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

      ALTER TABLE letters ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE letters ADD COLUMN IF NOT EXISTS visible_on TEXT DEFAULT '';
      ALTER TABLE letters ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'shared';
      ALTER TABLE letters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

      ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_pkey;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS id SERIAL;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
      UPDATE settings
      SET id = nextval(pg_get_serial_sequence('settings', 'id'))
      WHERE id IS NULL;
      ALTER TABLE settings ALTER COLUMN id SET NOT NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'settings'::regclass AND contype = 'p'
        ) THEN
          ALTER TABLE settings ADD CONSTRAINT settings_pkey PRIMARY KEY (id);
        END IF;
      END $$;
    `)

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_bind_code ON users(bind_code);
      CREATE INDEX IF NOT EXISTS idx_couple_links_requester ON couple_links(requester_id, status);
      CREATE INDEX IF NOT EXISTS idx_couple_links_receiver ON couple_links(receiver_id, status);
      CREATE INDEX IF NOT EXISTS idx_records_user_date ON records(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_records_visibility ON records(visibility);
      CREATE INDEX IF NOT EXISTS idx_anniversaries_user_date ON anniversaries(user_id, date ASC);
      CREATE INDEX IF NOT EXISTS idx_anniversaries_visibility ON anniversaries(visibility);
      CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, date DESC);
      CREATE INDEX IF NOT EXISTS idx_moods_visibility ON moods(visibility);
      CREATE INDEX IF NOT EXISTS idx_wishes_user_priority ON wishes(user_id, priority);
      CREATE INDEX IF NOT EXISTS idx_wishes_visibility ON wishes(visibility);
      CREATE INDEX IF NOT EXISTS idx_letters_user_created ON letters(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_letters_visibility ON letters(visibility);
      CREATE INDEX IF NOT EXISTS idx_comments_record ON comments(record_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key);
    `)

    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}
