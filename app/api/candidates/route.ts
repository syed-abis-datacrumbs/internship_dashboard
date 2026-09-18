import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, updateCandidate, addCandidate } from '@/lib/candidates';

export async function GET() {
  const candidates = getCandidates();
  return NextResponse.json({ success: true, candidates });
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing candidate ID' }, { status: 400 });
    }

    const updated = updateCandidate(id, updates);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, candidate: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error updating candidate' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const created = addCandidate(data);
    return NextResponse.json({ success: true, candidate: created });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error adding candidate' }, { status: 500 });
  }
}
