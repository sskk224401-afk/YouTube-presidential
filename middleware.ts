import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 1. التحقق من المستخدم عبر السيرفر بأمان تام
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const path = url.pathname

  // 2. تحديد المسارات التي تتطلب تسجيل دخول (مثل لوحة التحكم أو صفحة التصويت الرئيسية)
  // تقدر تعدل المسارات دي حسب اللي موجود في مشروعك
  const isProtectedPath = path.startsWith('/admin') || path.startsWith('/vote')

  // 3. منع غير المعتمدين من الدخول وتحويلهم لصفحة تسجيل الدخول
  if (isProtectedPath && !user) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 4. إذا كان مسجل دخول وموجود في صفحة الـ login، وجهه للرئيسية مباشرة
  if (path === '/login' && user) {
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return response
}

// 5. تحديد المسارات التي يراقبها الـ Middleware بدقة
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
