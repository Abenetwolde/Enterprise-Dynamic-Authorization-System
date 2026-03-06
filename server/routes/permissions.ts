import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Get all permissions
router.get('/', authenticate, authorize('roles.manage'), (req, res) => {
  const permissions = db.prepare('SELECT * FROM permissions').all();
  res.json(permissions);
});

// Create permission
const permSchema = z.object({
  resource: z.string().min(2),
  action: z.string().min(2),
  description: z.string().optional(),
});

router.post('/', authenticate, authorize('roles.manage'), (req, res) => {
  try {
    const { resource, action, description } = permSchema.parse(req.body);
    const result = db.prepare('INSERT INTO permissions (resource, action, description) VALUES (?, ?, ?)').run(resource, action, description);
    res.status(201).json({ id: result.lastInsertRowid, resource, action, description });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
