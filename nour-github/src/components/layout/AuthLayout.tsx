import { type ReactNode } from 'react';
import { ZellijStar } from '@/components/zellij/ZellijStar';
import { MoorishArch } from '@/components/zellij/MoorishArch';
import { useI18n } from '@/i18n';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useI18n();
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 py-8 safe-top safe-bottom">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <ZellijStar size={64} variant="duotone" />
          <h1 className="mt-3 font-display text-3xl font-semibold text-emerald dark:text-gold">{t('app.name')}</h1>
          <p className="text-sm text-leather/70 dark:text-ivory/70">{t('app.tagline')}</p>
        </div>
        <div className="nobty-card nobty-card-arch pt-8 animate-fade-up">
          <MoorishArch className="mb-2" />
          <h2 className="font-display text-2xl font-semibold mb-1">{title}</h2>
          {subtitle && <p className="text-sm text-leather/70 dark:text-ivory/70 mb-5">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="mt-4 text-center text-sm">{footer}</div>}
      </div>
    </div>
  );
}
