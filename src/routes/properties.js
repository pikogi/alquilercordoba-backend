import express from 'express';
import { query, run } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// --- Function to normalize Postgres TEXT[] or CSV fields ---
const normalizeArray = (val) => {
  if (!val) return [];

  // Already array → OK
  if (Array.isArray(val)) return val;

  // Case: "{Wifi,Cocina}" PostgreSQL TEXT[]
  if (typeof val === "string" && val.startsWith("{") && val.endsWith("}")) {
    return val
      .slice(1, -1) // remove { }
      .split(",")   // split by comma
      .map(v => v.replace(/"/g, "").trim()); // remove quotes
  }

  // Case: "Wifi,Cocina"
  if (typeof val === "string") {
    return val
      .split(",")
      .map(v => v.replace(/"/g, "").trim());
  }

  return [];
};

// Parse JSON / TEXT[] fields safely
const parseProperty = (prop) => ({
  ...prop,
  images: normalizeArray(prop.images),
  amenities: normalizeArray(prop.amenities),
  price_per_night: prop.price_per_night || 0,
  capacity: prop.capacity || 0
});

// List properties with optional pagination and filters
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 9, 50); // límite de seguridad
    const offset = (page - 1) * pageSize;

    const { location, minCapacity } = req.query;

    let baseSql = 'FROM properties WHERE 1=1';
    const params = [];
    let i = 1;

    if (location) {
      baseSql += ` AND LOWER(location) LIKE LOWER($${i++})`;
      params.push(`%${location}%`);
    }

    if (minCapacity) {
      baseSql += ` AND capacity >= $${i++}`;
      params.push(parseInt(minCapacity, 10));
    }

    // Conteo total
    const countResult = await query(`SELECT COUNT(*) as count ${baseSql}`, params);
    const total = parseInt(countResult[0].count, 10);

    // Datos paginados
    const dataResult = await query(
      `SELECT * ${baseSql} ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, pageSize, offset]
    );

    res.json({
      data: dataResult.map(parseProperty),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error) {
    console.error('List properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Filter properties
router.get('/filter', async (req, res) => {
  try {
    let sql = 'SELECT * FROM properties WHERE 1=1';
    const params = [];
    let i = 1;

    if (req.query.id) {
      sql += ` AND id = $${i++}`;
      params.push(req.query.id);
    }
    if (req.query.owner_email) {
      sql += ` AND owner_email = $${i++}`;
      params.push(req.query.owner_email);
    }

    const properties = await query(sql, params);
    res.json(properties.map(parseProperty));
  } catch (error) {
    console.error('Filter properties error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single property
router.get('/:id', async (req, res) => {
  try {
    const properties = await query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    if (properties.length === 0) return res.status(404).json({ error: 'Property not found' });
    res.json(parseProperty(properties[0]));
  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create property (authenticated)
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title, description, location, price_per_night, capacity,
      cover_image, images, amenities, owner_email
    } = req.body;

    const result = await run(
      `INSERT INTO properties 
       (title, description, location, price_per_night, capacity, cover_image, images, amenities, owner_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        title,
        description || null,
        location || null,
        price_per_night || 0,
        capacity || 0,
        cover_image || null,
        images || [],
        amenities || [],
        owner_email || req.user.email
      ]
    );

    res.status(201).json(parseProperty(result.rows[0]));
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update property (authenticated)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const properties = await query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    if (properties.length === 0) return res.status(404).json({ error: 'Property not found' });

    const property = properties[0];

    if (property.owner_email !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      title, description, location, price_per_night, capacity,
      cover_image, images, amenities
    } = req.body;

    await run(
      `UPDATE properties SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         location = COALESCE($3, location),
         price_per_night = COALESCE($4, price_per_night),
         capacity = COALESCE($5, capacity),
         cover_image = COALESCE($6, cover_image),
         images = COALESCE($7, images),
         amenities = COALESCE($8, amenities),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9`,
      [
        title, description, location, price_per_night, capacity,
        cover_image, images, amenities,
        req.params.id
      ]
    );

    const updated = await query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    res.json(parseProperty(updated[0]));
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete property (authenticated)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const properties = await query('SELECT * FROM properties WHERE id = $1', [req.params.id]);
    if (properties.length === 0) return res.status(404).json({ error: 'Property not found' });

    const property = properties[0];

    if (property.owner_email !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await run('DELETE FROM properties WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
