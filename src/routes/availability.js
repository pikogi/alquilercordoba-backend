import express from 'express';
import { query, run } from '../database/init.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// List availability (with optional sorting)
router.get('/', async (req, res) => {
  try {
    let sql = 'SELECT * FROM availability';
    const params = [];
    
    if (req.query.property_id) {
      sql += ' WHERE property_id = ?';
      params.push(req.query.property_id);
    }

    // Simple sorting support (-date means DESC)
    if (req.query.sort) {
      const sort = req.query.sort.replace('-', '');
      sql += ` ORDER BY ${sort} DESC`;
    } else {
      sql += ' ORDER BY date DESC';
    }

    // Limit support
    if (req.query.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(req.query.limit));
    }

    const availability = await query(sql, params);
    res.json(availability);
  } catch (error) {
    console.error('List availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Filter availability
router.get('/filter', async (req, res) => {
  try {
    let sql = 'SELECT * FROM availability WHERE 1=1';
    const params = [];

    if (req.query.property_id) {
      sql += ' AND property_id = ?';
      params.push(req.query.property_id);
    }
    if (req.query.date) {
      sql += ' AND date = ?';
      params.push(req.query.date);
    }

    const availability = await query(sql, params);
    res.json({ data: availability });
  } catch (error) {
    console.error('Filter availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create availability (authenticated)
router.post('/', authenticate, async (req, res) => {
  try {
    const { property_id, date, reason } = req.body;

    if (!property_id || !date) {
      return res.status(400).json({ error: 'property_id and date required' });
    }

    // Verify ownership
    const properties = await query('SELECT owner_email FROM properties WHERE id = ?', [property_id]);
    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (properties[0].owner_email !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await run(
      'INSERT INTO availability (property_id, date, reason) VALUES (?, ?, ?)',
      [property_id, date, reason || null]
    );

    const newAvailability = await query('SELECT * FROM availability WHERE id = ?', [result.lastID]);
    res.status(201).json(newAvailability[0]);
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Date already blocked' });
    }
    console.error('Create availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete availability (authenticated)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const availability = await query('SELECT * FROM availability WHERE id = ?', [req.params.id]);
    if (availability.length === 0) {
      return res.status(404).json({ error: 'Availability not found' });
    }

    // Verify ownership
    const properties = await query('SELECT owner_email FROM properties WHERE id = ?', [availability[0].property_id]);
    if (properties.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    if (properties[0].owner_email !== req.user.email && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await run('DELETE FROM availability WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

