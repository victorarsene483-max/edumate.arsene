import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function register(req, res) {
  const { name, email, password } = req.body ?? {};

  if ([name, email, password].some((v) => typeof v !== 'string' || !v.trim())) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'email is not valid' });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: 'password must be 8 to 72 characters' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name.trim(), email.trim().toLowerCase(), hash]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}

async function login(req, res) {
  const { email, password } = req.body ?? {};
  if ([email, password].some((v) => typeof v !== 'string' || !v.trim())) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, password_hash FROM users WHERE email = $1`,
      [cleanEmail]
    );
    const user = rows[0];
    const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Something went wrong signing you in. Please try again.' });
  }
}

async function me(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, email, created_at FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
}

export { register, login, me };