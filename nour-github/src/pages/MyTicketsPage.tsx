import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '@/hooks/useCollection';
import type { Ticket } from '@/types/db';
import { useAuth } from '@/providers/AuthProvider';
import { useOutbox } from '@/providers/OutboxProvider';
import { useI18n } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

type ExpandedTicket = Ticket & {
  expand?: {
    service?: { name_fr: string; name_ar: string; name_en: string; establishment: string };
  };
};

export function MyTicketsPage() {
  const { user } = useAuth();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const { items, loading } = useCollection<ExpandedTicket>('tickets', {
    filter: user ? `user = "${user.id}"` : undefined,
    sort: '-issued_at',
    expand: 'service',
    subscribe: true,
    subscribeTarget: '*',
  });

  const { entries: outbox, drop, flush, syncing, online } = useOutbox();

  const [active, past] = useMemo(() => {
    const a: ExpandedTicket[] = [];
    const p: ExpandedTicket[] = [];
    for (const t of items) {
      if (t.status === 'waiting' || t.status === 'called') a.push(t);
      else p.push(t);
    }
    return [a, p];
  }, [items]);

  if (loading) return <Spinner />;

  if (items.length === 0 && outbox.length === 0) {
    return (
      <div className="py-16 text-center space-y-5">
        <Icon name="ticket" size={48} className="text-gold mx-auto" />
        <p className="text-leather/70 dark:text-ivory/70">{t('tickets.empty')}</p>
        <Button onClick={() => navigate('/flow/wilaya')} leftIcon={<Icon name="ticket" size={18} />}>
          {t('tickets.empty_cta')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <h1 className="font-display text-2xl">{t('tickets.title')}</h1>

      {outbox.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-widest text-gold-700 dark:text-gold font-semibold flex items-center gap-2">
            <Icon name="clock" size={14} /> En attente de réseau
          </h2>
          {outbox.map((entry) => (
            <Card key={entry.id} className="flex items-center gap-4 border-gold/40 bg-gold/5">
              <div className="w-12 h-12 rounded-2xl bg-gold/15 text-gold flex items-center justify-center">
                <Icon name={entry.status === 'syncing' ? 'spinner' : 'clock'} size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display">{entry.service_name}</p>
                <p className="text-xs text-leather/60 dark:text-ivory/60 truncate">
                  {entry.establishment_name}
                  {entry.status === 'error' && entry.error ? ` · ${entry.error}` : ''}
                </p>
              </div>
              {online && entry.status !== 'syncing' && (
                <button onClick={() => flush()} disabled={syncing}
                        className="text-xs font-semibold text-emerald dark:text-gold hover:underline disabled:opacity-50">
                  Synchroniser
                </button>
              )}
              <button onClick={() => drop(entry.id)} aria-label="Retirer"
                      className="text-leather/40 hover:text-red-500">
                <Icon name="x" size={18} />
              </button>
            </Card>
          ))}
        </section>
      )}

      {active.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-widest text-emerald dark:text-gold font-semibold">
            {t('tickets.active')}
          </h2>
          {active.map((tk) => (
            <Link key={tk.id} to={`/ticket/${tk.id}`}>
              <Card interactive className="flex items-center gap-4 bg-emerald/5 dark:bg-emerald/10 border-emerald/30">
                <div className="w-14 h-14 rounded-2xl bg-gold-grain text-leather flex items-center justify-center font-ticket text-2xl shadow-zellij">
                  {String(tk.number).padStart(3, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display">{nameFor(tk, lang)}</p>
                  <p className="text-xs text-leather/60 dark:text-ivory/60">
                    {tk.status === 'called' ? t('tickets.called') : t('agent.waiting')}
                  </p>
                </div>
                <Icon name="chevron" className="text-emerald dark:text-gold" />
              </Card>
            </Link>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm uppercase tracking-widest text-leather/60 dark:text-ivory/60 font-semibold">
            {t('tickets.past')}
          </h2>
          {past.map((tk) => (
            <Card key={tk.id} className="flex items-center gap-4 opacity-80">
              <div className={cn(
                'w-12 h-12 rounded-2xl flex items-center justify-center font-ticket text-xl',
                'bg-leather/10 dark:bg-night-card text-leather/70 dark:text-ivory/70',
              )}>
                {String(tk.number).padStart(3, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display">{nameFor(tk, lang)}</p>
                <p className="text-xs text-leather/60 dark:text-ivory/60">
                  {labelOf(tk.status, t)} · {new Date(tk.issued_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}

function nameFor(tk: ExpandedTicket, lang: string): string {
  const svc = tk.expand?.service;
  if (!svc) return '—';
  if (lang === 'ar') return svc.name_ar;
  if (lang === 'en') return svc.name_en;
  return svc.name_fr;
}

function labelOf(status: Ticket['status'], t: (k: string) => string): string {
  switch (status) {
    case 'served':    return t('tickets.served');
    case 'cancelled': return t('common.cancel');
    case 'missed':    return t('tickets.missed');
    default:          return status;
  }
}
