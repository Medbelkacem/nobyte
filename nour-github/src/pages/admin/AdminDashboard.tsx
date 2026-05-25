import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { callApi } from '@/lib/pb';
import { cn } from '@/lib/cn';

interface Counts {
  tickets: number;
  waiting: number;
  called: number;
  served: number;
  cancelled: number;
  missed: number;
  avg_wait_min: number | null;
}

interface WilayaRow extends Counts { wilaya: string; code: string; name_fr: string }
interface TypeRow   extends Counts { type:   string; key: string;  name_fr: string; family: string }
interface EstRow    extends Counts { establishment: string; name: string; wilaya_code: string; type_key: string }

interface StatsResponse {
  generated_at: string;
  scope: { from: string; to: string; top: number };
  totals: Counts;
  by_wilaya: WilayaRow[];
  by_type:   TypeRow[];
  by_establishment: EstRow[];
}

const PRESETS = [
  { id: 'today',  label: "Aujourd'hui" },
  { id: '7d',     label: '7 jours' },
  { id: '30d',    label: '30 jours' },
] as const;
type Preset = typeof PRESETS[number]['id'];

function rangeFor(preset: Preset): { from: string; to: string } {
  const now = new Date();
  const to  = now.toISOString();
  if (preset === 'today') {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return { from: d.toISOString(), to };
  }
  const days = preset === '7d' ? 7 : 30;
  return { from: new Date(now.getTime() - days * 86400_000).toISOString(), to };
}

export function AdminDashboard() {
  const toast = useToast();
  const [preset, setPreset]   = useState<Preset>('today');
  const [data, setData]       = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async (p: Preset) => {
    setLoading(true);
    try {
      const { from, to } = rangeFor(p);
      const qs = new URLSearchParams({ from, to, top: '10' }).toString();
      const res = await callApi<StatsResponse>(`admin/stats?${qs}`, undefined, 'GET');
      setData(res);
    } catch (e: any) {
      toast.push('error', e?.message || 'Échec du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(preset); /* eslint-disable-next-line */ }, [preset]);

  return (
    <div className="space-y-6 pb-4">
      <header className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Tableau de bord admin</h1>
          {data && (
            <p className="text-xs text-leather/60 dark:text-ivory/60">
              Mis à jour {new Date(data.generated_at).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="ms-auto flex items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full font-semibold transition border',
                preset === p.id
                  ? 'bg-emerald text-ivory border-emerald'
                  : 'bg-transparent border-leather/15 dark:border-night-border text-leather/70 dark:text-ivory/70',
              )}
            >
              {p.label}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => fetchStats(preset)} leftIcon={<Icon name="spinner" size={16} />}>
            Actualiser
          </Button>
        </div>
      </header>

      {loading && !data ? <Spinner /> : data && (
        <>
          <Totals counts={data.totals} />
          <Section title="Par wilaya" rows={data.by_wilaya.map((w) => ({
            id: w.wilaya, label: `${w.code} · ${w.name_fr}`, counts: w,
          }))} />
          <Section title="Par institution" rows={data.by_type.map((t) => ({
            id: t.type, label: `${t.name_fr}`, sub: t.family, counts: t,
          }))} />
          <Section
            title={`Top ${data.scope.top} établissements`}
            rows={data.by_establishment.map((e) => ({
              id: e.establishment,
              label: e.name,
              sub: `${e.wilaya_code} · ${e.type_key}`,
              counts: e,
            }))}
          />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------

function Totals({ counts }: { counts: Counts }) {
  const items: Array<{ k: keyof Counts; label: string; color: string }> = [
    { k: 'tickets',   label: 'Tickets',   color: 'text-leather dark:text-ivory' },
    { k: 'waiting',   label: 'En attente', color: 'text-gold-700 dark:text-gold' },
    { k: 'called',    label: 'Appelés',   color: 'text-emerald dark:text-emerald-300' },
    { k: 'served',    label: 'Servis',    color: 'text-emerald dark:text-emerald-300' },
    { k: 'cancelled', label: 'Annulés',   color: 'text-red-500' },
    { k: 'missed',    label: 'Manqués',   color: 'text-red-500' },
  ];
  return (
    <section>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {items.map((it) => (
          <Card key={it.k} className="text-center py-4">
            <p className={cn('font-ticket text-2xl', it.color)}>{Number(counts[it.k] || 0)}</p>
            <p className="text-[11px] uppercase tracking-wider text-leather/60 dark:text-ivory/60">{it.label}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-3 flex items-center justify-between">
        <span className="text-sm text-leather/70 dark:text-ivory/70">Temps d'attente moyen (servis)</span>
        <span className="font-ticket text-xl text-emerald dark:text-gold">
          {counts.avg_wait_min == null ? '—' : `${counts.avg_wait_min.toFixed(1)} min`}
        </span>
      </Card>
    </section>
  );
}

function Section({ title, rows }: {
  title: string;
  rows: Array<{ id: string; label: string; sub?: string; counts: Counts }>;
}) {
  const max = useMemo(() => rows.reduce((m, r) => Math.max(m, r.counts.tickets), 0) || 1, [rows]);
  if (rows.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm uppercase tracking-widest font-semibold text-emerald dark:text-gold">{title}</h2>
        <Card className="text-sm text-leather/60 dark:text-ivory/60">Aucune donnée sur cette période.</Card>
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <h2 className="text-sm uppercase tracking-widest font-semibold text-emerald dark:text-gold">{title}</h2>
      <Card className="!p-0 overflow-hidden">
        <div className="divide-y divide-leather/10 dark:divide-night-border">
          {rows.map((r) => {
            const c = r.counts;
            const pct = (c.tickets / max) * 100;
            return (
              <div key={r.id} className="px-3 py-2.5 grid grid-cols-12 gap-2 items-center text-sm">
                <div className="col-span-5 min-w-0">
                  <p className="font-semibold truncate">{r.label}</p>
                  {r.sub && <p className="text-xs text-leather/60 dark:text-ivory/60 truncate">{r.sub}</p>}
                </div>
                <div className="col-span-4">
                  <div className="h-1.5 rounded-full bg-leather/10 dark:bg-night-border overflow-hidden">
                    <div className="h-full bg-emerald" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="col-span-2 text-right font-ticket text-base">{c.tickets}</div>
                <div className="col-span-1 text-right text-xs text-leather/60 dark:text-ivory/60">
                  {c.avg_wait_min == null ? '—' : `${c.avg_wait_min.toFixed(0)}m`}
                </div>
                <div className="col-span-12 flex gap-3 text-[11px] text-leather/60 dark:text-ivory/60 -mt-0.5">
                  <span>servis {c.served}</span>
                  <span>en attente {c.waiting}</span>
                  <span>annulés {c.cancelled}</span>
                  <span>manqués {c.missed}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
