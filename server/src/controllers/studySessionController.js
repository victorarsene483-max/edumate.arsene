import pool from "../config/database.js";

const MAX_SESSION_HOURS= 12;
const DEFAULT_TIMEZONE = "Africa/Nairobi";


const SESSION_SELECT = `
  SELECT id,
         unit_id AS "unitId",
         (SELECT code FROM units WHERE id = unit_id) AS "unitCode",
         started_at AS "startedAt",
         ended_at AS "endedAt",
         ROUND(EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - started_at)))::int AS "durationSeconds"
  FROM study_sessions`;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidTimezone(tz) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

async function unitBelongsToUser(unitId, userId) {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM units WHERE id = $1 AND user_id = $2",
    [unitId, userId],
  );
  return rowCount > 0;
}

async function getActive(req, res) {
  try {
    const { rows } = await pool.query(
      `${SESSION_SELECT} WHERE user_id = $1 AND ended_at IS NULL`,
      [req.userId],
    );
    res.json(rows[0] ?? null);
  } catch (err) {
    console.error("Get active session error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function startSession(req, res) {
  const { unitId = null } = req.body ?? {};

  try {
    let uid = null;
    if (unitId !== null && unitId !== "") {
      uid = parseId(unitId);
      if (!uid || !(await unitBelongsToUser(uid, req.userId))) {
        return res.status(400).json({ error: "Invalid unit" });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO study_sessions (user_id, unit_id)
       VALUES ($1, $2)
       RETURNING id`,
      [req.userId, uid],
    );
    const { rows: created } = await pool.query(
      `${SESSION_SELECT} WHERE id = $1`,
      [rows[0].id],
    );
    res.status(201).json(created[0]);
  } catch (err) {
    // The one-running-session index rejected a second start.
    if (err.code === "23505") {
      return res.status(409).json({ error: "A study session is already running" });
    }
    console.error("Start session error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function stopSession(req, res) {
  try {
    const { rows } = await pool.query(
      `UPDATE study_sessions
       SET ended_at = LEAST(now(), started_at + $2::int * interval '1 hour')
       WHERE user_id = $1 AND ended_at IS NULL
       RETURNING id`,
      [req.userId, MAX_SESSION_HOURS],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No study session is running" });
    }
    const { rows: stopped } = await pool.query(
      `${SESSION_SELECT} WHERE id = $1`,
      [rows[0].id],
    );
    res.json(stopped[0]);
  } catch (err) {
    console.error("Stop session error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function deleteSession(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid session id" });

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM study_sessions WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.status(204).end();
  } catch (err) {
    console.error("Delete session error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

// Minutes studied per day, Monday to Sunday, for this week or last week.
async function getStats(req, res) {
  const period = req.query.period ?? "this-week";
  const tz = req.query.tz ?? DEFAULT_TIMEZONE;

  if (period !== "this-week" && period !== "last-week") {
    return res.status(400).json({ error: "period must be this-week or last-week" });
  }
  if (typeof tz !== "string" || !isValidTimezone(tz)) {
    return res.status(400).json({ error: "Invalid time zone" });
  }
  const weeksBack = period === "last-week" ? 1 : 0;

  try {
    // Monday of the requested week, in the user's time zone.
    const { rows: startRows } = await pool.query(
      `SELECT to_char(
                date_trunc('week', now() AT TIME ZONE $1) - $2::int * interval '7 days',
                'YYYY-MM-DD'
              ) AS start`,
      [tz, weeksBack],
    );
    const weekStart = startRows[0].start;

    const { rows } = await pool.query(
      `WITH bounds AS (
         SELECT date_trunc('week', now() AT TIME ZONE $2) - $3::int * interval '7 days' AS week_start
       )
       SELECT to_char((started_at AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS day,
              ROUND(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))) / 60)::int AS minutes
       FROM study_sessions, bounds
       WHERE user_id = $1
         AND ended_at IS NOT NULL
         AND (started_at AT TIME ZONE $2) >= week_start
         AND (started_at AT TIME ZONE $2) < week_start + interval '7 days'
       GROUP BY 1`,
      [req.userId, tz, weeksBack],
    );

    const minutesByDay = {};
    for (const row of rows) {
      minutesByDay[row.day] = row.minutes;
    }

    const [year, month, day] = weekStart.split("-").map(Number);
    const dailyMinutes = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.UTC(year, month - 1, day + i));
      dailyMinutes.push(minutesByDay[date.toISOString().slice(0, 10)] ?? 0);
    }
    const totalMinutes = dailyMinutes.reduce((sum, m) => sum + m, 0);

    res.json({ period, weekStart, dailyMinutes, totalMinutes });
  } catch (err) {
    console.error("Study stats error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

export { getActive, startSession, stopSession, deleteSession, getStats };