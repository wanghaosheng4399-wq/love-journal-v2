const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function initDb() {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS records (
        id SERIAL PRIMARY KEY,
        date TEXT NOT NULL,
        type TEXT DEFAULT 'daily',
        title TEXT NOT NULL,
        content TEXT DEFAULT '',
        location TEXT DEFAULT '',
        mood INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS anniversaries (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        icon TEXT DEFAULT '\u2764\uFE0F',
        created_at TIMESTAMP DEFAULT NOW()
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
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT DEFAULT ''
      );

      CREATE INDEX IF NOT EXISTS idx_records_date ON records(date DESC);
      CREATE INDEX IF NOT EXISTS idx_records_type ON records(type);
      CREATE INDEX IF NOT EXISTS idx_moods_date ON moods(date DESC);
      CREATE INDEX IF NOT EXISTS idx_wishes_priority ON wishes(priority);
    `)
    console.log('✅ Database initialized')
  } catch (err) {
    console.error('❌ DB init error:', err.message)
  } finally {
    client.release()
  }
}

module.exports = { pool, initDb }