import { useEffect, useMemo, useState } from 'react';
import { useCollection } from '@/hooks/useCollection';
import { useQueueCounter } from '@/hooks/useQueueCounter';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n, pickName } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { ZellijStar } from '@/components/zellij/ZellijStar';
import { callApi, pb } from '@/lib/pb';
import type { Service, Ticket } from '@/types/db';
import { cn } from '@/lib/cn';
import { useNavigate } from 'react-router-dom';

export function AgentDashboard() {
  const { user, signOut } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const { items: services, loading: loadingSvc } = useCollection<Service>('services', {
    filter: user?.agent_establishment_id
      ? `establishment = "${user.agent_establishment_id}" && is_active = true`
      : 'is_active = true',
    sort: '+name_fr',
  });

  const [serviceId, setServiceId] = useState<string | null>(null);
  useEffect(() => {
    if (!serviceId && services.length > 0) setServiceId(services[0].id);
  }, [services, serviceId]);

  const service = services.find((s) => s.id === serviceId) || null;
  const { counter } = useQueueCounter(serviceId ?? undefined);

  const { items: tickets, loading: loadingTk, refresh } = useCollection<Ticket>('tickets', {
    filter: serviceId ? `service = "${serviceId}" && (status = "waiting" || status = "called")` : 'status = "waiting"',
    sort: '+number',
    subscribe: !!serviceId,
    subscribeTarget: '*',
  });

  const [advancing, setAdvancing] = useState(false);
  const handleNext = async () => {
    if (!serviceId) return;
    setAdvancing(true);
    try {
      await callApi('advance-queue', { service: serviceId });
      refresh();
    } catch (e: any) {
      if (e?.status === 409) {
        toast.push('info', t('agent.queue_empty'));
      } else {
        toast.push('error', e?.message || t('common.error'));
      }
    } finally {
      setAdvancing(false);
    }
  };

  const waiting = useMemo(() => tickets.filter((tk) => tk.status === 'waiting'), [tickets]);
  const called  = useMemo(() => tickets.find((tk) => tk.status === 'called'),     [tickets]);

  return (
    <div className="min-h-dvh safe-top safe-bottom flex flex-col">
      <header className="sticky top-0 z-30 bg-emerald text-ivory border-b border-gold/20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <ZellijStar size={28} variant="gold" />
          <div>
            <p className="font-display text-xl leading-none">{t('agent.title')}</p>
            <p className="text-xs text-ivory/70">{user?.first_name} {user?.last_name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto text-ivory border-ivory/30 hover:bg-ivory/10"
            onClick={() => { signOut(); navigate('/login'); }}
          >
            {t('nav.logout')}
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 space-y-6">
        {/* Sélecteur de service */}
        <Card>
          <p className="text-xs uppercase tracking-widest text-leather/60 dark:text-ivory/60 mb-2">
            {t('agent.select_service')}
          </p>
          {loadingSvc ? <Spinner /> : (
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setServiceId(s.id)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold border transition',
                    serviceId === s.id
                      ? 'bg-emerald text-ivory border-emerald'
                      : 'bg-transparent border-leather/15 dark:border-night-border text-leather dark:text-ivory hover:bg-emerald/5 dark:hover:bg-gold/10',
                  )}
                >
                  {pickName(s, lang)}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Compteur géant */}
        <Card className="text-center bg-gold-grain text-leather border-gold/40">
          <p className="text-xs uppercase tracking-widest">{t('flow.now_serving')}</p>
          <p className="font-ticket text-[clamp(6rem,22vw,12rem)] leading-none text-leather">
            {String(counter?.now_serving ?? 0).padStart(3, '0')}
          </p>
          <p className="text-sm text-leather/80 mt-2">
            {service && pickName(service, lang)} · {t('agent.waiting')} : {waiting.length}
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-5 mx-auto"
            loading={advancing}
            disabled={!serviceId || (waiting.length === 0 && !called)}
            onClick={handleNext}
            rightIcon={<Icon name="chevron" />}
          >
            {t('agent.next')}
          </Button>
        </Card>

        {/* Ticket en cours d'appel */}
        {called && (
          <Card arch className="border-tlemcen/40">
            <p className="text-xs uppercase tracking-widest text-tlemcen">{t('tickets.called')}</p>
            <p className="font-ticket text-5xl text-tlemcen mt-1">
              {String(called.number).padStart(3, '0')}
            </p>
          </Card>
        )}

        {/* File d'attente */}
        <Card>
          <h2 className="font-display text-lg mb-3">{t('agent.waiting')}</h2>
          {loadingTk ? <Spinner /> : waiting.length === 0 ? (
            <p className="text-leather/60 dark:text-ivory/60">{t('agent.queue_empty')}</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {waiting.slice(0, 30).map((tk) => (
                <div
                  key={tk.id}
                  className="rounded-2xl border border-leather/15 dark:border-night-border p-3 text-center"
                >
                  <p className="font-ticket text-2xl text-leather dark:text-ivory">
                    {String(tk.number).padStart(3, '0')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
