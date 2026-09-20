import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, updateCandidate, addCandidate } from '@/lib/candidates';
import { getCandidatesFromSupabase, upsertCandidateToSupabase } from '@/lib/supabaseCandidateService';

export async function GET() {
  const supabaseCandidates = await getCandidatesFromSupabase();
  if (supabaseCandidates && supabaseCandidates.length > 0) {
    return NextResponse.json(
      { success: true, candidates: supabaseCandidates, source: 'supabase' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59'
        }
      }
    );
  }

  const candidates = getCandidates();
  return NextResponse.json(
    { success: true, candidates, source: 'local_store' },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59'
      }
    }
  );
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

    // Persist to Supabase in background
    upsertCandidateToSupabase(updated).catch((err) =>
      console.error('Background Supabase update error:', err)
    );

    return NextResponse.json({ success: true, candidate: updated });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error updating candidate' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const created = addCandidate(data);

    // Persist to Supabase in background
    upsertCandidateToSupabase(created).catch((err) =>
      console.error('Background Supabase insert error:', err)
    );

    return NextResponse.json({ success: true, candidate: created });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error adding candidate' }, { status: 500 });
  }
}
