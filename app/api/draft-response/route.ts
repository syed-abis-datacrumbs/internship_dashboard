import { NextRequest, NextResponse } from 'next/server';
import { generateDraftResponseWithOpenAI } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const { candidateName, candidateEmail, domain, emailContent, intent, summary, tonePreset } = await req.json();

    if (!candidateName || !emailContent) {
      return NextResponse.json(
        { success: false, message: 'Missing candidate details or email content' },
        { status: 400 }
      );
    }

    const draft = await generateDraftResponseWithOpenAI(
      candidateName || 'Candidate',
      candidateEmail || '',
      domain || 'ChangeMaker Program',
      emailContent,
      intent || 'UNCERTAIN',
      summary || '',
      tonePreset || 'auto'
    );

    return NextResponse.json({
      success: true,
      draftResponse: draft
    });
  } catch (error: any) {
    console.error('Error generating AI draft response:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate AI draft response' },
      { status: 500 }
    );
  }
}
