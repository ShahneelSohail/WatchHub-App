import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import { restoreToken, storeToken } from './session';
import type { User } from './types';

interface AuthValue {
  user: User | null;
  ready: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreToken()
      .then(() => api.get<User>('/auth/me'))
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const login = useCallback<AuthValue['login']>(async input => setUser(await api.signIn('/auth/login', input)), []);
  const register = useCallback<AuthValue['register']>(async input => setUser(await api.signIn('/auth/register', input)), []);
  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    await storeToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(() => ({ user, ready, login, register, logout, setUser }), [user, ready, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthValue => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};

export const requestPasswordReset = (email: string) => api.post<{ message: string }>('/auth/forgot-password', { email });
