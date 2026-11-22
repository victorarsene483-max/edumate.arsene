import pool from "../config/database.js";

const SEMESTER_SELECT = `
  SELECT id, name,
         to_char(start_date, 'YYYY-MM-DD') AS "startDate",
         to_char(end_date, 'YYYY-MM-DD') AS "endDate"
  FROM semesters`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

async function listSemesters(req, res) {
  try {
    const { rows } = await pool.query(
      `${SEMESTER_SELECT} WHERE user_id = $1
       ORDER BY start_date DESC NULLS LAST, id DESC`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error("List semesters error:", err);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

async function createSemester(req, res) {
  const { name, startDate = null, endDate = null } = req.body ?? {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }
  if (name.trim().length > 100) {
    return res.status(400).json({ error: "name must be 100 characters or fewer" });
  }
  if (startDate && !isValidDate(startDate)) {
    return res.status(400).json({ error: "startDate must look like YYYY-MM-DD" });
  }
  if (endDate && !isValidDate(endDate)) {
    return res.status(400).json({ error: "endDate must look like YYYY-MM-DD" });
  }
  if (startDate && endDate && endDate < startDate) {
    return res.status(400).json({ error: "endDate must not be before startDate" });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO semesters (user_id, name, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [req.userId, name.trim(), startDate || null, endDate || null],
    );
    const { rows: created } = await pool.query(
      `${SEMESTER_SELECT} WHERE id = $1`,
      [rows[0].id],
    );
    res.status(201).json(created[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res
        .status(409)
        .json({ error: "You already have a semester with that name" });
    }
    console.error("Create semester error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

export { listSemesters, createSemester };