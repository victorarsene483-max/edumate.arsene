import pool from "../config/database.js";

const ASSIGNMENT_SELECT = `
  SELECT id, title, type, completed,
         unit_id AS "unitId",
         (SELECT code FROM units WHERE id = unit_id) AS "unitCode",
         to_char(due_date, 'YYYY-MM-DD') AS "dueDate"
  FROM assignments`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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

async function unitBelongsToUser(unitId, userId) {
  const { rowCount } = await pool.query(
    "SELECT 1 FROM units WHERE id = $1 AND user_id = $2",
    [unitId, userId],
  );
  return rowCount > 0;
}

async function listAssignments(req, res) {
  try {
    let where = "WHERE user_id = $1";
    if (req.query.completed === "true") where += " AND completed = true";
    if (req.query.completed === "false") where += " AND completed = false";

    const { rows } = await pool.query(
      `${ASSIGNMENT_SELECT} ${where} ORDER BY due_date, id`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error("List assignments error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function createAssignment(req, res) {
  const { title, type = "Assignment", unitId, dueDate } = req.body ?? {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  if (typeof type !== "string" || !type.trim() || type.trim().length > 30) {
    return res.status(400).json({ error: "type must be 1 to 30 characters" });
  }
  if (!isValidDate(dueDate)) {
    return res.status(400).json({ error: "dueDate must look like YYYY-MM-DD" });
  }

  try {
    const uid = parseId(unitId);
    if (!uid || !(await unitBelongsToUser(uid, req.userId))) {
      return res.status(400).json({ error: "Invalid unit" });
    }

    const { rows } = await pool.query(
      `INSERT INTO assignments (user_id, unit_id, title, type, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [req.userId, uid, title.trim(), type.trim(), dueDate],
    );

    const { rows: created } = await pool.query(
      `${ASSIGNMENT_SELECT} WHERE id = $1`,
      [rows[0].id],
    );
    res.status(201).json(created[0]);
  } catch (err) {
    console.error("Create assignment error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function updateAssignment(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid assignment id" });

  const body = req.body ?? {};
  const sets = [];
  const values = [];
  const add = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  try {
    if ("title" in body) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return res.status(400).json({ error: "title cannot be empty" });
      }
      add("title", body.title.trim());
    }
    if ("type" in body) {
      if (
        typeof body.type !== "string" ||
        !body.type.trim() ||
        body.type.trim().length > 30
      ) {
        return res
          .status(400)
          .json({ error: "type must be 1 to 30 characters" });
      }
      add("type", body.type.trim());
    }
    if ("dueDate" in body) {
      if (!isValidDate(body.dueDate)) {
        return res
          .status(400)
          .json({ error: "dueDate must look like YYYY-MM-DD" });
      }
      add("due_date", body.dueDate);
    }
    if ("unitId" in body) {
      const uid = parseId(body.unitId);
      if (!uid || !(await unitBelongsToUser(uid, req.userId))) {
        return res.status(400).json({ error: "Invalid unit" });
      }
      add("unit_id", uid);
    }
    if ("completed" in body) {
      if (typeof body.completed !== "boolean") {
        return res
          .status(400)
          .json({ error: "completed must be true or false" });
      }
      add("completed", body.completed);
      add("completed_at", body.completed ? new Date() : null);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(id, req.userId);
    const { rowCount } = await pool.query(
      `UPDATE assignments SET ${sets.join(", ")}
       WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
      values,
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    const { rows } = await pool.query(`${ASSIGNMENT_SELECT} WHERE id = $1`, [
      id,
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error("Update assignment error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

async function deleteAssignment(req, res) {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid assignment id" });

  try {
    const { rowCount } = await pool.query(
      "DELETE FROM assignments WHERE id = $1 AND user_id = $2",
      [id, req.userId],
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    res.status(204).end();
  } catch (err) {
    console.error("Delete assignment error:", err);
    res.status(500).json({ error: "Something went wrong." });
  }
}

export {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};
