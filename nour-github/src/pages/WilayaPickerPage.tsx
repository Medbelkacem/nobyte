import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCollection } from '@/hooks/useCollection';
import type { Wilaya } from '@/types/db';
import { useI18n } from '@/i18n';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { distanceKm, getUserPosition } from '@/lib/geo';
import { cn } from '@/lib/cn';

export function WilayaPickerPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { items, loading } = useCollection<Wilaya>('wilayas', {
    sort: '+code',
    perPage: 200,
  });
  const [query, setQuery] = useState('');
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const handleGeolocate = async () => {
    setGeoLoading(true);
    const p = await getUserPosition();
    setMe(p);
    setGeoLoading(false);
  };

  // Demande la géolocalisation à l'arrivée (silencieux)
  useEffect(() => { handleGeolocate(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    let list = items.slice();
    if (q) {
      list = list.filter((w) =>
        w.name_fr.toLocaleLowerCase().includes(q) ||
        w.name_ar.includes(q) ||
        w.code.includes(q),
      );
    }
    if (me) {
      list = list
        .map((w) => ({ w, d: distanceKm(me, { lat: w.lat, lng: w.lng }) }))
        .sort((a, b) => a.d - b.d)
        .map((x) => x.w);
    }
    return list;
  }, [items, query, me]);

  const nearest = me && filtered[0];

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl">{t('flow.pick_wilaya')}</h1>
        <Button variant="ghost" size="sm" onClick={handleGeolocate} loading={geoLoading}
                leftIcon={<Icon name="locate" size={16} />}>
          {t('common.geolocate_me')}
        </Button>
      </header>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('flow.wilaya_search')}
        leftIcon={<Icon name="search" size={18} />}
      />

      {nearest && (
        <Card arch interactive
              onClick={() => navigate(`/flow/wilaya/${nearest.id}/institutions`)}
              className="bg-emerald/5 dark:bg-emerald/10 border-emerald/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald text-ivory flex items-center justify-center font-ticket text-xl">
              {nearest.code}
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald dark:text-gold">Plus proche</p>
              <p className="font-display text-lg">{lang === 'ar' ? nearest.name_ar : nearest.name_fr}</p>
            </div>
            <Icon name="chevron" className="ms-auto text-emerald dark:text-gold" />
          </div>
        </Card>
      )}

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((w) => (
            <Link key={w.id} to={`/flow/wilaya/${w.id}/institutions`}>
              <Card interactive className="h-full">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center font-ticket text-lg',
                    w.is_new ? 'bg-gold text-leather' : 'bg-tlemcen/10 text-tlemcen dark:bg-tlemcen/30 dark:text-ivory',
                  )}>
                    {w.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base leading-tight">
                      {lang === 'ar' ? w.name_ar : w.name_fr}
                    </p>
                    {lang !== 'ar' && (
                      <p className="text-xs font-arabic text-leather/60 dark:text-ivory/60 mt-0.5" dir="rtl">
                        {w.name_ar}
                      </p>
                    )}
                    {me && (
                      <p className="text-xs text-leather/50 dark:text-ivory/50 mt-1">
                        {t('common.distance_km', { km: distanceKm(me, { lat: w.lat, lng: w.lng }).toFixed(0) })}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
