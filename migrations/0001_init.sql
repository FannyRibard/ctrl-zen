-- Ctrl+Zen : schéma de la base

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT,
  emoji TEXT,
  color TEXT NOT NULL DEFAULT 'sauge'
);

CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  use_quote INTEGER NOT NULL DEFAULT 0,
  quote_types TEXT NOT NULL DEFAULT '',
  schedule TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  next_run INTEGER,
  last_run INTEGER,
  system TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_notifications_next ON notifications(active, next_run);

CREATE TABLE templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  use_quote INTEGER NOT NULL DEFAULT 0,
  quote_types TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE quotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  author TEXT,
  type TEXT NOT NULL CHECK (type IN ('motivation', 'psychologie', 'philosophie')),
  custom INTEGER NOT NULL DEFAULT 0,
  favorite INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  sent INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Réglages par défaut
INSERT INTO settings (key, value) VALUES
  ('timezone', 'Europe/Paris'),
  ('quietEnabled', '1'),
  ('quietStart', '22:00'),
  ('quietEnd', '07:00');

-- Catégories de départ
INSERT INTO categories (name, icon, color) VALUES
  ('Bien-être', 'wind', 'abricot'),
  ('Santé', 'droplet', 'ciel'),
  ('Perso', 'heart', 'rose'),
  ('Boulot', 'briefcase', 'sauge'),
  ('Exos du psy', 'leaf', 'lavande');

-- La citation du jour (une notif « système », réglable dans Réglages). next_run est calculé au premier passage.
INSERT INTO notifications (title, body, category_id, use_quote, quote_types, schedule, active, next_run, system, created_at)
VALUES ('Citation du jour', '', NULL, 1, 'motivation,psychologie,philosophie',
        '{"kind":"daily","days":[0,1,2,3,4,5,6],"time":"08:00"}', 1, NULL, 'daily_quote', 0);

-- Modèles de départ
INSERT INTO templates (title, body, category_id, use_quote, quote_types, created_at) VALUES
  ('Pause respiration', 'Inspire 4 s… bloque 4 s… expire 6 s. Trois fois.', 1, 0, '', 0),
  ('Coup de boost', '', 1, 1, 'motivation', 0),
  ('Boire de l’eau', 'Un grand verre d’eau, maintenant 💧', 2, 0, '', 0),
  ('Pensée du soir', '', 3, 1, 'philosophie', 0),
  ('Mon exo du jour', 'C’est le moment de ton exercice. Cinq minutes suffisent.', 5, 1, 'psychologie', 0);
