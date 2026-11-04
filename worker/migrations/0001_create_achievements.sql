CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 80),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 180),
  category TEXT NOT NULL CHECK (category IN ('Личное', 'Учёба', 'Работа', 'Здоровье')),
  date TEXT NOT NULL CHECK (length(date) = 10),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS achievements_date_created_idx
  ON achievements (date DESC, created_at DESC);
