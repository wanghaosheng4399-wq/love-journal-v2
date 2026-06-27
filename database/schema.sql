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
