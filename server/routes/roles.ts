import express from 'express';
import { db } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Get all roles
router.get('/', authenticate, authorize('roles.manage'), (req, res) => {
  const roles = db.prepare('SELECT * FROM roles').all();
  res.json(roles);
});

// Create role
const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

router.post('/', authenticate, authorize('roles.manage'), (req, res) => {
  try {
    const { name, description } = roleSchema.parse(req.body);
    const result = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)').run(name, description);
    res.status(201).json({ id: result.lastInsertRowid, name, description });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Get role permissions
router.get('/:id/permissions', authenticate, authorize('roles.manage'), (req, res) => {
  const permissions = db.prepare(`
    SELECT p.* FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    WHERE rp.role_id = ?
  `).all(req.params.id);
  res.json(permissions);
});

// Assign permissions to role
const assignPermsSchema = z.object({
  permissionIds: z.array(z.number()),
});

router.post('/:id/permissions', authenticate, authorize('roles.manage'), (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { permissionIds } = assignPermsSchema.parse(req.body);

    const deleteOld = db.prepare('DELETE FROM role_permissions WHERE role_id = ?');
    const insertNew = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');

    const transaction = db.transaction(() => {
      deleteOld.run(roleId);
      permissionIds.forEach(pid => insertNew.run(roleId, pid));
    });

    transaction();
    res.json({ message: 'Permissions updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
