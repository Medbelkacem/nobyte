import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { pb } from '@/lib/pb';
import { isValidEmail } from '@/lib/auth-helpers';

export function ResetPasswordPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.push('error', t('auth.email_invalid'));
      return;
    }
    setLoading(true);
    try {
      await pb.collection('users').requestPasswordReset(email);
      setSent(true);
      toast.push('success', 'Email de réinitialisation envoyé.');
    } catch (err: any) {
      toast.push('error', err?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.forgot')!}
      subtitle="Nous vous enverrons un lien pour réinitialiser votre mot de passe."
      footer={<Link to="/login" className="text-emerald dark:text-gold hover:underline">{t('common.back')}</Link>}
    >
      {sent ? (
        <div className="text-center py-6">
          <Icon name="check" className="text-emerald" size={40} />
          <p className="mt-3 text-leather/80 dark:text-ivory/80">
            Si un compte existe pour <strong>{email}</strong>, vous recevrez un email sous peu.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label={t('auth.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            leftIcon={<Icon name="mail" size={18} />}
            autoComplete="email"
          />
          <Button type="submit" loading={loading} fullWidth size="lg">
            {t('auth.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
