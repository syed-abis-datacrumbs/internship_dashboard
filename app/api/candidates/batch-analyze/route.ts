import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, updateCandidate } from '@/lib/candidates';
import { analyzeEmailReplyWithOpenAI } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const candidates = getCandidates();
    const updatedList = [];

    // Filter candidates with existing email replies or mock replies
    for (const cand of candidates) {
      if (cand.emailReply && cand.emailReply.trim().length > 0) {
        // Run OpenAI analysis on existing reply
        const aiAnalysis = await analyzeEmailReplyWithOpenAI(cand.name, cand.emailReply);
        const updated = updateCandidate(cand.id, {
          aiAnalysis,
          status: aiAnalysis.recommendedStatus,
          responseDate: cand.responseDate || new Date().toISOString().split('T')[0]
        });
        if (updated) updatedList.push(updated);
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: updatedList.length,
      candidates: getCandidates()
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error batch processing replies' },
      { status: 500 }
    );
  }
}
