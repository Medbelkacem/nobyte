import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Theme } from '@/types/db';

interface ThemeCtx {
  theme: Theme;            // préférence utilisateur
  effective: 'light' | 'dark'; // résolution réelle (light | dark)
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);
const STORAGE_KEY = 'nobty.theme';

function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch { /* ignore */ }
  return 'auto';
}

function resolve(t: Theme): 'light' | 'dark' {
  if (t === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return t;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [effective, setEffective] = useState<'light' | 'dark'>(() => resolve(getStoredTheme()));

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setEffective(resolve(theme));
    update();
    if (theme === 'auto') {
      mq.addEventListener?.('change', update);
      return () => mq.removeEventListener?.('change', update);
    }
  }, [theme]);

  // Applique la classe sur <html> et le bg sur <body>
  useEffect(() => {
    const root = document.documentElement;
    if (effective === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    document.body.classList.toggle('bg-dark', effective === 'dark');
    document.body.classList.toggle('bg-light', effective === 'light');
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', effective === 'dark' ? '#0D1B2A' : '#2D6A4F');
  }, [effective]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch { /* ignore */ }
  };

  const value = useMemo(() => ({ theme, effective, setTheme }), [theme, effective]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
