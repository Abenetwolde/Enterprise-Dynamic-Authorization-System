import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../auth.db');
export const db = new Database(dbPath);

export function initDb() {
  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Roles Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Permissions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource TEXT NOT NULL,
      action TEXT NOT NULL,
      description TEXT,
      UNIQUE(resource, action),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Role-Permissions Mapping
  db.exec(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id INTEGER,
      permission_id INTEGER,
      PRIMARY KEY (role_id, permission_id),
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `);

  // User-Roles Mapping
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_roles (
      user_id INTEGER,
      role_id INTEGER,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
    )
  `);

  // User-Permissions Overrides (Direct assignment)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_permissions (
      user_id INTEGER,
      permission_id INTEGER,
      type TEXT CHECK(type IN ('allow', 'deny')) NOT NULL,
      PRIMARY KEY (user_id, permission_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    )
  `);

  // Policies Table (Rule-based control)
  db.exec(`
    CREATE TABLE IF NOT EXISTS policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      condition TEXT NOT NULL, -- JSON string of rules
      effect TEXT CHECK(effect IN ('allow', 'deny')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Audit Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // Seed initial data if empty
  seedData();
}

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    console.log('🌱 Seeding initial data...');

    // Create Admin User
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const insertUser = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const adminId = insertUser.run('admin', 'admin@example.com', hashedPassword).lastInsertRowid;

    // Create Roles
    const insertRole = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
    const adminRoleId = insertRole.run('Administrator', 'Full system access').lastInsertRowid;
    const managerRoleId = insertRole.run('Manager', 'Management access').lastInsertRowid;
    const userRoleId = insertRole.run('User', 'Standard user access').lastInsertRowid;

    // Create Permissions
    const insertPermission = db.prepare('INSERT INTO permissions (resource, action, description) VALUES (?, ?, ?)');
    const perms = [
      ['users', 'create', 'Create new users'],
      ['users', 'read', 'View users'],
      ['users', 'update', 'Update user details'],
      ['users', 'delete', 'Delete users'],
      ['roles', 'manage', 'Manage roles and permissions'],
      ['reports', 'view', 'View reports'],
      ['reports', 'export', 'Export reports'],
      ['system', 'settings', 'Update system settings']
    ];

    const permIds: Record<string, number> = {};
    perms.forEach(([res, act, desc]) => {
      permIds[`${res}.${act}`] = insertPermission.run(res, act, desc).lastInsertRowid as number;
    });

    // Assign Permissions to Admin Role (All)
    const insertRolePerm = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    Object.values(permIds).forEach(pid => {
      insertRolePerm.run(adminRoleId, pid);
    });

    // Assign Permissions to Manager Role
    ['users.read', 'reports.view', 'reports.export'].forEach(p => {
      insertRolePerm.run(managerRoleId, permIds[p]);
    });

    // Assign Permissions to User Role
    ['reports.view'].forEach(p => {
      insertRolePerm.run(userRoleId, permIds[p]);
    });

    // Assign Admin Role to Admin User
    const insertUserRole = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
    insertUserRole.run(adminId, adminRoleId);

    console.log('✅ Seeding complete.');
  }
}
