import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, FileSignature, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../api/axios';
import { ROUTES } from '../../utils/constants';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const location = useLocation();
  const state = location.state as { email?: string } | null;
  const prefilledEmail = state?.email ?? '';

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefilledEmail },
  });

  useEffect(() => {
    if (prefilledEmail) reset({ email: prefilledEmail });
  }, [prefilledEmail, reset]);

  async function onSubmit(data: FormData) {
    try {
      await api.post('/api/auth/forgot-password', { email: data.email });
      setSubmitted(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string }; status?: number }; message?: string; code?: string };
      let msg = 'Request failed. Please try again.';
      if (e.response?.data?.error) {
        msg = e.response.data.error;
      } else if (!e.response) {
        msg = 'Unable to connect. Please check that the backend is running and try again.';
      } else if (e.response.status === 404) {
        msg = 'Server not found. Please check that the backend is running.';
      }
      setError('root', { message: msg });
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 border border-slate-200/50">
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
                <p className="text-slate-600">
                  If an account exists with that email, we&apos;ve sent a password reset link. The link expires in 1 hour.
                </p>
              </div>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:text-teal-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
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
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Forgot password?</h1>
            <p className="text-slate-600">
              Enter your email and we&apos;ll send you a link to reset your password.
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
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`w-full pl-11 pr-4 py-3 rounded-lg border-2 transition-all ${
                    errors.email
                      ? 'border-red-300 bg-red-50 focus:border-red-500'
                      : 'border-slate-200 bg-slate-50 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20'
                  } text-slate-900`}
                  placeholder="Enter your email address"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="auth-btn-primary w-full font-semibold py-3.5 px-4 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
