import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, updateCandidate } from '@/lib/candidates';

export async function POST(req: NextRequest) {
  try {
    const { toEmail, candidateName, candidateId, subject, replyText } = await req.json();

    if (!toEmail || !replyText) {
      return NextResponse.json(
        { success: false, message: 'Missing recipient email or reply content' },
        { status: 400 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    const emailSender = process.env.EMAIL_USER || 'DataCrumbs <careers@datacrumbs.org>';
    const emailCc = process.env.CC_USER || 'people@datacrumbs.org';

    // Format plain text into HTML paragraphs
    const formattedHtml = replyText
      .split('\n')
      .map((paragraph: string) => paragraph.trim())
      .filter((paragraph: string) => paragraph.length > 0)
      .map((paragraph: string) => `<p style="font-size: 15px; line-height: 1.6; margin-bottom: 12px; color: #334155;">${paragraph}</p>`)
      .join('');

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        ${formattedHtml}
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: emailSender,
        to: [toEmail],
        cc: [emailCc],
        subject: subject || `Re: DataCrumbs ChangeMaker Internship Program - ${candidateName || 'Candidate'}`,
        html: emailHtml
      })
    });

    const data = await res.json();

    if (res.ok) {
      const candidates = getCandidates();
      const cand = candidates.find(
        (c) => (candidateId && c.id === candidateId) || c.email.toLowerCase() === toEmail.toLowerCase()
      );

      const nowIso = new Date().toISOString();
      if (cand) {
        updateCandidate(cand.id, {
          replySent: true,
          replySentDate: nowIso,
          lastSentDraft: replyText
        });
      }

      return NextResponse.json({
        success: true,
        message: `Reply email successfully sent to ${toEmail} (CC: ${emailCc})`,
        resendId: data.id,
        replySent: true,
        replySentDate: nowIso
      });
    } else {
      return NextResponse.json(
        { success: false, message: data.message || 'Failed to send reply email via Resend' },
        { status: res.status }
      );
    }
  } catch (error: any) {
    console.error('Error sending reply email:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error while sending email' },
      { status: 500 }
    );
  }
}
