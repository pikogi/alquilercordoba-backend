import express from 'express';
import bcrypt from 'bcryptjs';
import { query, run } from '../database/init.js';
import { generateToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Register / Signup
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const existing = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await run(
      'INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, role',
      [email, hashedPassword, first_name || null, last_name || null]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.json({ user, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const users = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const users = await query('SELECT id, email, first_name, last_name, role FROM users WHERE id = $1', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });

    res.json(users[0]);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
