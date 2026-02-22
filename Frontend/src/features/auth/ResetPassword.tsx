import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, FileSignature, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../api/axios';
import { ROUTES } from '../../utils/constants';

const schema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) {
      setError('root', { message: 'Invalid or missing reset link. Please request a new one from the forgot password page.' });
    }
  }, [token, setError]);

  async function onSubmit(data: FormData) {
    if (!token) return;
    try {
      await api.post('/api/auth/reset-password', { token, password: data.password });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to reset password. Please try again.';
      setError('root', { message: msg });
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-slate-200/50">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Password reset!</h1>
                <p className="text-slate-600">
                  Your password has been updated. You can now sign in with your new password.
                </p>
              </div>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center justify-center w-full rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-4 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
            <FileSignature className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold text-teal-700">DocuSeal</span>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-slate-200/50">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Set new password</h1>
            <p className="text-slate-600">
              Enter your new password below.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-900">{errors.root.message}</p>
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-11 py-3 rounded-lg border-2 transition-all ${
                    errors.password
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-slate-200 bg-slate-50 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20'
                  } text-slate-900`}
                  placeholder="At least 6 characters"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`w-full pl-11 pr-4 py-3 rounded-lg border-2 transition-all ${
                    errors.confirmPassword
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-slate-200 bg-slate-50 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20'
                  } text-slate-900`}
                  placeholder="Confirm your password"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1.5 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !token}
              className="auth-btn-primary w-full font-semibold py-3.5 px-4 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to={ROUTES.LOGIN}
              className="text-sm text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
