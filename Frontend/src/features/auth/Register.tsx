import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, FileSignature, Eye, EyeOff, Mail, Lock, User, CheckCircle2, AlertCircle, Loader2, Shield, Zap, Star } from 'lucide-react';
import { api } from '../../api/axios';
import type { AuthResponse } from '../../types';
import { ROUTES } from '../../utils/constants';

const schema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const nameValue = watch('name');
  const emailValue = watch('email');
  const passwordValue = watch('password');

  async function onSubmit(data: FormData) {
    try {
      await api.post<AuthResponse>('/api/auth/register', data);
      navigate(ROUTES.LOGIN, { replace: true, state: { registered: true } });
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed';
      setError('root', { message });
    }
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 3) return { strength, label: 'Fair', color: 'bg-yellow-500' };
    if (strength <= 4) return { strength, label: 'Good', color: 'bg-blue-500' };
    return { strength, label: 'Strong', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(passwordValue || '');

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
                Start Your Journey
              </h2>
              <p className="text-xl text-white/90 leading-relaxed">
                Join thousands of users who trust DocuSeal for secure document management and signing.
              </p>
            </div>
            
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Bank-level Security</p>
                  <p className="text-sm text-white/80">Your documents are encrypted and protected</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Lightning Fast</p>
                  <p className="text-sm text-white/80">Sign documents in seconds, not minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">Easy to Use</p>
                  <p className="text-sm text-white/80">Intuitive interface for everyone</p>
                </div>
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

      {/* Right Side - Register Form */}
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
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Create Account</h1>
              <p className="text-slate-600">Sign up to start managing your documents</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Error Message */}
              {errors.root && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3 animate-shake">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-900">{errors.root.message}</p>
                </div>
              )}

              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name
                </label>
                <div className="relative group">
                  <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-all duration-200 ${
                    focusedField === 'name' ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}>
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    onFocus={() => setFocusedField('name')}
                    className={`w-full pl-11 pr-4 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.name
                        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : focusedField === 'name'
                        ? 'border-teal-500 bg-teal-50/50 focus:ring-4 focus:ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/20'
                    } text-slate-900 placeholder-slate-400`}
                    placeholder="John Doe"
                    {...register('name', { onBlur: () => setFocusedField(null) })}
                  />
                  {nameValue && !errors.name && nameValue.length >= 2 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {errors.name.message}
                  </p>
                )}
              </div>

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
                    {...register('email', { onBlur: () => setFocusedField(null) })}
                  />
                  {emailValue && !errors.email && emailValue.includes('@') && (
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
                    autoComplete="new-password"
                    onFocus={() => setFocusedField('password')}
                    className={`w-full pl-11 pr-11 py-3 rounded-lg border-2 transition-all duration-200 ${
                      errors.password
                        ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : focusedField === 'password'
                        ? 'border-teal-500 bg-teal-50/50 focus:ring-4 focus:ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/20'
                    } text-slate-900 placeholder-slate-400`}
                    placeholder="At least 6 characters"
                    {...register('password', { onBlur: () => setFocusedField(null) })}
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
                
                {/* Password Strength Indicator */}
                {passwordValue && passwordValue.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Password strength:</span>
                      <span className={`font-semibold ${
                        passwordStrength.strength <= 2 ? 'text-red-600' :
                        passwordStrength.strength <= 3 ? 'text-yellow-600' :
                        passwordStrength.strength <= 4 ? 'text-blue-600' : 'text-green-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {errors.password.message}
                  </p>
                )}
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
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link
                  to={ROUTES.LOGIN}
                  className="font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
