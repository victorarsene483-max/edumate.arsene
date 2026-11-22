import pool from "../config/database.js";

const TIMETABLE_SELECT = `
  SELECT id, location,
         unit_id AS "unitId",
         (SELECT code FROM units WHERE id = unit_id) AS "unitCode",
         day_of_week AS "dayOfWeek",
         to_char(start_time, 'HH24:MI') AS "startTime",
         to_char(end_time, 'HH24:MI') AS "endTime"
  FROM timetable_entries`;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isValidDay(value) {
  return Number.isInteger(value) && value >= 0 && value <= 6;
}

async function unitBelongsToUser(unitId, userId) {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM units WHERE id = $1 AND user_id = $2",
    [unitId, userId],
  );
  return rowCount > 0;
}

async function listTimetable(req, res) {
  try {
    const { rows } = await pool.query(
      `${TIMETABLE_SELECT} WHERE user_id = $1
       ORDER BY day_of_week, start_time, id`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error("List timetable error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function createEntry(req, res) {
  const { unitId, dayOfWeek, startTime, endTime, location = "" } = req.body ?? {};

  if (!isValidDay(dayOfWeek)) {
    return res.status(400).json({ error: "dayOfWeek must be a whole number from 0 (Sunday) to 6" });
  }
  if (!TIME_RE.test(startTime ?? "") || !TIME_RE.test(endTime ?? "")) {
    return res.status(400).json({ error: "startTime and endTime must look like HH:MM" });
  }
  if (endTime <= startTime) {
    return res.status(400).json({ error: "endTime must be after startTime" });
  }
  if (typeof location !== "string" || location.trim().length > 100) {
    return res.status(400).json({ error: "location must be 100 characters or fewer" });
  }

  try {
    const uid = parseId(unitId);
    if (!uid || !(await unitBelongsToUser(uid, req.userId))) {
      return res.status(400).json({ error: "Invalid unit" });
    }

    const { rows } = await pool.query(
      `INSERT INTO timetable_entries (user_id, unit_id, day_of_week, start_time, end_time, location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.userId, uid, dayOfWeek, startTime, endTime, location.trim()],
    );
    const { rows: created } = await pool.query(
      `${TIMETABLE_SELECT} WHERE id = $1`,
      [rows[0].id],
    );
    res.status(201).json(created[0]);
  } catch (err) {
    console.error("Create timetable entry error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function updateEntry(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid entry id" });

  const body = req.body ?? {};
  const sets = [];
  const values = [];
  const add = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  try {
    if ("dayOfWeek" in body) {
      if (!isValidDay(body.dayOfWeek)) {
        return res.status(400).json({ error: "dayOfWeek must be a whole number from 0 (Sunday) to 6" });
      }
      add("day_of_week", body.dayOfWeek);
    }
    if ("startTime" in body) {
      if (!TIME_RE.test(body.startTime ?? "")) {
        return res.status(400).json({ error: "startTime must look like HH:MM" });
      }
      add("start_time", body.startTime);
    }
    if ("endTime" in body) {
      if (!TIME_RE.test(body.endTime ?? "")) {
        return res.status(400).json({ error: "endTime must look like HH:MM" });
      }
      add("end_time", body.endTime);
    }
    if ("location" in body) {
      if (typeof body.location !== "string" || body.location.trim().length > 100) {
        return res.status(400).json({ error: "location must be 100 characters or fewer" });
      }
      add("location", body.location.trim());
    }
    if ("unitId" in body) {
      const uid = parseId(body.unitId);
      if (!uid || !(await unitBelongsToUser(uid, req.userId))) {
        return res.status(400).json({ error: "Invalid unit" });
      }
      add("unit_id", uid);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id, req.userId);
    const { rowCount } = await pool.query(
      `UPDATE timetable_entries SET ${sets.join(", ")}
       WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
      values,
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }

    const { rows } = await pool.query(`${TIMETABLE_SELECT} WHERE id = $1`, [id]);
    res.json(rows[0]);
  } catch (err) {

    if (err.code === "23514") {
      return res.status(400).json({ error: "endTime must be after startTime" });
    }
    console.error("Update timetable entry error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function deleteEntry(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid entry id" });

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM timetable_entries WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Entry not found" });
    }
    res.status(204).end();
  } catch (err) {
    console.error("Delete timetable entry error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

export { listTimetable, createEntry, updateEntry, deleteEntry };