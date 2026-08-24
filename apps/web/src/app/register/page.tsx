'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ShoppingBag, Loader2, Store, User, Mail, Phone, Lock } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

const registerSchema = z.object({
  shopName: z.string().min(2, 'Shop name too short').max(100),
  ownerName: z.string().min(2, 'Name too short').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Enter a valid phone number').max(15),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

const fields = [
  { name: 'shopName', label: 'Shop Name', placeholder: 'e.g. Fresh Mart Grocery', icon: Store, type: 'text' },
  { name: 'ownerName', label: 'Your Name', placeholder: 'e.g. Ramesh Kumar', icon: User, type: 'text' },
  { name: 'email', label: 'Email Address', placeholder: 'owner@yourshop.com', icon: Mail, type: 'email' },
  { name: 'phone', label: 'Mobile Number', placeholder: '9876543210', icon: Phone, type: 'tel' },
  { name: 'password', label: 'Password', placeholder: '8+ characters', icon: Lock, type: 'password' },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(data);
      const { user, tenant, accessToken, refreshToken } = res.data;
      setAuth(user, tenant, accessToken, refreshToken);
      toast.success('Welcome! Your shop has been created.');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || (err.code === 'ECONNABORTED' ? 'Server cold start timeout. Please tap Create My Shop again.' : err.message || 'Registration failed. Please check network connection.');
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at bottom right, rgba(52,211,153,0.08) 0%, transparent 60%), rgb(9,9,11)',
      }}
    >
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
            Create Your Shop
          </h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            Free Starter plan · 10 SKUs · No credit card required
          </p>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="label" htmlFor={field.name}>{field.label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      color: 'rgb(113,113,122)',
                    }}>
                      <field.icon size={15} />
                    </span>
                    <input
                      id={field.name}
                      type={field.type}
                      className="input"
                      placeholder={field.placeholder}
                      style={{ paddingLeft: '36px' }}
                      {...register(field.name)}
                    />
                  </div>
                  {errors[field.name] && (
                    <p style={{ color: 'rgb(239,100,100)', fontSize: '0.75rem', marginTop: 4 }}>
                      {errors[field.name]?.message as string}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '24px' }}
              disabled={isLoading}
            >
              {isLoading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating Shop...</>
                : '🚀 Create My Shop — Free'}
            </button>
          </form>

          <hr className="divider" style={{ margin: '20px 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'rgb(161,161,170)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'rgb(167,139,250)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>

        {/* Plan badge */}
        <div style={{
          textAlign: 'center', marginTop: 16,
          fontSize: '0.75rem', color: 'rgb(113,113,122)',
        }}>
          🔒 Your data is encrypted and isolated. No sharing between shops.
        </div>
      </div>
    </div>
  );
}
