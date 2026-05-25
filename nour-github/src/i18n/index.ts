import { createContext, useContext, useEffect, useMemo, useState, type ReactNode, createElement } from 'react';
import { fr, type Dict } from './locales/fr';
import { ar } from './locales/ar';
import { en } from './locales/en';
import type { Lang } from '@/types/db';

const DICTS: Record<Lang, Dict> = { fr, ar, en };
const RTL: Record<Lang, 'ltr' | 'rtl'> = { fr: 'ltr', en: 'ltr', ar: 'rtl' };

interface I18nCtx {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  t: (path: string, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18nCtx | null>(null);
const STORAGE_KEY = 'nobty.lang';

function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved && (saved === 'fr' || saved === 'ar' || saved === 'en')) return saved;
  } catch { /* ignore */ }
  const nav = navigator.language?.toLowerCase() ?? 'fr';
  if (nav.startsWith('ar')) return 'ar';
  if (nav.startsWith('en')) return 'en';
  return 'fr';
}

/** Récupère une valeur imbriquée via "a.b.c". */
function lookup(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

function format(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => detectLang());

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
  };

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL[lang];
  }, [lang]);

  const value: I18nCtx = useMemo(() => ({
    lang,
    dir: RTL[lang],
    setLang,
    t: (path, vars) => {
      const val = lookup(DICTS[lang], path) ?? lookup(DICTS.fr, path);
      return typeof val === 'string' ? format(val, vars) : path;
    },
  }), [lang]);

  return createElement(Ctx.Provider, { value }, children);
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Helper hors React (pour les hooks ou utilitaires) : renvoie la fonction de trad courante. */
export function pickName<T extends { name_fr: string; name_ar: string; name_en?: string }>(
  obj: T, lang: Lang,
): string {
  if (lang === 'ar') return obj.name_ar;
  if (lang === 'en') return obj.name_en ?? obj.name_fr;
  return obj.name_fr;
}
