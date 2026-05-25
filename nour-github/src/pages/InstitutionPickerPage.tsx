import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCollection, useRecord } from '@/hooks/useCollection';
import type { InstitutionFamily, InstitutionType, Wilaya } from '@/types/db';
import { useI18n, pickName } from '@/i18n';
import { Spinner } from '@/components/ui/Spinner';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';

const FAMILIES: InstitutionFamily[] = [
  'finance', 'sante', 'justice', 'admin_civile',
  'social_emploi', 'reseaux', 'fiscalite_commerce',
];

export function InstitutionPickerPage() {
  const { wilayaId = '' } = useParams();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const { data: wilaya } = useRecord<Wilaya>('wilayas', wilayaId);
  const { items, loading } = useCollection<InstitutionType>('institution_types', {
    sort: '+sort_order',
  });

  const byFamily = useMemo(() => {
    const map = new Map<InstitutionFamily, InstitutionType[]>();
    for (const it of items) {
      const list = map.get(it.family) ?? [];
      list.push(it);
      map.set(it.family, list);
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-6 pb-4">
      <header className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<Icon name="back" />} aria-label="back">
          {t('common.back')}
        </Button>
        {wilaya && (
          <div className="ms-2">
            <p className="text-xs uppercase tracking-wider text-leather/60 dark:text-ivory/60">
              {t('flow.pick_institution')}
            </p>
            <p className="font-display text-xl">{lang === 'ar' ? wilaya.name_ar : wilaya.name_fr}</p>
          </div>
        )}
      </header>

      {loading ? <Spinner /> : (
        <div className="space-y-6">
          {FAMILIES.map((fam) => {
            const list = byFamily.get(fam) ?? [];
            if (!list.length) return null;
            return (
              <section key={fam}>
                <h2 className="font-display text-lg mb-3 text-emerald dark:text-gold">
                  {t(`flow.family.${fam}`)}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {list.map((it) => (
                    <Link key={it.id} to={`/flow/wilaya/${wilayaId}/institutions/${it.id}/establishments`}>
                      <Card interactive className="h-full">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald/10 dark:bg-emerald/20 text-emerald dark:text-gold flex items-center justify-center">
                            <Icon name={it.icon} size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-display text-base leading-tight">
                              {pickName(it, lang)}
                            </p>
                            {lang !== 'ar' && (
                              <p className="text-xs font-arabic text-leather/60 dark:text-ivory/60 mt-0.5" dir="rtl">
                                {it.name_ar}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
