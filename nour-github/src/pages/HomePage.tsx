import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ZellijStar } from '@/components/zellij/ZellijStar';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/i18n';
import { Icon } from '@/components/ui/Icon';

export function HomePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 pb-4">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-zellij p-6 bg-arch-emerald text-ivory shadow-ticket">
        <div className="absolute -right-6 -top-6 opacity-25">
          <ZellijStar size={200} variant="gold" />
        </div>
        <div className="relative">
          <p className="text-xs uppercase tracking-widest text-gold/90">السلام عليكم</p>
          <h1 className="font-display text-3xl md:text-4xl mt-1">
            {user?.first_name ? `Bonjour, ${user.first_name}` : t('app.tagline')}
          </h1>
          <p className="mt-2 text-ivory/80 text-sm max-w-md">
            Prenez votre ticket en quelques secondes, suivez votre file en temps réel.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="gold" size="lg" onClick={() => navigate('/flow/wilaya')} leftIcon={<Icon name="ticket" />}>
              {t('flow.take_ticket')}
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate('/me/tickets')} className="text-ivory border-ivory/30 hover:bg-ivory/10">
              {t('nav.my_tickets')}
            </Button>
          </div>
        </div>
      </section>

      {/* Liens rapides */}
      <section className="grid grid-cols-2 gap-3">
        <Link to="/flow/wilaya">
          <Card interactive>
            <Icon name="locate" className="text-emerald dark:text-gold" size={28} />
            <p className="mt-2 font-display text-lg">Près de moi</p>
            <p className="text-sm text-leather/60 dark:text-ivory/60">Trouver le guichet le plus proche.</p>
          </Card>
        </Link>
        <Link to="/me/tickets">
          <Card interactive>
            <Icon name="bell" className="text-emerald dark:text-gold" size={28} />
            <p className="mt-2 font-display text-lg">{t('nav.my_tickets')}</p>
            <p className="text-sm text-leather/60 dark:text-ivory/60">Vos tickets actifs et passés.</p>
          </Card>
        </Link>
      </section>

      {/* Astuces */}
      <Card arch>
        <p className="text-xs uppercase tracking-widest text-gold">Astuce</p>
        <h3 className="font-display text-xl mt-1">Demandez à Nour</h3>
        <p className="text-sm text-leather/70 dark:text-ivory/70 mt-1">
          L'assistant Nour vous guide vers le bon service en français, en arabe ou en anglais.
          Activez-le via la pastille en bas à droite.
        </p>
      </Card>
    </div>
  );
}
