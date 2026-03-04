// src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from "react";
import { reconnectSocketWithToken } from "../utils/socket";

const AuthContext = createContext(null);

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("ct_token"));
  const [loading, setLoading] = useState(true);

  // On app load — verify token and fetch user
  useEffect(() => {
    if (token) {
      fetchMe(token);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchMe(t) {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }

  async function register(username, email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");

    localStorage.setItem("ct_token", data.token);
    setToken(data.token);
    setUser(data.user);
    reconnectSocketWithToken();
    return data.user;
  }

  async function login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("ct_token", data.token);
    setToken(data.token);
    setUser(data.user);
    reconnectSocketWithToken();
    return data.user;
  }

  function logout() {
    localStorage.removeItem("ct_token");
    setToken(null);
    setUser(null);
  }

  function updateUser(updatedUser) {
    setUser(updatedUser);
  }

  const isPremium = user?.role === "premium" || user?.role === "admin";
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isLoggedIn,
        isPremium,
        register,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
