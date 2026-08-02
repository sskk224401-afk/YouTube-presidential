'use client';

import React, { useState, useEffect } from 'react';
import { createClient, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createPollSecurely } from '@/app/actions';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const Icons = {
  Loader2: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Copy: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Swords: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg>
};

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [c1, setC1] = useState<{name: string, file: File | null, preview: string}>({ name: '', file: null, preview: '' });
  const [c2, setC2] = useState<{name: string, file: File | null, preview: string}>({ name: '', file: null, preview: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user || null);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (c1.preview) URL.revokeObjectURL(c1.preview);
      if (c2.preview) URL.revokeObjectURL(c2.preview);
    };
  }, [c1.preview, c2.preview]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      setCurrentUser(data.user);
    } catch (err: any) {
      setAuthError(err.message || 'فشل تسجيل الدخول، تأكد من بياناتك.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCreatePoll = async () => {
    setError(null);
    if (!c1.name.trim() || !c2.name.trim() || !c1.file || !c2.file) return setError('يرجى تعبئة جميع البيانات ورفع الصور.');
    if (c1.name.length > 50 || c2.name.length > 50) return setError('الاسم يجب ألا يتجاوز 50 حرفاً.');
    
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('يرجى تسجيل الدخول أولاً.');

      const formData = new FormData();
      formData.append('c1Name', c1.name.trim());
      formData.append('c1File', c1.file);
      formData.append('c2Name', c2.name.trim());
      formData.append('c2File', c2.file);
      formData.append('token', session.access_token);
      
      const response = await createPollSecurely(formData);
      if (response && response.success) setCreatedCode(response.code);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع.');
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    router.push('/');
  };

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b09] px-4" dir="rtl">
        <div className="w-full max-w-md relative rounded-2xl bg-[#0e1612]/80 backdrop-blur-md p-8 shadow-[0_0_25px_rgba(16,185,129,0.08)] border border-emerald-500/10">
          <button onClick={() => router.push('/')} className="absolute top-4 right-4 text-xs text-gray-400 hover:text-emerald-400 transition">رجوع للرئيسية</button>
          <div className="mb-6 flex justify-center mx-auto">
            <div className="w-12 h-12 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
              <Icons.Swords />
            </div>
          </div>
          <h2 className="text-xl font-bold text-center mb-1 text-white">تسجيل دخول الإدارة</h2>
          
          <form onSubmit={handleLogin} className="space-y-4 mt-6">
            <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border border-emerald-500/20 bg-[#050806] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400 transition" required />
            <input type="password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl border border-emerald-500/20 bg-[#050806] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400 transition" required />
            {authError && <p className="text-red-400 text-xs text-center">{authError}</p>}
            
            <button type="submit" disabled={loggingIn} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-semibold py-3.5 rounded-xl text-sm transition shadow-[0_0_12px_rgba(16,185,129,0.15)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              {loggingIn ? <div className="w-4 h-4"><Icons.Loader2 /></div> : 'دخول للوحة التحكم'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (createdCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#070b09] px-4" dir="rtl">
        <div className="w-full max-w-lg relative overflow-hidden rounded-2xl bg-[#0e1612]/80 backdrop-blur-md p-8 text-center shadow-2xl border border-emerald-500/20">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30">
            <div className="w-8 h-8 text-emerald-400"><Icons.Check /></div>
          </div>
          <h2 className="text-xl font-bold text-white mb-4">تم إنشاء الاستطلاع بنجاح!</h2>
          <p className="text-sm text-gray-400">شارك هذا الرمز مع المشاركين:</p>
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-[#050806] px-6 py-5">
            <p className="font-mono text-4xl font-bold tracking-[0.3em] text-emerald-400">{createdCode}</p>
          </div>
          <button onClick={async () => { 
            try {
              await navigator.clipboard.writeText(window.location.origin + '?poll=' + createdCode); 
              setCopied(true); setTimeout(()=>setCopied(false),2000);
            } catch { setError('فشل نسخ الرابط تلقائياً.'); }
          }} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3.5 text-sm font-semibold text-black transition cursor-pointer">
            <div className="w-4 h-4">{copied ? <Icons.Check /> : <Icons.Copy />}</div>
            {copied ? 'تم النسخ!' : 'نسخ رابط المشاركة'}
          </button>
          <button onClick={() => { 
            setCreatedCode(null); setC1({name:'', file:null, preview:''}); setC2({name:'', file:null, preview:''}); 
          }} className="mt-4 w-full text-sm text-gray-400 hover:text-emerald-400 transition py-2">إنشاء استطلاع آخر</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b09] text-white font-sans overflow-x-hidden pb-20 pt-8 px-4 sm:px-6" dir="rtl">
      <div className="mx-auto max-w-4xl relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => router.push('/')} className="text-sm text-gray-400 hover:text-white transition">← رجوع للرئيسية</button>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 transition">تسجيل خروج ({currentUser.email})</button>
        </div>
        
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold sm:text-3xl text-white">لوحة المسؤول - إنشاء استطلاع</h1>
        </div>

        {error && <div className="mx-auto mb-6 max-w-md rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">{error}</div>}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* المرشح الأول */}
          <div className="rounded-2xl bg-[#0e1612]/60 backdrop-blur-md p-5 border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.06)]">
            <h3 className="text-sm font-bold text-emerald-400 mb-4">المرشّح الأول</h3>
            <div className="mb-4">
              {c1.preview ? (
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-emerald-500/20">
                  <img src={c1.preview} alt="C1" className="aspect-[4/3] w-full object-cover" />
                  <button onClick={() => { URL.revokeObjectURL(c1.preview); setC1({...c1, file: null, preview: ''}); }} className="absolute top-2 left-2 z-10 bg-black/80 p-2 rounded-full hover:bg-red-500 text-white text-xs">✕</button>
                </div>
              ) : (
                <label className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/20 text-gray-500 hover:border-emerald-500/40 cursor-pointer bg-[#050806]">
                  <div className="w-7 h-7"><Icons.Upload /></div><span className="text-xs">رفع صورة</span>
                  <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => { 
                    if(e.target.files?.[0]) { 
                      const file = e.target.files[0]; 
                      if(file.size > 2 * 1024 * 1024) return setError("حجم الصورة أكبر من 2MB");
                      if(c1.preview) URL.revokeObjectURL(c1.preview); 
                      setC1({...c1, file, preview: URL.createObjectURL(file)}); 
                    } 
                  }} />
                </label>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">اسم المرشّح</label>
              <input type="text" placeholder="مثال: أحمد محمد" value={c1.name} onChange={e => setC1({...c1, name: e.target.value})} maxLength={50} className="w-full rounded-xl border border-emerald-500/20 bg-[#050806] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400" />
            </div>
          </div>

          {/* المرشح الثاني */}
          <div className="rounded-2xl bg-[#0e1612]/60 backdrop-blur-md p-5 border border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.06)]">
            <h3 className="text-sm font-bold text-emerald-400 mb-4">المرشّح الثاني</h3>
            <div className="mb-4">
              {c2.preview ? (
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-emerald-500/20">
                  <img src={c2.preview} alt="C2" className="aspect-[4/3] w-full object-cover" />
                  <button onClick={() => { URL.revokeObjectURL(c2.preview); setC2({...c2, file: null, preview: ''}); }} className="absolute top-2 left-2 z-10 bg-black/80 p-2 rounded-full hover:bg-red-500 text-white text-xs">✕</button>
                </div>
              ) : (
                <label className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-500/20 text-gray-500 hover:border-emerald-500/40 cursor-pointer bg-[#050806]">
                  <div className="w-7 h-7"><Icons.Upload /></div><span className="text-xs">رفع صورة</span>
                  <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => { 
                    if(e.target.files?.[0]) { 
                      const file = e.target.files[0]; 
                      if(file.size > 2 * 1024 * 1024) return setError("حجم الصورة أكبر من 2MB");
                      if(c2.preview) URL.revokeObjectURL(c2.preview); 
                      setC2({...c2, file, preview: URL.createObjectURL(file)}); 
                    } 
                  }} />
                </label>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">اسم المرشّح</label>
              <input type="text" placeholder="مثال: علي أحمد" value={c2.name} onChange={e => setC2({...c2, name: e.target.value})} maxLength={50} className="w-full rounded-xl border border-emerald-500/20 bg-[#050806] px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-emerald-400" />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <button onClick={handleCreatePoll} disabled={creating} className="flex items-center justify-center w-full max-w-sm gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-8 py-4 text-sm font-semibold text-black transition cursor-pointer disabled:opacity-50">
            {creating ? <div className="w-5 h-5"><Icons.Loader2 /></div> : <div className="w-5 h-5"><Icons.Swords /></div>}
            {creating ? 'جارٍ الإنشاء…' : 'إنشاء الاستطلاع'}
          </button>
        </div>
      </div>
    </div>
  );
}