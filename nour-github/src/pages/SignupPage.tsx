import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { pb, callApi } from '@/lib/pb';
import {
  isValidAlgerianPhone, isValidEmail, passwordStrength,
} from '@/lib/auth-helpers';
import { cn } from '@/lib/cn';

export function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();

  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+213');
  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = passwordStrength(pwd);
  const strengthColors = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald', 'bg-emerald-600'];
  const strengthLabel = t(`auth.${strength.label}`);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = 'Requis';
    if (!last.trim()) e.last = 'Requis';
    if (!isValidEmail(email)) e.email = t('auth.email_invalid');
    if (!isValidAlgerianPhone(phone.replace(/\s+/g, ''))) e.phone = t('auth.phone_invalid');
    if (pwd.length < 8) e.pwd = t('auth.pwd_short');
    if (pwd !== pwd2) e.pwd2 = t('auth.pwd_mismatch');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await pb.collection('users').create({
        email,
        password: pwd,
        passwordConfirm: pwd2,
        first_name: first.trim(),
        last_name: last.trim(),
        phone: phone.replace(/\s+/g, ''),
        role: 'citizen',
        lang: 'fr',
        theme: 'auto',
      });
      // Demande l'OTP custom 6 chiffres (SMS via Twilio/Vonage, sinon email).
      try {
        await callApi('otp-request', { email, phone: phone.replace(/\s+/g, '') });
      } catch { /* tolérant : l'écran OTP propose un renvoi */ }
      toast.push('success', 'Compte créé. Saisissez le code reçu.');
      navigate(`/verify?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone.replace(/\s+/g, ''))}`);
    } catch (err: any) {
      const msg = err?.data?.data
        ? Object.values<any>(err.data.data).map((d) => d?.message).filter(Boolean).join(' · ')
        : (err?.message || t('common.error'));
      toast.push('error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.signup')} subtitle={t('app.tagline')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('auth.first_name')} value={first} onChange={(e) => setFirst(e.target.value)} error={errors.first} autoComplete="given-name" />
          <Input label={t('auth.last_name')}  value={last}  onChange={(e) => setLast(e.target.value)}  error={errors.last}  autoComplete="family-name" />
        </div>
        <Input label={t('auth.email')}
               type="email"
               value={email}
               onChange={(e) => setEmail(e.target.value.trim())}
               leftIcon={<Icon name="mail" size={18} />}
               error={errors.email}
               autoComplete="email" />
        <Input label={t('auth.phone')}
               type="tel"
               value={phone}
               onChange={(e) => setPhone(e.target.value)}
               leftIcon={<Icon name="phone" size={18} />}
               hint={t('auth.phone_help')}
               error={errors.phone}
               autoComplete="tel" />
        <div>
          <Input label={t('auth.password')}
                 type="password"
                 value={pwd}
                 onChange={(e) => setPwd(e.target.value)}
                 error={errors.pwd}
                 autoComplete="new-password" />
          {/* Strength bar */}
          {pwd && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className={cn(
                    'h-1.5 flex-1 rounded',
                    i < strength.score + 1 ? strengthColors[strength.score] : 'bg-leather/10 dark:bg-night-border',
                  )} />
                ))}
              </div>
              <span className="text-xs font-semibold text-leather/70 dark:text-ivory/70">{strengthLabel}</span>
            </div>
          )}
        </div>
        <Input label={t('auth.password_confirm')}
               type="password"
               value={pwd2}
               onChange={(e) => setPwd2(e.target.value)}
               error={errors.pwd2}
               autoComplete="new-password" />

        <Button type="submit" loading={loading} fullWidth size="lg">
          {t('auth.submit')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm">
        {t('auth.have_account')}{' '}
        <Link to="/login" className="text-emerald dark:text-gold font-semibold underline-offset-2 hover:underline">
          {t('auth.login')}
        </Link>
      </p>
    </AuthLayout>
  );
}
