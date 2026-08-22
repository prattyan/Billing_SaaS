'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShoppingBag, Loader2 } from 'lucide-react';
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
    setValue,
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
      toast.error(err.response?.data?.message ?? 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (email: string, pwd: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pwd, { shouldValidate: true });
    onSubmit({ email, password: pwd });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.12) 0%, transparent 60%), rgb(9,9,11)' }}>

      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>

      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, rgb(139,92,246), rgb(109,40,217))',
            boxShadow: '0 8px 32px rgba(139,92,246,0.4)',
            marginBottom: 16,
          }}>
            <ShoppingBag size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 6 }}>
            <span className="gradient-text">BillFlow</span>
          </h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            Sign in to your shop dashboard
          </p>
        </div>

        {/* Card */}
        <div className="glass-card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ marginBottom: '20px' }}>
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
                <p style={{ color: 'rgb(239,100,100)', fontSize: '0.75rem', marginTop: 4 }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
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
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgb(113,113,122)',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ color: 'rgb(239,100,100)', fontSize: '0.75rem', marginTop: 4 }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={isLoading}>
              {isLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <hr className="divider" style={{ margin: '24px 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'rgb(161,161,170)' }}>
            New shop?{' '}
            <Link href="/register" style={{ color: 'rgb(167,139,250)', fontWeight: 600, textDecoration: 'none' }}>
              Create your account →
            </Link>
          </p>
        </div>

        {/* Super Admin Quick Login Card */}
        <div className="card" style={{ marginTop: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgb(167,139,250)' }}>
                Platform Super Admin
              </div>
              <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>
                admin@billingsaas.com (Onboard shops & oversee system)
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@billingsaas.com', 'SuperAdmin@123')}
              className="badge badge-purple"
              style={{
                fontSize: '0.7rem',
                padding: '4px 10px',
                border: 'none',
                cursor: 'pointer',
                background: 'rgba(139,92,246,0.2)',
                color: 'rgb(167,139,250)',
              }}
            >
              Sign In as Admin →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
