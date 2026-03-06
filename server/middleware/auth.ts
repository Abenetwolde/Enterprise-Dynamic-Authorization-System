import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Authorization Middleware
 * Evaluates permissions based on:
 * 1. Roles assigned to user
 * 2. Direct user permission overrides (allow/deny)
 * 3. (Optional) Policy rules
 */
export const authorize = (requiredPermission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const [resource, action] = requiredPermission.split('.');
    const userId = req.user.id;

    try {
      // 1. Check Direct Deny Overrides (Highest priority)
      const directDeny = db.prepare(`
        SELECT 1 FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = ? AND p.resource = ? AND p.action = ? AND up.type = 'deny'
      `).get(userId, resource, action);

      if (directDeny) {
        return res.status(403).json({ error: 'Forbidden: Permission explicitly denied' });
      }

      // 2. Check Direct Allow Overrides
      const directAllow = db.prepare(`
        SELECT 1 FROM user_permissions up
        JOIN permissions p ON up.permission_id = p.id
        WHERE up.user_id = ? AND p.resource = ? AND p.action = ? AND up.type = 'allow'
      `).get(userId, resource, action);

      if (directAllow) {
        return next();
      }

      // 3. Check Role Permissions
      const rolePerm = db.prepare(`
        SELECT 1 FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = ? AND p.resource = ? AND p.action = ?
      `).get(userId, resource, action);

      if (rolePerm) {
        return next();
      }

      // 4. (Optional) Evaluate Policies
      // For simplicity, we'll skip complex dynamic policy evaluation in this middleware
      // but the structure is there for future expansion.

      return res.status(403).json({ error: `Forbidden: Missing permission ${requiredPermission}` });
    } catch (err) {
      console.error('Authorization error:', err);
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};
