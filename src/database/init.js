import pkg from 'pg';
import bcrypt from 'bcryptjs';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export const query = async (text, params = []) => {
  const res = await pool.query(text, params);
  return res.rows;
};

export const run = async (text, params = []) => {
  return pool.query(text, params);
};

export const initDatabase = async () => {
  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Properties table
  await run(`
    CREATE TABLE IF NOT EXISTS properties (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      location TEXT,
      price_per_night REAL,
      capacity INTEGER,
      cover_image TEXT,
      images TEXT[],
      amenities TEXT,
      owner_email TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Availability table
  await run(`
    CREATE TABLE IF NOT EXISTS availability (
      id SERIAL PRIMARY KEY,
      property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(property_id, date)
    );
  `);

  // Solo crear admin si no hay usuarios
  const users = await query('SELECT COUNT(*) as count FROM users');
  if (parseInt(users[0].count) === 0) {
    const hashed = await bcrypt.hash('admin123', 10);
    await run(`
      INSERT INTO users (email, password, first_name, role)
      VALUES ('admin@example.com', $1, 'Admin', 'admin');
    `, [hashed]);
    console.log('Admin user created: admin@example.com / admin123');
  }

  console.log('PostgreSQL database initialized safely');
};
