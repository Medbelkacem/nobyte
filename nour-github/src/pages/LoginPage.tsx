import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { useAuth } from '@/providers/AuthProvider';
import { pb, setRememberMe, getRememberMe } from '@/lib/pb';
import { detectIdentifier, isWebAuthnSupported, loginWithPasskey } from '@/lib/auth-helpers';

export function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { refresh } = useAuth();

  const [id, setId] = useState('');         // email ou téléphone
  const [pwd, setPwd] = useState('');
  const [remember, setRemember] = useState(getRememberMe());
  const [loading, setLoading] = useState(false);
  const canBio = isWebAuthnSupported();

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    try {
      const kind = detectIdentifier(id.trim());
      if (kind === 'unknown') {
        toast.push('error', t('auth.email_invalid'));
        return;
      }
      // PocketBase : authWithPassword(identity, password) supporte n'importe quel champ
      // listé dans "Auth options". On stocke email + phone côté users → les deux marchent.
      await pb.collection('users').authWithPassword(id.trim(), pwd);
      setRememberMe(remember);
      await refresh();
      navigate('/', { replace: true });
    } catch (err: any) {
      toast.push('error', err?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const onBiometric = async () => {
    try {
      const kind = detectIdentifier(id.trim());
      const ok = await loginWithPasskey(kind === 'email' ? id.trim() : undefined);
      if (!ok) {
        toast.push('error', t('common.error'));
        return;
      }
      setRememberMe(remember);
      await refresh();
      navigate('/', { replace: true });
    } catch (e: any) {
      toast.push('error', e?.message || t('common.error'));
    }
  };

  return (
    <AuthLayout title={t('auth.login')} subtitle={t('app.tagline')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label={`${t('auth.email')} / ${t('auth.phone')}`}
          value={id}
          onChange={(e) => setId(e.target.value)}
          leftIcon={<Icon name="user" size={18} />}
          autoComplete="username"
          placeholder="vous@exemple.dz · +213 6 12 34 56 78"
        />
        <Input
          label={t('auth.password')}
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-emerald w-4 h-4"
            />
            {t('auth.remember_me')}
          </label>
          <Link to="/reset" className="text-sm text-emerald dark:text-gold hover:underline">
            {t('auth.forgot')}
          </Link>
        </div>

        <Button type="submit" loading={loading} fullWidth size="lg">
          {t('auth.submit')}
        </Button>
      </form>

      {canBio && (
        <>
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-leather/15 dark:bg-night-border" />
            <span className="text-xs uppercase tracking-wider text-leather/60 dark:text-ivory/60">
              {t('auth.or')}
            </span>
            <span className="h-px flex-1 bg-leather/15 dark:bg-night-border" />
          </div>
          <Button variant="ghost" fullWidth onClick={onBiometric} leftIcon={<Icon name="fingerprint" size={18} />}>
            {t('auth.biometric')}
          </Button>
        </>
      )}

      <p className="mt-6 text-center text-sm">
        {t('auth.no_account')}{' '}
        <Link to="/signup" className="text-emerald dark:text-gold font-semibold underline-offset-2 hover:underline">
          {t('auth.signup')}
        </Link>
      </p>
    </AuthLayout>
  );
}
