'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Flame, Loader2, Store, User, Mail, Phone, Lock } from 'lucide-react';
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
        background: 'rgb(var(--surface-0))',
      }}
    >
      <div className="w-full max-w-md animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 16,
            background: 'rgb(var(--text-primary))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
            marginBottom: 16,
          }}>
            <Flame size={28} color="white" />
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
            Create Your Shop
          </h1>
          <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.85rem' }}>
            Free Starter Tier · Instant Setup · No Credit Card Required
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '34px', background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 20 }}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {fields.map(({ name, label, placeholder, icon: Icon, type }) => (
                <div key={name}>
                  <label className="label" htmlFor={name}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'rgb(var(--text-muted))', display: 'flex', pointerEvents: 'none',
                    }}>
                      <Icon size={16} />
                    </div>
                    <input
                      id={name}
                      type={type}
                      className="input"
                      style={{ paddingLeft: '40px' }}
                      placeholder={placeholder}
                      {...register(name)}
                    />
                  </div>
                  {errors[name] && (
                    <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: 5, fontWeight: 600 }}>
                      {errors[name]?.message}
                    </p>
                  )}
                </div>
              ))}

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', height: 46, fontSize: '0.95rem', marginTop: 8 }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Setting up your shop...</>
                ) : (
                  'Create My Shop — Free'
                )}
              </button>
            </div>
          </form>

          <hr className="divider" style={{ margin: '22px 0' }} />

          <p style={{ textAlign: 'center', fontSize: '0.86rem', color: 'rgb(var(--text-secondary))' }}>
            Already have a shop account?{' '}
            <Link href="/login" style={{ color: 'rgb(var(--color-primary))', fontWeight: 700, textDecoration: 'none' }}>
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
