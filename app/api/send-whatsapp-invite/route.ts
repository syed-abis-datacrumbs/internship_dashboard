import { NextRequest, NextResponse } from 'next/server';
import { getCandidates, updateCandidate } from '@/lib/candidates';
import { getCandidatesFromSupabase, upsertCandidateToSupabase } from '@/lib/supabaseCandidateService';

export async function POST(req: NextRequest) {
  try {
    const { candidateIds, customMessage, subject } = await req.json();

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No candidate IDs provided' },
        { status: 400 }
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    // Explicitly set sender to careers@datacrumbs.org and CC to people@datacrumbs.org
    const emailSender = 'DataCrumbs <careers@datacrumbs.org>';
    const emailCc = 'people@datacrumbs.org';

    let allCandidates = await getCandidatesFromSupabase();
    if (!allCandidates || allCandidates.length === 0) {
      allCandidates = getCandidates();
    }

    const targets = allCandidates.filter((c) => candidateIds.includes(c.id));

    if (targets.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No matching candidates found' },
        { status: 404 }
      );
    }

    const sentTo: string[] = [];
    const errors: string[] = [];
    const whatsappLink = 'https://chat.whatsapp.com/EETyPU6dheJLTDdTRKvOQA';
    const defaultSubject = 'Welcome to the Team! Join our Official WhatsApp Group 🚀';

    for (const cand of targets) {
      const emailText = customMessage
        ? customMessage.replace(/\[Candidate Name\]/g, cand.name)
        : `Hi ${cand.name},

Congratulations once again on accepting your offer! We are thrilled to officialize your joining and can't wait to have you onboard.

To help you connect with your fellow cohort members, receive real-time updates regarding orientation, and easily reach out to our team, we have set up an official WhatsApp group.

👉 Join the WhatsApp Group here:
${whatsappLink}

Next Steps upon joining:
1. Introduce yourself with your Name and Domain (${cand.domain}).
2. Keep an eye out for upcoming onboarding announcements and schedule details.

If you face any issues joining the group or have any questions, feel free to reply directly to this email.

Welcome aboard, and we look forward to working with you!

Best regards,
DataCrumbs HR Team`;

      // Format plain text to HTML paragraphs
      const formattedHtml = emailText
        .split('\n')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0)
        .map((p: string) => {
          if (p.includes('https://chat.whatsapp.com')) {
            return `<p style="font-size: 16px; line-height: 1.6; margin: 16px 0; text-align: center;">
              <a href="${whatsappLink}" style="display: inline-block; background-color: #25D366; color: #ffffff; font-weight: bold; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                👉 Join Official WhatsApp Group
              </a>
            </p>`;
          }
          return `<p style="font-size: 15px; line-height: 1.6; margin-bottom: 12px; color: #334155;">${p}</p>`;
        })
        .join('');

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin: 0; font-size: 22px;">DataCrumbs Internship Program</h2>
            <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Official Candidate Onboarding</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />
          ${formattedHtml}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 24px; margin-bottom: 16px;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            DataCrumbs AI • <a href="mailto:people@datacrumbs.org" style="color: #64748b;">people@datacrumbs.org</a>
          </p>
        </div>
      `;

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: emailSender,
            to: [cand.email],
            cc: [emailCc],
            subject: subject || defaultSubject,
            html: emailHtml
          })
        });

        const data = await res.json();

        if (res.ok) {
          const nowIso = new Date().toISOString();
          const updates = {
            whatsappSent: true,
            whatsappSentDate: nowIso,
            lastSentDraft: emailText
          };

          // Update local store
          updateCandidate(cand.id, updates);

          // Update Supabase production database directly
          await upsertCandidateToSupabase({
            ...cand,
            ...updates
          });

          sentTo.push(cand.email);
        } else {
          console.error(`Failed to send email to ${cand.email}:`, data);
          errors.push(`${cand.name} (${cand.email}): ${data.message || 'Resend error'}`);
        }
      } catch (err: any) {
        console.error(`Exception sending email to ${cand.email}:`, err);
        errors.push(`${cand.name} (${cand.email}): ${err.message}`);
      }
    }

    return NextResponse.json({
      success: sentTo.length > 0,
      count: sentTo.length,
      sentTo,
      errors,
      from: emailSender,
      cc: emailCc,
      message: `Successfully sent WhatsApp onboarding email to ${sentTo.length} candidate(s) from ${emailSender} (CC: ${emailCc}).`
    });
  } catch (error: any) {
    console.error('Error in send-whatsapp-invite handler:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
