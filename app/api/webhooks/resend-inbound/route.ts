import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, updateCandidate } from '@/lib/candidates';
import { analyzeEmailReplyWithOpenAI } from '@/lib/openai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Resend Inbound Email Webhook payload format
    // Resend sends { from, to, subject, text, html, headers }
    const senderEmail = body.from || body.sender || '';
    const emailText = body.text || body.html || body.snippet || '';

    if (!senderEmail || !emailText) {
      return NextResponse.json(
        { success: false, message: 'Invalid Resend webhook payload' },
        { status: 400 }
      );
    }

    // Clean sender email address (e.g., "John Doe <john@example.com>" -> "john@example.com")
    const matchEmail = senderEmail.match(/<([^>]+)>/)?.[1] || senderEmail.trim();

    // Find candidate matching the sender email
    const candidates = getCandidates();
    const candidate = candidates.find(
      (c) => c.email.toLowerCase() === matchEmail.toLowerCase()
    );

    if (!candidate) {
      return NextResponse.json({
        success: true,
        message: `Received email from ${matchEmail}, but no matching candidate offer record was found.`
      });
    }

    // Process reply with OpenAI LLM
    const aiAnalysis = await analyzeEmailReplyWithOpenAI(candidate.name, emailText);

    // Auto-update candidate status in Dashboard
    const updatedCandidate = updateCandidate(candidate.id, {
      emailReply: emailText,
      aiAnalysis,
      status: aiAnalysis.recommendedStatus,
      responseDate: new Date().toISOString().split('T')[0]
    });

    return NextResponse.json({
      success: true,
      message: `Successfully processed inbound reply from ${candidate.name}`,
      candidate: updatedCandidate
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Error processing Resend webhook' },
      { status: 500 }
    );
  }
}
