CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));

CREATE TABLE IF NOT EXISTS semesters(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFULT now(),
  CONSTRAINT semesters_dates_check
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date),
  CONSTRAINT semesters_user_name_unique UNIQUE (user_id, name)

);

CREATE TABLE IF NOT EXISTS units(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASACDE,
  semester_id INTEGER REFERENCES semesters(id) ON DELETE SET NULL,
  code VARCHAR(30) NOT NULL,
  name VARCHAR(30) NOT NULL,
  lecturer VARCHAR(255) NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
  icon VARCHAR(20) NOT NULL DEFAULT 'box',
  color VARCHAR(20) NOT NULL DEFAULT 'purple',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT units_user_semester_code_unique
    UNIQUE NULLS NOT DISTINCT (user_id, semester_id, code)
);
CREATE INDEX IF NOT EXISTS units_user_id_idx ON units (user_id);
CREATE INDEX IF NOT EXISTS semesters_user_id_idx ON semesters (user_id);

CREATE TABLE IF NOT EXISTS assignments(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'Assignment',
  due_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
)
GRANT ALL ON TABLES IN SCHEMA public TO edumate_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO edumate_app;


CREATE TABLE IF NOT EXISTS timetable_entries (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  location    VARCHAR(100) NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT timetable_time_check CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS timetable_user_id_idx ON timetable_entries (user_id);
CREATE INDEX IF NOT EXISTS timetable_unit_id_idx ON timetable_entries (unit_id);

CREATE TABLE IF NOT EXISTS study_sessions(
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unit_id INTEGER REFERENCES  units(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT study_sessions_time_check CHECK (ended_at IS NULL OR ended_at >= started_at)

);
CREATE INDEX IF NOT EXISTS study_sessions_user_started_idx ON study_sessions (user_id, started_at);

CREATE UNIQUE INDEX IF NOT EXISTS study_sessions_one_running_idx
  ON study_sessions (user_id) WHERE ended_at IS NULL;