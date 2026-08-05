import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const { isAuthed } = useAuth();
  const [settings, setSettings] = useState({ happy_hour_enabled: false, happy_hour_percent: 15 });

  const refresh = useCallback(async () => {
    if (!isAuthed) return;
    try {
      const { data } = await api.get("/settings");
      setSettings(data);
    } catch (_) { /* ignore */ }
  }, [isAuthed]);

  useEffect(() => { refresh(); }, [refresh]);

  const update = async (patch) => {
    const { data } = await api.put("/settings", patch);
    setSettings(data);
    return data;
  };

  return (
    <SettingsContext.Provider value={{ settings, update, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
