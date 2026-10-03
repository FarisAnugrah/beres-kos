'use server';
import { cookies } from 'next/headers';

export async function loginAction(password: string) {
  const validPassword = process.env.ADMIN_PASSWORD || 'admin123';
  if (password === validPassword) {
    const cookieStore = await cookies();
    cookieStore.set('auth_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 minggu
    });
    return true;
  }
  return false;
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}
