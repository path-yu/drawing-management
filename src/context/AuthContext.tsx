import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../utils/api';

export interface User {
  id: number;
  username: string;
  real_name: string | null;
  email: string | null;
  phone: string | null;
  role_id: number | null;
  role_name: string | null;
  role_code: string | null;
  status: number;
  avatar: string | null;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, real_name?: string, email?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const refreshUser = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) return;
    try {
      const res = await api.get<User>('/auth/profile');
      if (res.code === 200) {
        setUser(res.data);
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    if (token && !user) {
      refreshUser();
    }
  }, [token, user, refreshUser]);

  const login = async (username: string, password: string): Promise<boolean> => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { username, password });
    if (res.code === 200 && res.data) {
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return true;
    }
    throw new Error(res.message);
  };

  const register = async (
    username: string,
    password: string,
    real_name?: string,
    email?: string
  ): Promise<boolean> => {
    const res = await api.post<{ token: string; user: User }>('/auth/register', {
      username,
      password,
      real_name,
      email,
    });
    if (res.code === 200 && res.data) {
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return true;
    }
    throw new Error(res.message);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role_code === 'super_admin') return true;
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role_code === 'super_admin') return true;
    return permissions.some((p) => user.permissions.includes(p));
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, hasPermission, hasAnyPermission, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
