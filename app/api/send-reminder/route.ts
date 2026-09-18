import { NextRequest, NextResponse } from 'next/server';
import { updateCandidate } from '@/lib/candidates';

export async function POST(req: NextRequest) {
  try {
    const { candidateId, email, name, domain } = await req.json();

    if (!email || !name) {
      return NextResponse.json({ success: false, message: 'Missing candidate email or name' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json({ success: false, message: 'RESEND_API_KEY is not configured in environment variables' }, { status: 500 });
    }
    const fromAddress = process.env.EMAIL_USER || 'DataCrumbs <people@datacrumbs.org>';

    const subject = `Reminder: Internship Offer Letter – DataCrumbs ${domain || 'Program'}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <p style="font-size: 15px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.6;">This is a friendly reminder regarding the internship offer recently sent to you for the <strong>DataCrumbs ${domain || 'ChangeMaker Program'}</strong>.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #059669; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px;">Next Steps</h4>
          <ul style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.6;">
            <li>Review the internship offer letter sent to your email.</li>
            <li>Reply to this email with your confirmation of acceptance or the signed offer letter.</li>
            <li>If you have any questions or need clarification regarding the offer, please feel free to reply to this email.</li>
          </ul>
        </div>

        <p style="font-size: 15px; line-height: 1.6;">We look forward to receiving your confirmation.</p>
        <br/>
        <p style="margin-bottom: 4px; font-size: 15px;">Warm regards,</p>
        <p style="margin-top: 0; font-size: 15px; font-weight: bold; color: #059669;">Team DataCrumbs</p>
      </div>
    `;

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'DataCrumbs <careers@datacrumbs.org>',
        to: [email],
        cc: [process.env.CC_USER || 'people@datacrumbs.org'],
        subject: subject,
        html: htmlBody
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API Error:', resendData);
      return NextResponse.json({
        success: false,
        message: resendData.message || 'Failed to send email via Resend API'
      }, { status: 500 });
    }

    // Update candidate store record if candidateId is provided
    if (candidateId) {
      updateCandidate(candidateId, {
        reminderSentDate: new Date().toISOString().split('T')[0]
      });
    }

    return NextResponse.json({
      success: true,
      message: `Reminder email successfully sent to ${name} (${email})`,
      resendId: resendData.id
    });

  } catch (error: any) {
    console.error('Send reminder error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal server error' }, { status: 500 });
  }
}
