'use server';

import { rateLimit } from "@/lib/rate-limit";
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { headers } from 'next/headers';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function getIpSafely(): Promise<string> {
  try {
    const headerList = await headers();
    const forwarded = headerList.get('x-forwarded-for');
    return forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
  } catch (error) { return '127.0.0.1'; }
}

// فحص سريع جداً عبر Upstash لتحمل الملايين دون ضغط على السيرفر
async function checkRateLimitFast(ip: string): Promise<boolean> {
  try {
    const result = await Promise.race([
      rateLimit.limit(ip),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500))
    ]);
    return (result as any).success;
  } catch (err) {
    return false; // حماية صارمة في حال الضغط الهائل
  }
}

function sanitizeName(name: string): string {
  if (!name || typeof name !== 'string') throw new Error('اسم غير صالح.');
  const cleaned = name.trim().replace(/[^\w\s\u0600-\u06FF.'-]/g, '');
  if (cleaned.length === 0 || cleaned.length > 50) throw new Error('الاسم يجب أن يكون بين 1 و 50 حرفاً.');
  return cleaned;
}

async function validateAndDetectImage(file: File): Promise<{ buffer: ArrayBuffer; ext: string; mime: string }> {
  if (file.size > 2 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتعدى 2MB.');
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  
  let detectedExt = '', detectedMime = '';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) { detectedExt = 'jpg'; detectedMime = 'image/jpeg'; } 
  else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) { detectedExt = 'png'; detectedMime = 'image/png'; } 
  else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) { detectedExt = 'webp'; detectedMime = 'image/webp'; }
  
  if (!detectedExt) throw new Error('صيغة الصورة غير مدعومة.');
  return { buffer, ext: detectedExt, mime: detectedMime };
}

async function verifyAuthToken(token?: string) {
  if (!token) throw new Error('يرجى تسجيل الدخول بحساب جوجل أولاً.');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول.');
  return user; // هنا نحصل على الـ ID الفريد للمستخدم user.id
}

export async function createPollSecurely(formData: FormData) {
  const ip = await getIpSafely();
  if (!(await checkRateLimitFast(ip))) throw new Error("ضغط عالي جداً، يرجى المحاولة بعد قليل.");

  const token = formData.get("token") as string;
  const user = await verifyAuthToken(token);

  const adminEmailEnv = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmailEnv || user.email?.trim().toLowerCase() !== adminEmailEnv) {
    throw new Error('غير مصرح لك بإنشاء استطلاع.');
  }
  
  const c1Name = sanitizeName(formData.get('c1Name') as string);
  const c2Name = sanitizeName(formData.get('c2Name') as string);
  const c1File = formData.get('c1File') as File;
  const c2File = formData.get('c2File') as File;
  if (!c1File || !c2File) throw new Error('يرجى رفع صور المرشحين.');

  const img1Info = await validateAndDetectImage(c1File);
  const img2Info = await validateAndDetectImage(c2File);
  const uploadedFileNames: string[] = [];
  
  try {
    const fileName1 = `${crypto.randomUUID()}.${img1Info.ext}`;
    const fileName2 = `${crypto.randomUUID()}.${img2Info.ext}`;
    
    const upload1 = await supabaseAdmin.storage.from('avatars').upload(fileName1, img1Info.buffer, { contentType: img1Info.mime });
    if (upload1.error) throw new Error('فشل رفع الصورة الأولى.');
    uploadedFileNames.push(fileName1);
    
    const upload2 = await supabaseAdmin.storage.from('avatars').upload(fileName2, img2Info.buffer, { contentType: img2Info.mime });
    if (upload2.error) throw new Error('فشل رفع الصورة الثانية.');
    uploadedFileNames.push(fileName2);
    
    const img1Url = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName1).data.publicUrl;
    const img2Url = supabaseAdmin.storage.from('avatars').getPublicUrl(fileName2).data.publicUrl;
    
    let code = '';
    let isUnique = false;
    let attempts = 0;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    while (!isUnique && attempts < 10) {
      attempts++;
      code = '';
      const randomBytes = crypto.randomBytes(5);
      for (let i = 0; i < 5; i++) code += chars[randomBytes[i] % chars.length];
      const { data } = await supabaseAdmin.from('polls').select('id').eq('code', code).single();
      if (!data) isUnique = true;
    }
    if (!isUnique) throw new Error('فشل توليد كود فريد.');
    
    const { data: poll, error: pErr } = await supabaseAdmin.from('polls').insert([{ code, created_by: user.id, is_active: true }]).select().single();
    if (pErr || !poll) throw new Error('فشل تسجيل الاستطلاع.');
    
    const { error: cErr } = await supabaseAdmin.from('candidates').insert([
      { poll_id: poll.id, name: c1Name, image_url: img1Url },
      { poll_id: poll.id, name: c2Name, image_url: img2Url },
    ]);
    if (cErr) throw new Error('فشل تسجيل المرشحين.');
    
    return { success: true, code: poll.code };
  } catch (err: any) {
    if (uploadedFileNames.length > 0) await supabaseAdmin.storage.from('avatars').remove(uploadedFileNames);
    throw new Error(err.message || "حدث خطأ غير معروف");
  }
}

export async function getPollDataSecurely(code: string, token?: string) {
  const ip = await getIpSafely();
  if (!(await checkRateLimitFast(ip))) throw new Error("ضغط عالي على الخادم.");
  
  let userId = null;
  let isAdmin = false;

  if (token) {
    try { 
      const user = await verifyAuthToken(token); 
      userId = user.id; 
      const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      if (adminEmail && user.email?.trim().toLowerCase() === adminEmail) {
        isAdmin = true;
      }
    } catch (e) { }
  }
  
  const cleanCode = code.trim().toUpperCase();
  const { data: poll } = await supabaseAdmin.from('polls').select('*').eq('code', cleanCode).single();
  if (!poll || !poll.is_active) throw new Error('الاستطلاع غير موجود أو مغلق.');
  
  const { data: candidates } = await supabaseAdmin.from('candidates').select('*').eq('poll_id', poll.id).order('id');
  if (!candidates || candidates.length === 0) throw new Error('لا يوجد مرشحين.');
  
  let hasVoted = false;
  if (userId) {
    // التحقق الفوري برقم الـ ID الخاص بحساب جوجل في قاعدة البيانات
    const { count } = await supabaseAdmin.from('votes').select('*', { count: 'exact', head: true }).eq('poll_id', poll.id).eq('user_id', userId);
    if (count && count > 0) hasVoted = true;
  }

  const maskResults = !hasVoted && !isAdmin;

  const candidatesWithCounts = await Promise.all(
    candidates.map(async (c) => {
      const { count } = await supabaseAdmin.from('votes').select('*', { count: 'exact', head: true }).eq('candidate_id', c.id);
      return { id: c.id, name: c.name, image_url: c.image_url, votesCount: maskResults ? 0 : (count || 0) };
    })
  );
  
  const { count: totalVotesCount } = await supabaseAdmin.from('votes').select('*', { count: 'exact', head: true }).eq('poll_id', poll.id);
  
  return { pollId: poll.id, code: poll.code, candidates: candidatesWithCounts, hasVoted, totalVotes: maskResults ? 0 : (totalVotesCount || 0) };
}

export async function castVoteSecurely(pollId: string, candidateId: string, token: string) {
  const ip = await getIpSafely();
  if (!(await checkRateLimitFast(ip))) throw new Error("ضغط عالي، يرجى المحاولة مرة أخرى.");
  
  // التحقق القاطع من الـ ID الخاص بالمستخدم عبر التوكن المشفر
  const user = await verifyAuthToken(token);

  const { data: poll } = await supabaseAdmin.from('polls').select('id, is_active').eq('id', pollId).single();
  if (!poll || !poll.is_active) throw new Error('الاستطلاع غير موجود أو تم إغلاقه.');

  const { data: candidate } = await supabaseAdmin.from('candidates').select('poll_id').eq('id', candidateId).single();
  if (!candidate || candidate.poll_id !== pollId) throw new Error('بيانات المرشح غير صالحة.');

  // تسجيل الصوت باستخدام user.id الفريد (يمنعه نهائياً من التكرار حتى لو خرج و دخل ألف مرة)
  const { error }  = await supabaseAdmin.from('votes').insert([{ 
    poll_id: pollId, 
    candidate_id: candidateId, 
    user_id: user.id 
  }]);

  if (error) {
    if (error.code === '23505') throw new Error('لقد قمت بالتصويت مسبقاً بهذا الحساب، لا يمكنك التصويت مرة أخرى.');
    throw new Error('حدث خطأ أثناء تسجيل الصوت.');
  }

  return { success: true };
}