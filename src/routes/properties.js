import express from 'express';
import { query, run } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Parse JSON fields
const parseProperty = (prop) => ({
  ...prop,
  images: prop.images || [],
  amenities: prop.amenities || [],
  price_per_night: prop.price_per_night || 0,
  capacity: prop.capacity || 0
});

// List all properties
router.get('/', async (req, res) => {
  try {
    const properties = await query('SELECT * FROM properties ORDER BY created_at DESC');
    res.json(properties.map(parseProperty));
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

    // Check ownership or admin
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

export default router;
