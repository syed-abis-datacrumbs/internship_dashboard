import { NextRequest, NextResponse } from 'next/server';
import { analyzeEmailReplyWithOpenAI } from '@/lib/openai';
import { updateCandidate, getCandidates } from '@/lib/candidates';

export async function POST(req: NextRequest) {
  try {
    const { candidateId, emailReply } = await req.json();

    if (!candidateId || !emailReply) {
      return NextResponse.json(
        { success: false, message: 'Missing candidateId or emailReply' },
        { status: 400 }
      );
    }

    const candidates = getCandidates();
    const candidate = candidates.find((c) => c.id === candidateId);

    if (!candidate) {
      return NextResponse.json(
        { success: false, message: 'Candidate not found' },
        { status: 404 }
      );
    }

    // Call OpenAI LLM to analyze reply intent using the env key
    const aiAnalysis = await analyzeEmailReplyWithOpenAI(candidate.name, emailReply);

    // Automatically update candidate status based on AI recommendation
    const updatedCandidate = updateCandidate(candidateId, {
      emailReply,
      aiAnalysis,
      status: aiAnalysis.recommendedStatus,
      responseDate: new Date().toISOString().split('T')[0]
    });

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      candidate: updatedCandidate
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error analyzing reply with OpenAI' },
      { status: 500 }
    );
  }
}
