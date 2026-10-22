import { createContext, useContext, useState, type ReactNode } from 'react';
import { setAuthToken } from '@/api/client';

export type AuthUser = { display_name: string; email: string; avatar: string };

type AuthContextType = {
  loggedIn: boolean;
  user: AuthUser | null;
  login: (user: AuthUser, token?: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  loggedIn: false,
  user: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = (u: AuthUser, token?: string) => {
    if (token) setAuthToken(token);
    setUser(u);
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ loggedIn: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
