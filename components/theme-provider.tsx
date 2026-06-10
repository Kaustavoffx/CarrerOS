"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme =
  | "careeros-dark"
  | "arctic-glass"
  | "midnight-violet"
  | "emerald-command"
  | "carbon-graphite"
  | "solar-gold";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("careeros-dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("careeros-theme") as Theme;
    if (savedTheme) {
      setThemeState(savedTheme);
      document.documentElement.className = savedTheme;
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("careeros-theme", newTheme);
    document.documentElement.className = newTheme;
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
