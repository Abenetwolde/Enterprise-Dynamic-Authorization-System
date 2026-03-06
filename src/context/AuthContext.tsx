import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Permission {
  resource: string;
  action: string;
  source: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: Permission[];
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      fetchPermissions(token, JSON.parse(storedUser).id);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchPermissions = async (authToken: string, userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}/permissions`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } catch (err) {
      console.error('Failed to fetch permissions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    fetchPermissions(newToken, newUser.id);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setPermissions([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasPermission = (permission: string) => {
    const [resource, action] = permission.split('.');
    
    // Check for explicit deny first
    const isDenied = permissions.some(p => p.resource === resource && p.action === action && p.source === 'deny');
    if (isDenied) return false;

    // Check for allow (either from role or direct)
    return permissions.some(p => p.resource === resource && p.action === action && (p.source === 'allow' || p.source === 'role'));
  };

  return (
    <AuthContext.Provider value={{ user, token, permissions, login, logout, hasPermission, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function usePermission(permission: string) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}
