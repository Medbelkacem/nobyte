import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/providers/AuthProvider';
import { OfflineBanner } from '@/providers/OutboxProvider';
import { ZellijStar } from '@/components/zellij/ZellijStar';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import type { Lang, Theme } from '@/types/db';

const LANGS: Lang[] = ['fr', 'ar', 'en'];

export function AppShell() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-dvh flex flex-col safe-top">
      {/* ============================== HEADER ============================== */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-ivory/80 dark:bg-night/80 border-b border-gold/20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <NavLink to="/" className="flex items-center gap-2 no-select" aria-label="Accueil">
            <ZellijStar size={32} />
            <span className="font-display text-xl font-semibold text-emerald dark:text-gold">
              {t('app.name')}
            </span>
          </NavLink>

          <div className="ms-auto flex items-center gap-1">
            {/* Sélecteur de langue compact */}
            <div className="flex items-center bg-emerald/5 dark:bg-night-card rounded-full p-1 border border-gold/20">
              {LANGS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full uppercase font-semibold transition',
                    lang === l ? 'bg-emerald text-ivory' : 'text-leather/70 dark:text-ivory/70',
                  )}
                >
                  {l === 'ar' ? 'ع' : l}
                </button>
              ))}
            </div>

            {/* Sélecteur de thème compact */}
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>
      </header>

      <OfflineBanner />

      {/* ============================== CONTENU ============================== */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* ============================== BOTTOM NAV ============================== */}
      <nav className="sticky bottom-0 safe-bottom bg-ivory/90 dark:bg-night/95 border-t border-gold/20 backdrop-blur z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-around py-2">
          <NavTab to="/" icon="home" label={t('nav.home')} active={location.pathname === '/'} />
          <NavTab to="/flow/wilaya" icon="ticket" label={t('nav.new_ticket')} active={location.pathname.startsWith('/flow') || location.pathname.startsWith('/ticket')} />
          <NavTab to="/me/tickets" icon="bell" label={t('nav.my_tickets')} active={location.pathname.startsWith('/me/tickets')} />
          <NavTab to="/me" icon="user" label={t('nav.profile')} active={location.pathname === '/me'} />
          {user && (user.role === 'agent' || user.role === 'admin') && (
            <NavTab to="/agent" icon="briefcase" label={t('nav.agent')} active={location.pathname.startsWith('/agent')} />
          )}
          {user && user.role === 'admin' && (
            <NavTab to="/admin" icon="scale" label="Admin" active={location.pathname.startsWith('/admin')} />
          )}
        </div>
      </nav>
    </div>
  );
}

function NavTab({ to, icon, label, active }: { to: string; icon: string; label: string; active?: boolean }) {
  return (
    <NavLink
      to={to}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition',
        active ? 'text-emerald dark:text-gold' : 'text-leather/60 dark:text-ivory/60 hover:text-leather dark:hover:text-ivory',
      )}
    >
      <Icon name={icon} size={22} />
      <span className="text-[10px] font-semibold">{label}</span>
    </NavLink>
  );
}

function ThemeToggle({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const cycle: Theme[] = ['auto', 'light', 'dark'];
  const next = () => setTheme(cycle[(cycle.indexOf(theme) + 1) % cycle.length]);
  const icon = theme === 'dark' ? 'moon' : theme === 'light' ? 'sun' : 'globe';
  return (
    <button
      onClick={next}
      className="ms-1 p-2 rounded-full border border-gold/20 text-leather/70 dark:text-ivory/80 hover:bg-gold/10"
      aria-label="Thème"
      title={`Thème : ${theme}`}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
