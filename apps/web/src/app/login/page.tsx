'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShoppingBag, Loader2, ShieldCheck } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(data);
      const { user, tenant, accessToken, refreshToken } = res.data;
      setAuth(user, tenant, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === 'SUPER_ADMIN') {
        router.push('/superadmin');
      } else if (user.role === 'BILLER') {
        router.push('/pos');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.code === 'ECONNABORTED' ? 'Server cold start timeout. Please tap Sign In again in 5 seconds.' : err.message || 'Login failed. Please check network connection.');
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'rgb(10, 10, 14)',
      }}>

      {/* Background decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-15%', right: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(22, 163, 74, 0.07) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(22, 163, 74, 0.04) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div className="w-full max-w-md animate-fadeIn" style={{ position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 58, height: 58, borderRadius: 16,
            background: 'rgb(22, 163, 74)',
            boxShadow: '0 6px 24px rgba(22,163,74,0.3)',
            marginBottom: 18,
          }}>
            <ShoppingBag size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: 6, letterSpacing: '-0.03em' }}>
            BillFlow POS
          </h1>
          <p style={{ color: 'rgb(100,116,139)', fontSize: '0.88rem', fontWeight: 500 }}>
            Enterprise Cloud POS & Billing SaaS
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '34px', border: '1px solid rgb(38,40,52)' }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ marginBottom: '22px' }}>
              <label className="label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@yourshop.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p style={{ color: 'rgb(251, 113, 133)', fontSize: '0.78rem', marginTop: 6, fontWeight: 600 }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '26px' }}>
              <label className="label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ paddingRight: '44px' }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgb(161, 161, 170)',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: 'rgb(251, 113, 133)', fontSize: '0.78rem', marginTop: 6, fontWeight: 600 }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', height: 46, fontSize: '0.95rem' }} disabled={isLoading}>
              {isLoading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</> : 'Sign In to POS'}
            </button>
          </form>

          <hr className="divider" style={{ margin: '26px 0' }} />

          <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.78rem', color: 'rgb(100,116,139)' }}>
            <ShieldCheck size={15} color="rgb(22, 163, 74)" /> 256-bit Encrypted Multi-Tenant SaaS
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.88rem', color: 'rgb(100,116,139)', marginTop: 16 }}>
            New shop?{' '}
            <Link href="/register" style={{ color: '#4ade80', fontWeight: 700, textDecoration: 'none' }}>
              Create your shop account →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
