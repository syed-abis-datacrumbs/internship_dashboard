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
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 10px;">
        <h2 style="color: #059669;">DataCrumbs Internship Offer Reminder</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>We hope this email finds you well.</p>
        <p>This is a friendly reminder regarding your official internship offer for the <strong>${domain || 'DataCrumbs Internship Program'}</strong>. We recently sent over your offer details and are looking forward to receiving your response.</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
          <h4 style="margin: 0 0 10px 0; color: #065f46;">Next Steps:</h4>
          <ol style="margin: 0; padding-left: 20px; color: #047857;">
            <li>Review the offer letter details sent to this email address.</li>
            <li>Reply to this email directly with your confirmation or signed offer letter copy.</li>
            <li>If you have any questions or require clarifications, reply to us directly.</li>
          </ol>
        </div>

        <p>Please respond at your earliest convenience to reserve your internship slot.</p>
        <br/>
        <p style="margin-bottom: 0;">Warm regards,</p>
        <p style="margin-top: 5px;"><strong>Team DataCrumbs</strong><br/><span style="font-size: 12px; color: #666;">Empowering Future Innovators</span></p>
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
