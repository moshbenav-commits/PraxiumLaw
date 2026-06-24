import { createContext, useContext, useEffect, useState } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firm, setFirm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("praxium_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then((r) => {
        setUser(r.data.user);
        setFirm(r.data.firm);
      })
      .catch(() => {
        localStorage.removeItem("praxium_token");
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await api.post("/auth/login", { email, password });
    localStorage.setItem("praxium_token", r.data.token);
    localStorage.setItem("praxium_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    setFirm(r.data.firm);
    return r.data;
  };

  const signup = async (payload) => {
    const r = await api.post("/auth/signup", payload);
    localStorage.setItem("praxium_token", r.data.token);
    localStorage.setItem("praxium_user", JSON.stringify(r.data.user));
    setUser(r.data.user);
    setFirm(r.data.firm);
    return r.data;
  };

  const logout = () => {
    localStorage.removeItem("praxium_token");
    localStorage.removeItem("praxium_user");
    setUser(null);
    setFirm(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, firm, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
