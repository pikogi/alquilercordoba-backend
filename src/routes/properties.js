import express from 'express';
import { query, run } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Parse JSON fields
const parseProperty = (prop) => ({
  ...prop,
  images: prop.images ? JSON.parse(prop.images) : [],
  amenities: prop.amenities ? JSON.parse(prop.amenities) : [],
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

    if (req.query.id) {
      sql += ' AND id = ?';
      params.push(req.query.id);
    }
    if (req.query.owner_email) {
      sql += ' AND owner_email = ?';
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
    const properties = await query('SELECT * FROM properties WHERE id = ?', [req.params.id]);
    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
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
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        location || null,
        price_per_night || 0,
        capacity || 0,
        cover_image || null,
        JSON.stringify(images || []),
        JSON.stringify(amenities || []),
        owner_email || req.user.email
      ]
    );

    const newProperty = await query('SELECT * FROM properties WHERE id = ?', [result.lastID]);
    res.status(201).json(parseProperty(newProperty[0]));
  } catch (error) {
    console.error('Create property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update property (authenticated)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const property = await query('SELECT * FROM properties WHERE id = ?', [req.params.id]);
    if (property.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Check ownership or admin
    if (property[0].owner_email !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const {
      title, description, location, price_per_night, capacity,
      cover_image, images, amenities
    } = req.body;

    await run(
      `UPDATE properties SET
       title = COALESCE(?, title),
       description = COALESCE(?, description),
       location = COALESCE(?, location),
       price_per_night = COALESCE(?, price_per_night),
       capacity = COALESCE(?, capacity),
       cover_image = COALESCE(?, cover_image),
       images = COALESCE(?, images),
       amenities = COALESCE(?, amenities),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title, description, location, price_per_night, capacity,
        cover_image, JSON.stringify(images), JSON.stringify(amenities),
        req.params.id
      ]
    );

    const updated = await query('SELECT * FROM properties WHERE id = ?', [req.params.id]);
    res.json(parseProperty(updated[0]));
  } catch (error) {
    console.error('Update property error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

