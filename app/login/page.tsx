'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      
      router.push('/admin');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، يرجى التأكد من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b09] px-4" dir="rtl">
      <div className="w-full max-w-md relative rounded-2xl bg-[#0e1612]/80 backdrop-blur-md p-8 shadow-[0_0_25px_rgba(16,185,129,0.08)] border border-emerald-500/10">
        <button onClick={() => router.push('/')} className="absolute top-4 right-4 text-xs text-gray-400 hover:text-emerald-400 transition">رجوع للرئيسية</button>
        <div className="mb-6 flex justify-center mx-auto">
          <div className="w-12 h-12 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-center mb-1 text-white">تسجيل دخول الإدارة</h2>
        <p className="text-gray-400 text-xs text-center mb-6">سجل دخولك لإدارة منصة الانتخابات</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-emerald-500/20 bg-[#050806] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400 transition" required />
          <input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-emerald-500/20 bg-[#050806] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400 transition" required />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-semibold py-3.5 rounded-xl text-sm transition shadow-[0_0_12px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
            {loading ? 'جارٍ التحقق...' : 'دخول للوحة التحكم'}
          </button>
        </form>
      </div>
    </div>
  );
}