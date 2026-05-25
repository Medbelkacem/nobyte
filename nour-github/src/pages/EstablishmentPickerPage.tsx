import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCollection, useRecord } from '@/hooks/useCollection';
import type { Establishment, Wilaya, InstitutionType } from '@/types/db';
import { useI18n, pickName } from '@/i18n';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { distanceKm, getUserPosition, googleMapsDirections } from '@/lib/geo';
import { isOpenNow, nextOpening } from '@/lib/hours';
import { cn } from '@/lib/cn';

export function EstablishmentPickerPage() {
  const { wilayaId = '', typeId = '' } = useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const { data: wilaya } = useRecord<Wilaya>('wilayas', wilayaId);
  const { data: instType } = useRecord<InstitutionType>('institution_types', typeId);
  const { items, loading } = useCollection<Establishment>('establishments', {
    filter: `wilaya = "${wilayaId}" && type = "${typeId}" && is_active = true`,
    sort: '+name',
  });

  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => { getUserPosition().then(setMe); }, []);

  const sorted = useMemo(() => {
    if (!me) return items;
    return items.slice().sort((a, b) =>
      distanceKm(me, { lat: a.lat, lng: a.lng }) - distanceKm(me, { lat: b.lat, lng: b.lng }),
    );
  }, [items, me]);

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<Icon name="back" />}>
          {t('common.back')}
        </Button>
        <div className="ms-2">
          <p className="text-xs uppercase tracking-wider text-leather/60 dark:text-ivory/60">
            {t('flow.pick_establishment')}
          </p>
          {wilaya && instType && (
            <p className="font-display text-xl">
              {pickName(instType, lang)} · {lang === 'ar' ? wilaya.name_ar : wilaya.name_fr}
            </p>
          )}
        </div>
      </header>

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {sorted.length === 0 && (
            <Card className="text-center text-leather/60 dark:text-ivory/60">
              Aucun établissement trouvé.
            </Card>
          )}
          {sorted.map((e) => {
            const open = isOpenNow(e.opening_hours);
            const next = !open ? nextOpening(e.opening_hours) : null;
            const dKm  = me ? distanceKm(me, { lat: e.lat, lng: e.lng }) : null;
            return (
              <Card
                key={e.id}
                interactive
                onClick={() => navigate(`/flow/establishments/${e.id}/services`)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    instType ? 'bg-emerald/10 text-emerald dark:bg-emerald/20 dark:text-gold' : 'bg-gold/20',
                  )}>
                    <Icon name={instType?.icon ?? 'building'} size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-lg leading-tight">{e.name}</p>
                    <p className="text-xs text-leather/60 dark:text-ivory/60">{e.address}</p>
                  </div>
                  <Icon name="chevron" className="text-leather/40 dark:text-ivory/40 mt-1" />
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={cn(
                    'text-xs font-semibold px-2 py-1 rounded-full',
                    open
                      ? 'bg-emerald/15 text-emerald dark:bg-emerald/30 dark:text-ivory'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
                  )}>
                    {open ? t('common.open') : t('common.closed')}
                  </span>
                  {next && (
                    <span className="text-xs text-leather/70 dark:text-ivory/70">
                      Réouvre : {next}
                    </span>
                  )}
                  {dKm !== null && (
                    <span className="text-xs text-leather/70 dark:text-ivory/70">
                      · {t('common.distance_km', { km: dKm.toFixed(0) })}
                    </span>
                  )}
                  <a
                    href={googleMapsDirections({ lat: e.lat, lng: e.lng }, e.name)}
                    target="_blank" rel="noreferrer"
                    onClick={(ev) => ev.stopPropagation()}
                    className="ms-auto inline-flex items-center gap-1 text-xs font-semibold text-tlemcen hover:underline"
                  >
                    <Icon name="route" size={14} /> {t('common.route')}
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
