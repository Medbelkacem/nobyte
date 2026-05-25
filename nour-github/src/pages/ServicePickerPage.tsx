import { useNavigate, useParams } from 'react-router-dom';
import { useCollection, useRecord } from '@/hooks/useCollection';
import type { Establishment, Service } from '@/types/db';
import { useI18n, pickName } from '@/i18n';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { callApi } from '@/lib/pb';
import { useOutbox } from '@/providers/OutboxProvider';
import { useState } from 'react';
import type { Ticket } from '@/types/db';

export function ServicePickerPage() {
  const { establishmentId = '' } = useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();

  const { data: est }  = useRecord<Establishment>('establishments', establishmentId);
  const { items, loading } = useCollection<Service>('services', {
    filter: `establishment = "${establishmentId}" && is_active = true`,
    sort: '+name_fr',
  });
  const { enqueue, online } = useOutbox();
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const enqueueOffline = async (svc: Service) => {
    if (!est) return;
    await enqueue({
      service_id:         svc.id,
      service_name:       svc.name_fr,
      establishment_id:   est.id,
      establishment_name: est.name,
    });
    toast.push('info', 'Hors-ligne : ticket mis en file locale, il sera pris dès le retour du réseau.');
    navigate('/me/tickets');
  };

  const takeTicket = async (svc: Service) => {
    setSubmitting(true);
    setPickedId(svc.id);
    try {
      if (!online) {
        await enqueueOffline(svc);
        return;
      }
      const tk = await callApi<Ticket>('issue-ticket', { service: svc.id });
      navigate(`/ticket/${tk.id}`);
    } catch (e: any) {
      const status = e?.status as number | undefined;
      if (status === 409) {
        toast.push('info', 'Vous avez déjà un ticket actif pour ce service.');
        navigate('/me/tickets');
      } else if (!status) {
        // Pas de status HTTP = erreur réseau → on bascule en outbox.
        await enqueueOffline(svc);
      } else {
        toast.push('error', e?.message || t('common.error'));
      }
    } finally {
      setSubmitting(false);
      setPickedId(null);
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<Icon name="back" />}>
          {t('common.back')}
        </Button>
        <div className="ms-2">
          <p className="text-xs uppercase tracking-wider text-leather/60 dark:text-ivory/60">
            {t('flow.pick_service')}
          </p>
          {est && <p className="font-display text-xl">{est.name}</p>}
        </div>
      </header>

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {items.map((svc) => (
            <Card key={svc.id} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gold/15 text-gold-700 dark:text-gold flex items-center justify-center font-ticket text-xl">
                  ~{svc.avg_duration_min}
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg leading-tight">
                    {pickName(svc, lang)}
                  </p>
                  {lang !== 'ar' && (
                    <p className="text-sm font-arabic text-leather/60 dark:text-ivory/60" dir="rtl">
                      {svc.name_ar}
                    </p>
                  )}
                  <p className="text-xs text-leather/60 dark:text-ivory/60 mt-1">
                    Durée moyenne : {t('common.minutes', { n: svc.avg_duration_min })}
                  </p>
                </div>
              </div>
              <Button
                variant="gold"
                size="md"
                loading={submitting && pickedId === svc.id}
                onClick={() => takeTicket(svc)}
                leftIcon={<Icon name="ticket" size={18} />}
              >
                {t('flow.take_ticket')}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
