import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { useI18n } from '@/i18n';
import { pb } from '@/lib/pb';
import { isWebAuthnSupported, registerPasskey } from '@/lib/auth-helpers';
import { isPushSupported, subscribePush, unsubscribePush, currentSubscription } from '@/lib/push';
import type { Lang, Theme } from '@/types/db';
import { cn } from '@/lib/cn';

const LANGS: Array<{ id: Lang; label: string }> = [
  { id: 'fr', label: 'Français' },
  { id: 'ar', label: 'العربية' },
  { id: 'en', label: 'English' },
];

const THEMES: Array<{ id: Theme; icon: string }> = [
  { id: 'light', icon: 'sun' },
  { id: 'dark',  icon: 'moon' },
  { id: 'auto',  icon: 'globe' },
];

export function ProfilePage() {
  const { user, refresh, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();

  const [first, setFirst] = useState(user?.first_name ?? '');
  const [last, setLast]   = useState(user?.last_name  ?? '');
  const [phone, setPhone] = useState(user?.phone      ?? '');
  const [saving, setSaving] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    currentSubscription().then((s) => setPushOn(!!s)).catch(() => {});
  }, []);

  if (!user) return <Spinner />;

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) { await unsubscribePush(); setPushOn(false); toast.push('success', 'Notifications désactivées.'); }
      else        { await subscribePush();   setPushOn(true);  toast.push('success', 'Notifications activées.'); }
    } catch (e: any) {
      toast.push('error', e?.message || t('common.error'));
    } finally { setPushBusy(false); }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await pb.collection('users').update(user.id, {
        first_name: first.trim(),
        last_name: last.trim(),
        phone: phone.replace(/\s+/g, ''),
        lang,
        theme,
      });
      await refresh();
      toast.push('success', 'Profil enregistré.');
    } catch (e: any) {
      toast.push('error', e?.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const enableBiometric = async () => {
    try {
      await registerPasskey(`${first} ${last}`.trim() || user.id);
      toast.push('success', 'Biométrie activée.');
    } catch (e: any) {
      toast.push('error', e?.message || t('common.error'));
    }
  };

  return (
    <div className="space-y-5 pb-4">
      <h1 className="font-display text-2xl">{t('nav.profile')}</h1>

      <Card>
        <h2 className="font-display text-lg mb-3">Informations</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('auth.first_name')} value={first} onChange={(e) => setFirst(e.target.value)} />
          <Input label={t('auth.last_name')}  value={last}  onChange={(e) => setLast(e.target.value)} />
        </div>
        <Input label={t('auth.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-3" />
        <Button onClick={onSave} loading={saving} className="mt-4" fullWidth>{t('common.save')}</Button>
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-3">{t('nav.language')}</h2>
        <div className="flex gap-2">
          {LANGS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLang(l.id)}
              className={cn(
                'flex-1 py-2 rounded-2xl border font-semibold transition',
                lang === l.id
                  ? 'bg-emerald text-ivory border-emerald'
                  : 'bg-transparent border-leather/15 dark:border-night-border text-leather dark:text-ivory hover:bg-emerald/5 dark:hover:bg-gold/10',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg mb-3">{t('nav.theme')}</h2>
        <div className="flex gap-2">
          {THEMES.map((th) => (
            <button
              key={th.id}
              onClick={() => setTheme(th.id)}
              className={cn(
                'flex-1 py-2 rounded-2xl border font-semibold transition flex items-center justify-center gap-2',
                theme === th.id
                  ? 'bg-emerald text-ivory border-emerald'
                  : 'bg-transparent border-leather/15 dark:border-night-border text-leather dark:text-ivory',
              )}
            >
              <Icon name={th.icon} size={18} /> {t(`theme.${th.id}`)}
            </button>
          ))}
        </div>
      </Card>

      {isWebAuthnSupported() && (
        <Card>
          <h2 className="font-display text-lg mb-2">Sécurité</h2>
          <p className="text-sm text-leather/70 dark:text-ivory/70 mb-3">
            Activez la connexion biométrique (Touch ID / Face ID / Windows Hello).
          </p>
          <Button variant="ghost" onClick={enableBiometric} leftIcon={<Icon name="fingerprint" size={18} />}>
            {t('auth.biometric')}
          </Button>
        </Card>
      )}

      {isPushSupported() && (
        <Card>
          <h2 className="font-display text-lg mb-2">Notifications push</h2>
          <p className="text-sm text-leather/70 dark:text-ivory/70 mb-3">
            Recevez une alerte sur votre appareil quand votre tour approche, même si l'app est fermée.
          </p>
          <Button variant={pushOn ? 'ghost' : 'gold'} onClick={togglePush} loading={pushBusy}
                  leftIcon={<Icon name="bell" size={18} />}>
            {pushOn ? 'Désactiver les notifications' : 'Activer les notifications'}
          </Button>
        </Card>
      )}

      <Button variant="ghost" fullWidth onClick={() => { signOut(); navigate('/login'); }}>
        {t('nav.logout')}
      </Button>
    </div>
  );
}
