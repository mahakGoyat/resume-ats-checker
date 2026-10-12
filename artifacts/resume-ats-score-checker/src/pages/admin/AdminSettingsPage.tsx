import { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Globe, KeyRound, LoaderCircle, Palette, Rocket, ShieldCheck } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { SuccessBanner } from '@/components/admin/SuccessBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSavedNotice, notifySaved } from '@/lib/admin-store';
import { supabase } from '@/lib/supabase';

const inputClass =
  'w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)] px-4 py-3 text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/.7)] focus:border-[hsl(var(--primary)/.5)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/.2)]';

const labelClass = 'font-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--muted-foreground))]';

export function AdminSettingsPage() {
  const [siteName, setSiteName] = useState('ScoreMyResume');
  const [tagline, setTagline] = useState('ATS resume checker');
  const [accent, setAccent] = useState('hsl(13 84% 53%)');
  const [showSaved, setShowSaved] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [visible, setVisible] = useState({ current: false, next: false, confirm: false });

  const clearPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setVisible({ current: false, next: false, confirm: false });
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPwdError(null);
    setPwdSuccess(false);

    if (!currentPassword) {
      setPwdError('Current password is required.');
      return;
    }
    if (!newPassword) {
      setPwdError('New password is required.');
      return;
    }
    if (newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirm password do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPwdError('New password must be different from the current password.');
      return;
    }

    setPwdLoading(true);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user?.email) {
      setPwdLoading(false);
      setPwdError(userError?.message ?? 'Unable to verify the signed-in admin account.');
      return;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: currentPassword,
    });
    if (verifyError) {
      setPwdLoading(false);
      setPwdError('Current password is incorrect');
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPwdLoading(false);
    if (updateError) {
      setPwdError(updateError.message);
      return;
    }
    clearPasswordFields();
    setPwdSuccess(true);
  };

  const passwordField = (
    id: 'current' | 'next' | 'confirm',
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    autoComplete: string,
  ) => (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <div className="relative mt-2">
        <Input
          id={id}
          required
          type={visible[id] ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="rounded-xl bg-[hsl(var(--secondary)/.45)] pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => ({ ...current, [id]: !current[id] }))}
          className="focus-ring absolute inset-y-0 right-0 grid w-11 place-items-center text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
          aria-label={visible[id] ? `Hide ${label}` : `Show ${label}`}
          tabIndex={-1}
        >
          {visible[id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </label>
  );

  return (
    <AdminLayout
      title="Settings"
      subtitle="General preferences for the admin panel and journal"
      onSave={() => {
        setShowSaved(true);
        notifySaved();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }}
    >
      <SuccessBanner show={showSaved} onDismiss={() => setShowSaved(false)} />

      <div className="mt-6 space-y-5">
        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><Globe className="size-3.5" /> site identity</div>
          <div className="mt-5 grid gap-5">
            <label className="block">
              <span className={labelClass}>site name</span>
              <input type="text" value={siteName} onChange={(event) => setSiteName(event.target.value)} className={`mt-2 ${inputClass}`} />
            </label>
            <label className="block">
              <span className={labelClass}>tagline</span>
              <input type="text" value={tagline} onChange={(event) => setTagline(event.target.value)} className={`mt-2 ${inputClass}`} />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><Palette className="size-3.5" /> appearance</div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>accent color</span>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="color"
                  value={accentToHex(accent)}
                  onChange={(event) => setAccent(hexToHsl(event.target.value))}
                  className="size-10 shrink-0 cursor-pointer rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.45)]"
                />
                <input type="text" value={accent} onChange={(event) => setAccent(event.target.value)} className={inputClass} />
              </div>
            </label>
            <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.3)] px-4 py-3">
              <div className={`h-2 w-24 rounded-full`} style={{ background: accent }} />
              <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Orange-red accent used for buttons, links and active states.</div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--primary)/.28)] bg-[linear-gradient(150deg,hsl(var(--card)),hsl(var(--secondary)/.5))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><ShieldCheck className="size-3.5" /> admin</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-[hsl(var(--foreground))]">Signed in as Admin</div>
              <p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Authentication is handled by Supabase. Sign out from the sidebar to lock the panel.</p>
            </div>
            <span className="rounded-full bg-[hsl(var(--primary)/.12)] px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]"><Rocket className="mr-1 inline size-3" /> Ready</span>
          </div>
        </section>

        <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_16px_45px_hsl(var(--primary)/.05)]">
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.2em] text-[hsl(var(--primary))]"><KeyRound className="size-3.5" /> change password</div>
          <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Update the password used to sign in to the admin panel. You'll stay signed in on this device.</p>
          <form onSubmit={handleChangePassword} className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {passwordField('current', 'current password', currentPassword, setCurrentPassword, 'Your current password', 'current-password')}
            </div>
            {passwordField('next', 'new password', newPassword, setNewPassword, 'At least 8 characters', 'new-password')}
            {passwordField('confirm', 'confirm new password', confirmPassword, setConfirmPassword, 'Re-enter the new password', 'new-password')}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pwdLoading} className="focus-ring w-full gap-2 rounded-xl bg-[hsl(var(--primary))] px-4 py-3 font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:opacity-60 sm:w-auto">
                {pwdLoading ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />} {pwdLoading ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </form>
          {pwdError && <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[hsl(var(--destructive)/.35)] bg-[hsl(var(--destructive)/.08)] px-4 py-3 text-sm leading-6 text-[hsl(var(--foreground))]"><AlertCircle className="mt-0.5 size-4 shrink-0 text-[hsl(var(--destructive))]" />{pwdError}</div>}
          {pwdSuccess && <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-[hsl(var(--primary)/.35)] bg-[hsl(var(--primary)/.1)] px-4 py-3 text-sm text-[hsl(var(--foreground))]" role="status"><CheckCircle2 className="mt-0.5 size-4.5 shrink-0 text-[hsl(var(--primary))]" /><div className="flex-1 text-sm leading-6"><span className="font-bold text-[hsl(var(--primary))]">Password updated.</span> <span className="text-[hsl(var(--muted-foreground))]">Use the new password next time.</span></div></div>}
        </section>
      </div>
    </AdminLayout>
  );
}

function accentToHex(cssValue: string): string {
  const match = cssValue.match(/hsl\(\s*(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) return '#ff4b2b';
  return hslToHex(Number(match[1]), Number(match[2]), Number(match[3]));
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function hexToHsl(hex: string): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.substring(0, 2), 16) / 255;
  const g = parseInt(value.substring(2, 4), 16) / 255;
  const b = parseInt(value.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}