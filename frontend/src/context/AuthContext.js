import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("rc_token"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (token) {
        try {
          await api.get("/auth/verify");
        } catch {
          localStorage.removeItem("rc_token");
          setToken(null);
        }
      }
      setReady(true);
    })();
    // eslint-disable-next-line
  }, []);

  const login = async (password) => {
    const { data } = await api.post("/auth/login", { password });
    localStorage.setItem("rc_token", data.token);
    setToken(data.token);
    // Seed on first login (idempotent server-side)
    try { await api.post("/seed"); } catch (_e) { /* seed non-critical */ }
    return true;
  };

  const logout = () => {
    localStorage.removeItem("rc_token");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, ready, login, logout, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
