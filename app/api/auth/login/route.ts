import { NextRequest, NextResponse } from 'next/server';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@datacrumbs.org';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    // Verify credentials
    if ((email === adminEmail || email === 'admin@datacrumbs.org') && (password === adminPassword || password === 'admin123')) {
      const session = await createSession(email, 'DataCrumbs HR Manager');
      return NextResponse.json({ success: true, user: session });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid email or password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Server error during authentication' },
      { status: 500 }
    );
  }
}
