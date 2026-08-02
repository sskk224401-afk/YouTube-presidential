'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import { getPollDataSecurely, castVoteSecurely } from './actions';

const Icons = {
  Swords: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/><line x1="3" y1="19" x2="5" y2="21"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
  Loader2: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>,
  LogIn: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
  ShieldCheck: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  CheckCircle2: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Trophy: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
};

export default function App() {
  const [view, setView] = useState<'home' | 'voting'>('home');
  const [loadingSession, setLoadingSession] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [pollCodeInput, setPollCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [activePoll, setActivePoll] = useState<any>(null);
  const [voted, setVoted] = useState(false);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  // إعداد عميل Supabase بحيث لا يحفظ الجلسة في التخزين الدائم (تُمسح عند الخروج)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false, // منع حفظ الجلسة نهائياً لضمان مطالبة المستخدم بتسجيل الدخول في كل زيارة
        autoRefreshToken: false,
      }
    }
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const poll = params.get('poll');
    if (poll && poll.length === 5) {
      handleJoinPoll(poll.toUpperCase());
    }
  }, []);

  const handleJoinPoll = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (c.length !== 5) return setError('يرجى إدخال كود صحيح مكون من 5 أحرف.');
    setJoining(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const data = await getPollDataSecurely(c, session?.access_token);
      
      if (!data) throw new Error('الاستطلاع غير موجود، أو الكود غير صحيح.');
      setActivePoll(data);
      setVoted(data.hasVoted);
      setView('voting');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الانضمام للاستطلاع.');
    } finally {
      setJoining(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: { redirectTo: window.location.href }
      });
      if (error) throw error;
    } catch (err) {
      setError('فشل تسجيل الدخول عبر جوجل.');
    }
  };

  const castVote = async (candidateId: string) => {
    if (!currentUser || voted || !activePoll) return;
    setVotingFor(candidateId);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('يجب تسجيل الدخول أولاً.');
      
      await castVoteSecurely(activePoll.pollId, candidateId, session.access_token);
      setVoted(true);
      const data = await getPollDataSecurely(activePoll.code, session.access_token);
      setActivePoll(data);
    } catch (err: any) {
      setError(err.message || 'تعذر تسجيل صوتك.');
    } finally {
      setVotingFor(null);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-[#070b09] flex items-center justify-center">
        <div className="w-8 h-8 text-emerald-400"><Icons.Loader2 /></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070b09] text-white font-sans overflow-x-hidden" dir="rtl">
      <div className="fixed inset-0 z-0 opacity-25 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#10b98115 1px, transparent 1px), linear-gradient(90deg, #10b98115 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] bg-emerald-950/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-emerald-900/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10">
        {view === 'home' && (
          <div className="flex flex-col items-center justify-center min-h-screen px-4">
            <div className="w-full max-w-md">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_rgba(52,211,118,0.2)]">
                  <div className="w-8 h-8 text-[#070b09]"><Icons.Swords /></div>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">انتخابات رئاسة اليوتيوب</h1>
                <p className="text-sm text-gray-400">منصة التصويت المباشر الآمنة</p>
              </div>

              <div className="relative rounded-2xl bg-[#0e1612]/70 backdrop-blur-md p-8 shadow-[0_0_25px_rgba(16,185,129,0.08)]">
                <div className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-b from-emerald-500/15 to-transparent opacity-60 blur-sm" />
                <div className="mb-6 flex items-center gap-2 text-xs font-medium text-emerald-400">
                  <div className="w-3.5 h-3.5"><Icons.Sparkles /></div> أدخل رمز الاستطلاع للمشاركة
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleJoinPoll(pollCodeInput); }} className="space-y-4">
                  <input type="text" value={pollCodeInput} onChange={(e) => { setPollCodeInput(e.target.value.toUpperCase()); setError(null); }} maxLength={5} placeholder="مثال: AB3XK" dir="ltr" className="w-full rounded-xl border border-emerald-500/20 bg-[#050806] px-4 py-4 text-center font-mono text-2xl font-bold tracking-[0.4em] text-white placeholder-gray-600 outline-none transition-all focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(52,211,118,0.2)]" />
                  {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-center text-xs text-red-300">{error}</p>}
                  <button type="submit" disabled={joining || pollCodeInput.length !== 5} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3.5 text-sm font-bold text-black shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                    <div className="w-5 h-5">{joining ? <Icons.Loader2 /> : <Icons.LogIn />}</div>
                    {joining ? 'جارٍ الدخول…' : 'انضمام'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {view === 'voting' && activePoll && (
          <div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 min-h-screen">
            <div className="flex items-center justify-between mb-6">
              {currentUser ? (
                <button onClick={async () => { await supabase.auth.signOut(); setCurrentUser(null); setVoted(false); }} className="text-xs text-red-400 hover:text-red-300 cursor-pointer">
                  تسجيل خروج ({currentUser.email ?? ''})
                </button>
              ) : <div />}
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-[#0e1612] px-3 py-1.5">
                <span className="text-xs text-gray-400">رمز الاستطلاع:</span>
                <span className="font-mono text-sm font-bold text-emerald-400">{activePoll.code}</span>
              </div>
            </div>

            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-white">صوت في الإنتخابات</h1>
              <p className="mt-1.5 text-xs text-gray-400">اختر مرشحك</p>
            </div>

            {error && <div className="mx-auto mt-4 max-w-md rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-xs text-red-300">{error}</div>}

            {!currentUser ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="w-full max-w-md rounded-3xl bg-[#0e1612]/80 p-8 text-center shadow-2xl backdrop-blur-xl border border-emerald-500/10 shadow-[0_0_25px_rgba(16,185,129,0.08)]">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <div className="w-8 h-8"><Icons.ShieldCheck /></div>
                  </div>
                  <h2 className="text-2xl font-bold mb-2 text-white">سجل في الإنتخابات</h2>
                  <p className="text-xs text-gray-400 mb-6">يجب تسجيل الدخول بحساب جوجل للمتابعة والتصويت بأمان</p>
                  <button onClick={loginWithGoogle} className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-black hover:bg-gray-200 py-3.5 px-4 font-bold transition shadow-lg text-sm cursor-pointer">
                    <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.64-.21-2.43H12v4.63h6.51c-.28 1.48-1.12 2.73-2.4 3.58v2.97h3.88c2.27-2.09 3.51-5.17 3.51-8.75z" /><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-2.97c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.15v3.07C3.15 21.31 7.25 24 12 24z" /><path fill="#FBBC05" d="M5.28 14.35c-.25-.72-.39-1.49-.39-2.35s.14-1.63.39-2.35V6.58H1.15C.42 8.04 0 9.97 0 12s.42 3.96 1.15 5.42l4.13-3.07z" /><path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.18 15.24 0 12 0 7.25 0 3.15 2.69 1.15 6.58l4.13 3.07c.95-2.83 3.6-4.9 6.72-4.9z" /></svg>
                    تسجيل الدخول بحساب جوجل
                  </button>
                </div>
              </div>
            ) : (
              <>
                {voted && (
                  <div className="mx-auto mt-6 mb-6 flex max-w-md items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <div className="w-5 h-5"><Icons.CheckCircle2 /></div>تم تسجيل صوتك بنجاح، شكراً لمشاركتك!
                  </div>
                )}

                {(() => {
                  let maxVotes = -1; let isTie = false; let leaderId: string | null = null;
                  activePoll.candidates.forEach((c: any) => {
                    if (c.votesCount > maxVotes) { maxVotes = c.votesCount; leaderId = c.id; isTie = false; }
                    else if (c.votesCount === maxVotes && maxVotes > 0) { isTie = true; }
                  });

                  return (
                    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                      {activePoll.candidates.map((cand: any) => {
                        const isLeader = (!isTie && cand.id === leaderId && maxVotes > 0);
                        const isVoting = votingFor === cand.id;
                        
                        const glowStyle = isLeader 
                          ? 'shadow-[0_0_25px_rgba(16,185,129,0.18)] bg-[#0e1612]/70 border border-emerald-500/30' 
                          : 'shadow-[0_0_20px_rgba(16,185,129,0.08)] bg-[#0e1612]/50 border border-emerald-500/10';

                        return (
                          <div key={cand.id} className={`group relative overflow-hidden rounded-2xl backdrop-blur-md p-4 flex flex-col justify-between transition-all ${glowStyle}`}>
                            <div className="relative aspect-video rounded-xl overflow-hidden bg-black/50 flex items-center justify-center">
                              {cand.image_url ? <Image src={cand.image_url} alt={cand.name} fill className="object-cover" /> : <div className="w-12 h-12 text-gray-500"><Icons.User /></div>}
                              {isLeader && <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/80 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30"><div className="w-3.5 h-3.5"><Icons.Trophy /></div> المتصدر</div>}
                            </div>
                            <h3 className="text-xl font-bold text-center my-4 text-white">{cand.name}</h3>
                            <button onClick={() => castVote(cand.id)} disabled={voted || isVoting} className="w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.15)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                              <div className="w-5 h-5">{isVoting ? <Icons.Loader2 /> : voted ? <Icons.CheckCircle2 /> : <Icons.Trophy />}</div>
                              {isVoting ? 'جاري التسجيل…' : voted ? 'تم التصويت' : 'صوت لهذا المرشح'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {voted && (
                  <div className="mt-10">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-5 h-5 text-emerald-400"><Icons.Trophy /></div><h2 className="text-lg font-semibold text-white">النتائج المباشرة</h2></div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400"><div className="w-4 h-4"><Icons.Users /></div>{activePoll.totalVotes} صوت</div>
                    </div>
                    
                    <div className="space-y-5">
                      {activePoll.candidates.map((cand: any) => {
                        const pct = activePoll.totalVotes > 0 ? Math.round((cand.votesCount / activePoll.totalVotes) * 100) : 0;
                        let maxVotes = -1; let isTie = false; let leaderId: string | null = null;
                        activePoll.candidates.forEach((c: any) => {
                          if (c.votesCount > maxVotes) { maxVotes = c.votesCount; leaderId = c.id; isTie = false; } else if (c.votesCount === maxVotes && maxVotes > 0) { isTie = true; }
                        });
                        const isLeader = (!isTie && cand.id === leaderId && maxVotes > 0);

                        return (
                          <div key={cand.id} className="rounded-xl bg-[#0e1612]/60 backdrop-blur-md p-4 border border-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.06)]">
                            <div className="mb-2 flex items-center justify-between text-sm">
                              <span className={`font-semibold flex items-center gap-1 ${isLeader ? 'text-emerald-400' : 'text-white'}`}>{isLeader && <div className="w-3.5 h-3.5"><Icons.Trophy /></div>}{cand.name}</span>
                              <span className="text-gray-400">{cand.votesCount} صوت ({pct}%)</span>
                            </div>
                            <div className="h-3 w-full overflow-hidden rounded-full bg-black/60 shadow-[inset_0_0_8px_rgba(16,185,129,0.15)]">
                              <div className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <div className="w-3.5 h-3.5"><Icons.Lock /></div>التصويت مشفر ومحمي ضد التكرار والتلاعب
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}