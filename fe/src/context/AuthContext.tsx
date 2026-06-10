import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AuthContext } from './authContextValue';
import type { LoginPayload, StoredAuth, User } from './authTypes';

const STORAGE_KEY = 'lms.auth';

function decodeJwtPayload(token: string): { exp?: number } | null {
  const parts = token.split('.');

  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as { exp?: number };
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 <= Date.now();
}

function loadStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAuth;

    if (!parsed.user || !parsed.token || isTokenExpired(parsed.token)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedAuth = loadStoredAuth();
  const [user, setUser] = useState<User | null>(storedAuth?.user ?? null);
  const [token, setToken] = useState<string | null>(storedAuth?.token ?? null);
  const [refreshToken, setRefreshToken] = useState<string | null>(storedAuth?.refreshToken ?? null);

  useEffect(() => {
    if (!user || !token) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ user, token, refreshToken }),
    );
  }, [refreshToken, token, user]);

  const login = (payload: LoginPayload) => {
    setUser(payload.user);
    setToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
  };

  const updateUser = (nextUser: User) => {
    setUser(nextUser);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      user,
      token,
      refreshToken,
      login,
      updateUser,
      logout,
      isAuthenticated: Boolean(user && token && !isTokenExpired(token)),
    }),
    [refreshToken, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

