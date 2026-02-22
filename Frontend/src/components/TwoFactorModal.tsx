import { useState, useEffect } from 'react';
import { Shield, X, KeyRound } from 'lucide-react';
import { api } from '../api/axios';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  mode: 'setup' | 'disable';
  twoFactorEnabled?: boolean;
}

export function TwoFactorModal({ isOpen, onClose, onSuccess, mode, twoFactorEnabled }: TwoFactorModalProps) {
  const [step, setStep] = useState<'start' | 'verify' | 'disable'>('start');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStep('start');
      setQrDataUrl(null);
      setSecret(null);
      setCode('');
      setDisablePassword('');
      setError(null);
    }
  }, [isOpen]);

  const handleStartSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ qrDataUrl?: string; secret?: string }>('/api/auth/2fa/setup');
      setQrDataUrl(data.qrDataUrl || null);
      setSecret(data.secret || null);
      setStep('verify');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to setup 2FA';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/auth/2fa/verify', { token: code });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Invalid code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/auth/2fa/disable', { password: disablePassword });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to disable 2FA';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-300 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            Two-Factor Authentication
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'setup' && !twoFactorEnabled && (
            <>
              {step === 'start' && (
                <div className="space-y-4">
                  <p className="text-slate-700">
                    Add an extra layer of security by requiring a verification code from your phone when signing in.
                  </p>
                  <p className="text-sm text-slate-600">
                    You&apos;ll need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.
                  </p>
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
                  )}
                  <button
                    type="button"
                    onClick={handleStartSetup}
                    disabled={loading}
                    className="w-full py-3 rounded-lg bg-teal-600 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    {loading ? 'Setting up...' : 'Continue'}
                  </button>
                </div>
              )}

              {step === 'verify' && (
                <form onSubmit={handleVerify} className="space-y-4">
                  <p className="text-sm text-slate-700">
                    Scan the QR code with your authenticator app, or enter the secret manually:
                  </p>
                  {qrDataUrl && (
                    <div className="flex justify-center">
                      <img src={qrDataUrl} alt="2FA QR Code" className="w-48 h-48 border border-slate-200 rounded-lg" />
                    </div>
                  )}
                  {secret && (
                    <p className="text-xs text-slate-600 font-mono bg-slate-100 p-2 rounded break-all">{secret}</p>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-2">Verification code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-teal-500 text-center text-lg tracking-widest font-mono"
                      required
                    />
                  </div>
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('start')}
                      className="flex-1 py-3 rounded-lg border-2 border-slate-300 font-semibold text-slate-700"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || code.length !== 6}
                      className="flex-1 py-3 rounded-lg bg-teal-600 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                    >
                      {loading ? 'Verifying...' : 'Enable 2FA'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {mode === 'disable' && twoFactorEnabled && (
            <form onSubmit={handleDisable} className="space-y-4">
              <p className="text-slate-700">
                Enter your password to disable two-factor authentication.
              </p>
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-lg border-2 border-slate-300 focus:border-teal-500"
                    placeholder="Your password"
                    required
                  />
                </div>
              </div>
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">{error}</div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-lg border-2 border-slate-300 font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-lg bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
