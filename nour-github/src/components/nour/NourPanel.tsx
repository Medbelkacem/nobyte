import { useRef, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ZellijStar } from '@/components/zellij/ZellijStar';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { callApi } from '@/lib/pb';
import { cn } from '@/lib/cn';

interface Msg { role: 'user' | 'assistant'; content: string; }

/**
 * Pastille flottante Nour. S'ouvre en panneau (mobile : feuille pleine,
 * desktop : sidebar droite). Cachée sur /splash, /login, /signup, /verify, /agent.
 */
export function NourPanel() {
  const { t, lang } = useI18n();
  const { isAuthed } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Cache sur certaines routes : on garde le composant monté mais on rendra null en bas
  const hide = ['/splash', '/login', '/signup', '/verify', '/reset', '/agent']
    .some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (!open) return;
    if (msgs.length === 0) {
      setMsgs([{ role: 'assistant', content: t('nour.intro') }]);
    }
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, msgs.length, t]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs]);

  if (hide || !isAuthed) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    const next = [...msgs, { role: 'user' as const, content: text }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await callApi<{ reply: string }>('nour-chat', {
        messages: next.map((m) => ({ role: m.role, content: m.content })),
        lang,
      });
      setMsgs((prev) => [...prev, { role: 'assistant', content: res.reply }]);
    } catch (e: any) {
      setMsgs((prev) => [...prev, { role: 'assistant', content: `⚠️ ${e?.message || 'Erreur'}` }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        aria-label="Nour"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-20 end-4 z-40 rounded-full p-3.5 shadow-ticket',
          'bg-gold-grain text-leather border border-gold/60',
          'animate-star-pulse',
          open && 'hidden',
        )}
      >
        <ZellijStar size={28} variant="emerald" />
      </button>

      {/* Drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-leather/40 dark:bg-black/60 backdrop-blur-sm flex justify-end"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={cn(
              'h-full w-full md:max-w-md bg-ivory dark:bg-night-card',
              'border-l border-gold/30 flex flex-col safe-top safe-bottom',
              'animate-fade-up',
            )}
          >
            <header className="flex items-center gap-3 px-4 py-3 border-b border-gold/20">
              <ZellijStar size={28} variant="duotone" />
              <div>
                <p className="font-display text-lg text-emerald dark:text-gold">{t('nour.title')}</p>
                <p className="text-xs text-leather/60 dark:text-ivory/60">
                  {lang === 'ar' ? 'النور · مساعدك' : 'Nour · assistant trilingue'}
                </p>
              </div>
              <button
                aria-label="close"
                onClick={() => setOpen(false)}
                className="ms-auto p-2 rounded-full hover:bg-leather/5 dark:hover:bg-night-border"
              >
                <Icon name="x" />
              </button>
            </header>

            <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm',
                    m.role === 'user'
                      ? 'bg-emerald text-ivory rounded-br-md'
                      : 'bg-ivory-200 dark:bg-night/70 text-leather dark:text-ivory rounded-bl-md border border-gold/20',
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex">
                  <div className="px-3 py-2 rounded-2xl bg-ivory-200 dark:bg-night/70 border border-gold/20">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-bounce [animation-delay:240ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="px-3 py-3 border-t border-gold/20 flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('nour.placeholder')}
                className="flex-1"
              />
              <Button type="submit" loading={busy} disabled={!input.trim()}>
                {t('nour.send')}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
