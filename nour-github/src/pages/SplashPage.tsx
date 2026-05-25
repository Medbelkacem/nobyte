import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { useI18n } from '@/i18n';
import { ZellijStar } from '@/components/zellij/ZellijStar';

/**
 * Écran splash : la mosaïque se reconstitue tuile par tuile,
 * puis l'utilisateur est routé vers / (auth) ou /login.
 */
export function SplashPage() {
  const navigate = useNavigate();
  const { isAuthed, loading } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const ids = [
      setTimeout(() => setStep(1), 200),
      setTimeout(() => setStep(2), 600),
      setTimeout(() => setStep(3), 1100),
      setTimeout(() => setStep(4), 1700),
    ];
    return () => ids.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (loading || step < 4) return;
    navigate(isAuthed ? '/' : '/login', { replace: true });
  }, [loading, step, isAuthed, navigate]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-arch-emerald text-ivory overflow-hidden">
      <div className="relative w-72 h-72 flex items-center justify-center">
        {/* Couronne d'étoiles, tile-in décalé */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const r = 110;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const visible = step > 1;
          return (
            <div
              key={i}
              className="absolute transition-all duration-700"
              style={{
                transform: visible
                  ? `translate(${x}px, ${y}px) scale(1)`
                  : `translate(0,0) scale(0.4)`,
                opacity: visible ? 1 : 0,
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <ZellijStar size={36} variant="gold" />
            </div>
          );
        })}
        {/* Étoile centrale */}
        <div className={`transition-all duration-700 ${step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <ZellijStar size={140} variant="gold" />
        </div>
      </div>

      <h1 className={`mt-8 font-display text-5xl font-semibold transition-all duration-700 ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        {t('app.name')}
      </h1>
      <p className={`mt-2 font-arabic text-2xl text-gold transition-opacity duration-700 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`} dir="rtl">
        نُبتي
      </p>
      <p className={`mt-4 text-sm text-ivory/70 transition-opacity duration-700 ${step >= 4 ? 'opacity-100' : 'opacity-0'}`}>
        {t('app.tagline')}
      </p>
    </div>
  );
}
