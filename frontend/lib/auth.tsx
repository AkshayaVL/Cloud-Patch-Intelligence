"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { authAPI } from "./api";

interface User {
  user_id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("cpi_token");
    const savedUser = localStorage.getItem("cpi_user");
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authAPI.login(email, password);
    const { access_token, user_id } = res.data;
    const userData = { user_id, email };
    localStorage.setItem("cpi_token", access_token);
    localStorage.setItem("cpi_user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  };

  const register = async (email: string, password: string) => {
    const res = await authAPI.register(email, password);
    const { access_token, user_id } = res.data;
    const userData = { user_id, email };
    localStorage.setItem("cpi_token", access_token);
    localStorage.setItem("cpi_user", JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("cpi_token");
    localStorage.removeItem("cpi_user");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}