import pool from "../config/database.js";

const THEMES = [
  { icon: "box", color: "purple" },
  { icon: "database", color: "green" },
  { icon: "code", color: "orange" },
  { icon: "chart", color: "blue" },
  { icon: "binary", color: "pink" },
  { icon: "wifi", color: "teal" },
  { icon: "message", color: "red" },
  { icon: "atom", color: "indigo" },
];

const UNIT_SELECT = `
  SELECT id, code, name, lecturer, icon, color,
         semester_id AS "semesterId",
         COALESCE((SELECT name FROM semesters WHERE id = semester_id), '') AS semester,
         (SELECT COUNT(*)::int FROM assignments WHERE unit_id = units.id) AS "assignmentsCount",
         COALESCE(
           (SELECT ROUND(100.0 * COUNT(*) FILTER (WHERE completed) / NULLIF(COUNT(*), 0))::int
            FROM assignments WHERE unit_id = units.id),
           0
         ) AS progress
  FROM units`;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function semesterBelongsToUser(semesterId, userId) {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM semesters WHERE id = $1 AND user_id = $2",
    [semesterId, userId],
  );
  return rowCount > 0;
}

async function listUnits(req, res) {
  try {
    const { rows } = await pool.query(
      `${UNIT_SELECT} WHERE user_id = $1 ORDER BY id`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error("List units error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function createUnit(req, res) {
  const { code, name, lecturer = "", semesterId = null } = req.body ?? {};
  if ([code, name].some((v) => typeof v !== "string" || !v.trim())) {
    return res.status(400).json({ error: "code and name are required" });
  }
  if (typeof lecturer !== "string") {
    return res.status(400).json({ error: "lecturer must be text" });
  }
  try {
    let semId = null;
    if (semesterId !== null && semesterId !== "") {
      semId = parseId(semesterId);
      if (!semId || !(await semesterBelongsToUser(semId, req.userId))) {
        return res.status(400).json({ error: "Invalid semester" });
      }
    }
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*)::int AS n FROM units WHERE user_id = $1",
      [req.userId],
    );
    const theme = THEMES[countRows[0].n % THEMES.length];

    const { rows } = await pool.query(
      `INSERT INTO units (user_id, semester_id, code, name, lecturer, icon, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        req.userId,
        semId,
        code.trim().toUpperCase(),
        name.trim(),
        lecturer.trim(),
        theme.icon,
        theme.color,
      ],
    );
    const { rows: unit } = await pool.query(`${UNIT_SELECT} WHERE id = $1`, [
      rows[0].id,
    ]);
    res.status(201).json(unit[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "You already have a unit with that code in this semester",
      });
    }
    console.error("Create unit error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function updateUnit(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid unit id" });

  const body = req.body ?? {};
  const sets = [];
  const values = [];
  const add = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  try {
    if ("code" in body) {
      if (typeof body.code !== "string" || !body.code.trim()) {
        return res.status(400).json({ error: "code cannot be empty" });
      }
      add("code", body.code.trim().toUpperCase());
    }
    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return res.status(400).json({ error: "name cannot be empty" });
      }
      add("name", body.name.trim());
    }
    if ("lecturer" in body) {
      if (typeof body.lecturer !== "string") {
        return res.status(400).json({ error: "lecturer must be text" });
      }
      add("lecturer", body.lecturer.trim());
    }
    if ("progress" in body) {
      const p = Number(body.progress);
      if (!Number.isInteger(p) || p < 0 || p > 100) {
        return res
          .status(400)
          .json({ error: "progress must be a whole number from 0 to 100" });
      }
      add("progress", p);
    }
    if ("semesterId" in body) {
      if (body.semesterId === null) {
        add("semester_id", null);
      } else {
        const semId = parseId(body.semesterId);
        if (!semId || !(await semesterBelongsToUser(semId, req.userId))) {
          return res.status(400).json({ error: "Invalid semester" });
        }
        add("semester_id", semId);
      }
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id, req.userId);
    const { rowCount } = await pool.query(
      `UPDATE units SET ${sets.join(", ")}
       WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
      values,
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Unit not found" });
    }
    const { rows } = await pool.query(`${UNIT_SELECT} WHERE id = $1`, [id]);
    res.json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({
        error: "You already have a unit with that code in this semester",
      });
    }
    console.error("Update unit error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function deleteUnit(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid unit id" });
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM units WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Unit not found" });
    }
    res.status(204).end();
  } catch (err) {
    console.error("Delete unit error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

export { listUnits, createUnit, updateUnit, deleteUnit };