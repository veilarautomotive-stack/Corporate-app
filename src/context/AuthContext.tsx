import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  role: string;
  theme: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Always return a default admin user
  const [user, setUser] = useState<User | null>({
    id: 'default-admin',
    username: 'admin',
    role: 'admin',
    theme: 'light'
  });
  const [loading, setLoading] = useState(false);

  const login = (userData: User) => {
    setUser(userData);
  };

  const logout = () => {
    // No-op
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
