import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let role: string | undefined;
  try {
    const response = await fetch(
      `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/auth/session`,
      {
        headers: { cookie: request.headers.get('cookie') || '' },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      }
    );
    if (response.ok) role = (await response.json()).role;
  } catch {}
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (pathname.startsWith('/tenant/dashboard') && role !== 'tenant') {
    return NextResponse.redirect(new URL('/tenant', request.url));
  }
  if (pathname === '/login' && role === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/tenant/dashboard/:path*'],
};
