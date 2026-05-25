import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRecord } from '@/hooks/useCollection';
import { useQueueCounter } from '@/hooks/useQueueCounter';
import type { Service, Ticket } from '@/types/db';
import { useI18n, pickName } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { CountdownRing } from '@/components/queue/CountdownRing';
import { ZellijStar } from '@/components/zellij/ZellijStar';
import { MoorishArch } from '@/components/zellij/MoorishArch';
import { callApi } from '@/lib/pb';
import { useToast, usePushNotification } from '@/components/ui/Toast';
import { cn } from '@/lib/cn';

export function TicketPage() {
  const { ticketId = '' } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const toast = useToast();
  const pushNotif = usePushNotification();

  const { data: ticket, refresh: refreshTicket } = useRecord<Ticket>('tickets', ticketId, { subscribe: true });
  const { data: service } = useRecord<Service>('services', ticket?.service);
  const { counter } = useQueueCounter(ticket?.service);

  const myNumber = ticket?.number ?? 0;
  const nowServing = counter?.now_serving ?? 0;
  const position = Math.max(0, myNumber - nowServing);
  const eta = position * (service?.avg_duration_min ?? 8);

  const [cancelling, setCancelling] = useState(false);

  // Notifications push : à 3 puis 1 puis 0
  const notifiedAt = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!ticket || !service) return;
    if (ticket.status !== 'waiting' && ticket.status !== 'called') return;
    if (position === 3 && !notifiedAt.current.has(3)) {
      notifiedAt.current.add(3);
      pushNotif('Bientôt votre tour', `Plus que 3 personnes avant le n°${myNumber}.`);
    }
    if (position === 1 && !notifiedAt.current.has(1)) {
      notifiedAt.current.add(1);
      pushNotif('Presque à vous', 'Préparez vos documents.');
    }
    if (position === 0 && !notifiedAt.current.has(0)) {
      notifiedAt.current.add(0);
      pushNotif("C'est votre tour", `Présentez-vous au guichet avec le n°${myNumber}.`);
      // vibration mobile
      if ('vibrate' in navigator) navigator.vibrate([200, 80, 200]);
    }
  }, [position, ticket, service, pushNotif, myNumber]);

  const handleCancel = async () => {
    if (!ticket) return;
    if (!confirm(t('tickets.cancel_confirm'))) return;
    setCancelling(true);
    try {
      await callApi('cancel-ticket', { ticket: ticket.id });
      toast.push('success', t('tickets.cancelled'));
      refreshTicket();
    } catch (e: any) {
      toast.push('error', e?.message || t('common.error'));
    } finally {
      setCancelling(false);
    }
  };

  if (!ticket) return <Spinner label={t('common.loading')} />;

  const statusBadge = {
    waiting:   { label: t('agent.waiting'), cls: 'bg-tlemcen/15 text-tlemcen dark:bg-tlemcen/30 dark:text-ivory' },
    called:    { label: t('tickets.called'), cls: 'bg-gold/20 text-gold-700 dark:text-gold animate-star-pulse' },
    served:    { label: t('tickets.served'), cls: 'bg-emerald/20 text-emerald dark:text-ivory' },
    cancelled: { label: t('common.cancel'),  cls: 'bg-leather/15 text-leather/60 dark:text-ivory/60' },
    missed:    { label: t('tickets.missed'), cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200' },
  }[ticket.status];

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/me/tickets')} leftIcon={<Icon name="back" />}>
          {t('nav.my_tickets')}
        </Button>
      </header>

      {/* Carte ticket principale */}
      <Card className="relative overflow-hidden bg-gold-grain text-leather shadow-ticket border-gold/40">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <ZellijStar size={420} className="absolute -right-24 -top-24" variant="emerald" />
        </div>
        <MoorishArch className="mb-2 text-leather/40" />
        <div className="relative text-center">
          <p className="font-display text-sm uppercase tracking-widest">{t('flow.your_number')}</p>
          <p className="ticket-number">{String(myNumber).padStart(3, '0')}</p>
          {service && (
            <p className="font-display text-base mt-2 text-leather/80">
              {pickName(service, lang)}
            </p>
          )}
          <span className={cn('inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full', statusBadge.cls)}>
            {statusBadge.label}
          </span>
        </div>
      </Card>

      {/* Tracker realtime */}
      <Card className="text-center">
        <p className="text-xs uppercase tracking-widest text-leather/60 dark:text-ivory/60 mb-3">
          {t('flow.my_position')}
        </p>
        <CountdownRing
          value={position}
          max={Math.max(position, 5)}
          label={t('flow.my_position')}
          sublabel={`${t('flow.eta')} ${t('common.minutes', { n: eta })}`}
        />
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-2xl border border-leather/10 dark:border-night-border p-3">
            <p className="text-xs uppercase tracking-widest text-leather/60 dark:text-ivory/60">
              {t('flow.now_serving')}
            </p>
            <p className="font-ticket text-3xl text-emerald dark:text-gold">
              {String(nowServing).padStart(3, '0')}
            </p>
          </div>
          <div className="rounded-2xl border border-leather/10 dark:border-night-border p-3">
            <p className="text-xs uppercase tracking-widest text-leather/60 dark:text-ivory/60">
              {t('flow.eta')}
            </p>
            <p className="font-ticket text-3xl text-emerald dark:text-gold">
              {eta}<span className="text-base"> min</span>
            </p>
          </div>
        </div>

        {(ticket.status === 'waiting' || ticket.status === 'called') && (
          <Button
            variant="danger"
            className="mt-5"
            loading={cancelling}
            onClick={handleCancel}
            leftIcon={<Icon name="x" size={18} />}
          >
            {t('common.cancel')}
          </Button>
        )}
      </Card>
    </div>
  );
}
