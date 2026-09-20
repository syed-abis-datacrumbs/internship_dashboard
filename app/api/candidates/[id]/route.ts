import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing candidate ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('candidates')
      .select('id, email_reply, ai_analysis, last_sent_draft, reply_sent, reply_sent_date')
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, message: 'Candidate details not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      details: {
        id: data.id,
        emailReply: data.email_reply,
        aiAnalysis: data.ai_analysis,
        lastSentDraft: data.last_sent_draft,
        replySent: data.reply_sent,
        replySentDate: data.reply_sent_date
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
