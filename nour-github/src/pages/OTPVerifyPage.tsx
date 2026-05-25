import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n';
import { callApi } from '@/lib/pb';
import { cn } from '@/lib/cn';

/**
 * Saisie OTP 6 chiffres branchée sur les hooks PocketBase custom
 * (cf. pocketbase/pb_hooks/main.pb.js) :
 *   - /api/nobty/otp-request → envoi du code (SMS Twilio/Vonage, sinon email)
 *   - /api/nobty/otp-verify  → vérification + users.verified = true
 */
export function OTPVerifyPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const phone = params.get('phone') || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => { refs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleChange = (i: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const arr = text.split('').concat(Array(6).fill('')).slice(0, 6);
    setDigits(arr);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleConfirm = async () => {
    const code = digits.join('');
    if (code.length < 6) {
      toast.push('error', 'Code incomplet');
      return;
    }
    setLoading(true);
    try {
      await callApi('otp-verify', { email, phone, code });
      toast.push('success', 'Vérification réussie, vous pouvez vous connecter.');
      navigate('/login', { replace: true });
    } catch (e: any) {
      toast.push('error', e?.message || 'Code invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email && !phone) {
      toast.push('error', 'Email ou téléphone manquant.');
      return;
    }
    try {
      await callApi('otp-request', { email, phone });
      setCooldown(60);
      toast.push('success', 'Code renvoyé.');
    } catch (e: any) {
      toast.push('error', e?.message || t('common.error'));
    }
  };

  return (
    <AuthLayout title={t('auth.otp_title')} subtitle={t('auth.otp_subtitle')}>
      <div className="space-y-5">
        <div className="flex justify-center gap-2" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              className={cn(
                'w-12 h-14 text-center font-ticket text-3xl rounded-2xl',
                'bg-white/80 dark:bg-night/60 border border-leather/15 dark:border-night-border',
                'focus:outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/20',
              )}
            />
          ))}
        </div>

        <Button onClick={handleConfirm} loading={loading} fullWidth size="lg">
          {t('common.confirm')}
        </Button>

        <div className="text-center text-sm">
          <button
            onClick={handleResend}
            disabled={cooldown > 0}
            className="text-emerald dark:text-gold font-semibold hover:underline disabled:opacity-50"
          >
            {t('auth.otp_resend')}{cooldown > 0 && ` (${cooldown}s)`}
          </button>
        </div>

        <div className="text-center text-sm">
          <Link to="/login" className="text-leather/70 dark:text-ivory/70 hover:underline">
            {t('common.back')}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
