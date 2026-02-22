import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogIn, FileSignature, Eye, EyeOff, Mail, Lock, CheckCircle2, AlertCircle, Loader2, Shield } from 'lucide-react';
import { api } from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import type { AuthResponse } from '../../types';
import { ROUTES } from '../../utils/constants';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const state = location.state as { from?: { pathname: string }; registered?: boolean } | null;
  const from = state?.from?.pathname ?? ROUTES.DASHBOARD;
  const justRegistered = state?.registered === true;
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [twoFAPending, setTwoFAPending] = useState<{ tempToken: string; email: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const emailValue = watch('email');

  async function onSubmit(data: FormData) {
    try {
      const { data: res } = await api.post<AuthResponse & { requires2FA?: boolean; tempToken?: string; email?: string }>('/api/auth/login', data);
      if (res.requires2FA && res.tempToken && res.email) {
        setTwoFAPending({ tempToken: res.tempToken, email: res.email });
        clearErrors('root');
        return;
      }
      setAuth(res.user!, res.accessToken!);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed';
      setError('root', { message });
    }
  }

  async function on2FASubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!twoFAPending) return;
    setTwoFALoading(true);
    clearErrors('root');
    try {
      const { data } = await api.post<AuthResponse>('/api/auth/2fa/complete-login', {
        tempToken: twoFAPending.tempToken,
        code: twoFACode,
      });
      setAuth(data.user, data.accessToken);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Invalid code';
      setError('root', { message });
    } finally {
      setTwoFALoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding & Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden auth-bg">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <FileSignature className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold">DocuSeal</span>
          </div>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-5xl font-bold mb-4 leading-tight">
                Welcome Back!
              </h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Sign in to continue managing your documents with ease and security.
              </p>
            </div>
            
            <div className="flex items-center gap-4 pt-8">
              <div className="flex -space-x-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-teal-400/90 text-xs font-bold text-white shadow-md">JD</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-pink-400 to-red-400 text-xs font-bold text-white shadow-md">AS</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-green-400 to-teal-400 text-xs font-bold text-white shadow-md">MR</div>
              </div>
              <div>
                <p className="font-semibold">Trusted by thousands</p>
                <p className="text-sm text-white/80">Join our growing community</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl"></div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
              <FileSignature className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold text-teal-700">
              DocuSeal
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-slate-200/50">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {twoFAPending ? 'Two-Factor Authentication' : 'Sign In'}
              </h1>
              <p className="text-slate-600">
                {twoFAPending
                  ? `Enter the 6-digit code from your authenticator app for ${twoFAPending.email}`
                  : 'Enter your credentials to access your account'}
              </p>
            </div>

            {twoFAPending ? (
              <form onSubmit={on2FASubmit} className="space-y-5">
                {errors.root?.message && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-900">{errors.root.message}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Verification code</label>
                  <input
                    type="text"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-lg border-2 border-slate-300 focus:border-teal-500 text-center text-xl tracking-[0.5em] font-mono"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={twoFALoading || twoFACode.length !== 6}
                  className="auth-btn-primary w-full font-semibold py-3.5 px-4 rounded-lg disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {twoFALoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Shield className="h-5 w-5" />}
                  {twoFALoading ? 'Verifying...' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={() => { setTwoFAPending(null); setTwoFACode(''); clearErrors('root'); }}
                  className="w-full py-2 text-sm text-slate-600 hover:text-slate-900"
                >
                  ← Back to login
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Success Message */}
              {justRegistered && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3 animate-slide-down">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Account created!</p>
                    <p className="text-xs text-emerald-700 mt-0.5">Please sign in to continue.</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {errors.root && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3 animate-shake">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-900">{errors.root.message}</p>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${
                    focusedField === 'email' ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    <Mail className="h-5 w-5" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    onFocus={() => setFocusedField('email')}
                    className={`w-full pl-11 pr-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.email
                        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : focusedField === 'email'
                        ? 'border-teal-500 bg-teal-50/50 focus:ring-4 focus:ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/20'
                    } text-slate-900 placeholder-slate-400`}
                    placeholder="Enter your email address"
                    {...register('email', {
                      onBlur: () => setFocusedField(null),
                    })}
                  />
                  {emailValue && !errors.email && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${
                    focusedField === 'password' ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    onFocus={() => setFocusedField('password')}
                    className={`w-full pl-11 pr-11 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.password
                        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : focusedField === 'password'
                        ? 'border-teal-500 bg-teal-50/50 focus:ring-4 focus:ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/20'
                    } text-slate-900 placeholder-slate-400`}
                    placeholder="Enter your password"
                    {...register('password', {
                      onBlur: () => setFocusedField(null),
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  state={{ email: emailValue || '' }}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="auth-btn-primary w-full font-semibold py-3.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    <span>Sign In</span>
                  </>
                )}
              </button>
            </form>
            )}

            {/* Register Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link
                  to={ROUTES.REGISTER}
                  className="auth-link font-semibold transition-colors"
                >
                  Sign up for free
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
