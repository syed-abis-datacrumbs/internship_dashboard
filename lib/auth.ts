import { cookies } from 'next/headers';
import { UserSession } from './types';

const COOKIE_NAME = 'offer_dashboard_session';

export async function getSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);

  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const data = JSON.parse(sessionCookie.value);
    if (data && data.isLoggedIn) {
      return data;
    }
  } catch (e) {
    return null;
  }

  return null;
}

export async function createSession(email: string, name: string = 'HR Admin'): Promise<UserSession> {
  const cookieStore = await cookies();
  const sessionData: UserSession = {
    email,
    name,
    role: 'Administrator',
    isLoggedIn: true
  };

  cookieStore.set(COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  return sessionData;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
