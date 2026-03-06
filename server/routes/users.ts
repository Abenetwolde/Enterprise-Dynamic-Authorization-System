import express from 'express';
import { db } from '../db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = express.Router();

// Get all users with their roles
router.get('/', authenticate, authorize('users.read'), (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.created_at,
    GROUP_CONCAT(r.name) as roles
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    GROUP BY u.id
  `).all();
  res.json(users);
});

// Get user permissions (Resolved set)
router.get('/:id/permissions', authenticate, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  // Only admins can view other users' permissions, or the user themselves
  if ((req as AuthRequest).user?.id !== userId) {
    // Check if requester has users.read permission
    // This is a bit recursive, but for simplicity:
    const requesterId = (req as AuthRequest).user?.id;
    const isAdmin = db.prepare(`
      SELECT 1 FROM user_roles ur JOIN roles r ON ur.role_id = r.id 
      WHERE ur.user_id = ? AND r.name = 'Administrator'
    `).get(requesterId);
    
    if (!isAdmin) return res.status(403).json({ error: 'Forbidden' });
  }

  const permissions = db.prepare(`
    -- Permissions from Roles
    SELECT p.resource, p.action, 'role' as source FROM permissions p
    JOIN role_permissions rp ON p.id = rp.permission_id
    JOIN user_roles ur ON rp.role_id = ur.role_id
    WHERE ur.user_id = ?
    
    UNION
    
    -- Direct Overrides
    SELECT p.resource, p.action, up.type as source FROM permissions p
    JOIN user_permissions up ON p.id = up.permission_id
    WHERE up.user_id = ?
  `).all(userId, userId);

  res.json(permissions);
});

// Assign roles to user
const assignRolesSchema = z.object({
  roleIds: z.array(z.number()),
});

router.post('/:id/roles', authenticate, authorize('roles.manage'), (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { roleIds } = assignRolesSchema.parse(req.body);

    const deleteOld = db.prepare('DELETE FROM user_roles WHERE user_id = ?');
    const insertNew = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');

    const transaction = db.transaction(() => {
      deleteOld.run(userId);
      roleIds.forEach(rid => insertNew.run(userId, rid));
    });

    transaction();
    res.json({ message: 'User roles updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Assign direct permissions (overrides)
const overridePermsSchema = z.object({
  overrides: z.array(z.object({
    permissionId: z.number(),
    type: z.enum(['allow', 'deny'])
  })),
});

router.post('/:id/permissions', authenticate, authorize('roles.manage'), (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { overrides } = overridePermsSchema.parse(req.body);

    const deleteOld = db.prepare('DELETE FROM user_permissions WHERE user_id = ?');
    const insertNew = db.prepare('INSERT INTO user_permissions (user_id, permission_id, type) VALUES (?, ?, ?)');

    const transaction = db.transaction(() => {
      deleteOld.run(userId);
      overrides.forEach(o => insertNew.run(userId, o.permissionId, o.type));
    });

    transaction();
    res.json({ message: 'User permission overrides updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
