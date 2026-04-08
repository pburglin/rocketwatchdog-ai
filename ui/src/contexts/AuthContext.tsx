import { createContext, useState, type ReactNode } from 'react';
import type { User, RBACPermission } from '../types/api';

interface AuthContextType {
  user: User | null;
  permissions: RBACPermission | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  permissions: null,
  login: async () => false,
  logout: () => {},
  hasPermission: () => false,
  isAdmin: false,
  isLoading: true,
});

// Demo users
const DEMO_USERS: Record<string, { password: string; user: User; permissions: RBACPermission }> = {
  'admin@rocketwatchdog.ai': {
    password: 'admin123',
    user: { id: '1', email: 'admin@rocketwatchdog.ai', name: 'Admin User', role: 'admin' },
    permissions: {
      read: { traffic_logs: true, security_policies: true, integrations: true, config: true },
      write: { security_policies: true, integrations: true, config: true },
    },
  },
  'operator@rocketwatchdog.ai': {
    password: 'operator123',
    user: { id: '2', email: 'operator@rocketwatchdog.ai', name: 'Operator User', role: 'operator' },
    permissions: {
      read: { traffic_logs: true, security_policies: true, integrations: true, config: true },
      write: { security_policies: false, integrations: false, config: true },
    },
  },
  'viewer@rocketwatchdog.ai': {
    password: 'viewer123',
    user: { id: '3', email: 'viewer@rocketwatchdog.ai', name: 'Viewer User', role: 'viewer' },
    permissions: {
      read: { traffic_logs: true, security_policies: false, integrations: false, config: false },
      write: { security_policies: false, integrations: false, config: false },
    },
  },
};

function readStoredAuth(): { user: User | null; permissions: RBACPermission | null } {
  const stored = localStorage.getItem('rwd_user');
  if (!stored) {
    return { user: null, permissions: null };
  }

  try {
    const { user, permissions } = JSON.parse(stored) as {
      user: User;
      permissions: RBACPermission;
    };
    return { user, permissions };
  } catch {
    localStorage.removeItem('rwd_user');
    return { user: null, permissions: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState(() => readStoredAuth());

  const login = async (email: string, password: string): Promise<boolean> => {
    const demoUser = DEMO_USERS[email.toLowerCase()];
    if (demoUser && demoUser.password === password) {
      setAuthState({ user: demoUser.user, permissions: demoUser.permissions });
      localStorage.setItem('rwd_user', JSON.stringify({
        user: demoUser.user,
        permissions: demoUser.permissions,
      }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setAuthState({ user: null, permissions: null });
    localStorage.removeItem('rwd_user');
  };

  const hasPermission = (permission: string): boolean => {
    const { user, permissions } = authState;
    if (!permissions) return false;
    if (user?.role === 'admin') return true;
    
    const [type, section] = permission.split('.');
    if (type === 'read') {
      return permissions.read[section as keyof typeof permissions.read] ?? false;
    }
    if (type === 'write') {
      return permissions.write[section as keyof typeof permissions.write] ?? false;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user: authState.user,
      permissions: authState.permissions,
      login,
      logout,
      hasPermission,
      isAdmin: authState.user?.role === 'admin',
      isLoading: false,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export { AuthContext };
