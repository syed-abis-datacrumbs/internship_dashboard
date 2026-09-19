import OpenAI from 'openai';
import { AIAnalysis, OfferStatus } from './types';
import { ANALYSIS_SYSTEM_PROMPT, COMPOSER_SYSTEM_PROMPT, PROGRAM_CONFIG } from '@/config/system_prompts';

export async function analyzeEmailReplyWithOpenAI(
  candidateName: string,
  emailContent: string
): Promise<AIAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const openai = new OpenAI({ apiKey });
      const prompt = `
Candidate Name: ${candidateName}
Candidate Email Response Content:
"""
${emailContent}
"""

Analyze the response according to system rules and return JSON.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const text = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(text);

      return {
        intent: parsed.intent || 'UNCERTAIN',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
        summary: parsed.summary || 'Analyzed by OpenAI LLM.',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ['Analyzed email reply'],
        recommendedStatus: (parsed.recommendedStatus as OfferStatus) || 'NEEDS_REVIEW',
        analyzedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn('OpenAI API call failed or key error, using heuristic fallback:', err);
    }
  }

  // Heuristic NLP Analyzer Fallback
  const lower = emailContent.toLowerCase();
  const isAccept = /accept|thrilled|glad|happy to join|looking forward|confirm my acceptance|pleased to accept|sign/i.test(lower);
  const isDecline = /decline|cannot accept|reject|other offer|another company|unable to join|withdraw/i.test(lower);
  const isQuestion = /\?|clarify|question|remote|stipend|timing|shift|defer|exam/i.test(lower);

  let intent: 'ACCEPTED' | 'DECLINED' | 'QUESTION' | 'UNCERTAIN' = 'UNCERTAIN';
  let recommendedStatus: OfferStatus = 'NEEDS_REVIEW';
  let summary = '';
  let confidence = 0.95;
  const keyPoints: string[] = [];

  if (isAccept && !isDecline) {
    intent = 'ACCEPTED';
    recommendedStatus = 'ACCEPTED';
    summary = `Candidate ${candidateName} has explicitly accepted the offer.`;
    keyPoints.push('Expressed positive acceptance', 'Confirmed joining readiness');
  } else if (isDecline) {
    intent = 'DECLINED';
    recommendedStatus = 'DECLINED';
    summary = `Candidate ${candidateName} indicated they cannot accept the offer.`;
    keyPoints.push('Declined internship position', 'Unable to fulfill offer terms');
  } else if (isQuestion) {
    intent = 'QUESTION';
    recommendedStatus = 'NEEDS_REVIEW';
    summary = `Candidate ${candidateName} raised questions regarding offer details, stipend, remote mode, or credentials.`;
    keyPoints.push('Inquired about terms/flexibility', 'Requires HR response');
    confidence = 0.88;
  } else {
    summary = `Received email reply from ${candidateName}. Intent requires human review.`;
    keyPoints.push('Unclear or custom response', 'Human review recommended');
    confidence = 0.75;
  }

  return {
    intent,
    confidence,
    summary: `${summary} (Analyzed by NLP Engine)`,
    keyPoints,
    recommendedStatus,
    analyzedAt: new Date().toISOString()
  };
}

export async function generateDraftResponseWithOpenAI(
  candidateName: string,
  candidateEmail: string,
  domain: string,
  emailContent: string,
  intent: string,
  summary: string,
  tonePreset: 'welcome' | 'answer' | 'decline' | 'auto' = 'auto'
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const openai = new OpenAI({ apiKey });
      const prompt = `
Candidate Context:
- Candidate Name: ${candidateName}
- Candidate Email: ${candidateEmail}
- Role Applied: ${domain}
- Email Reply Content:
"""
${emailContent}
"""
- Detected Intent: ${intent}
- AI Summary: ${summary}
- Tone Strategy: ${tonePreset}

Write the email response body following system prompt guidelines and FAQs.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: COMPOSER_SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4
      });

      const draft = response.choices[0]?.message?.content?.trim();
      if (draft) return draft;
    } catch (err: any) {
      console.warn('OpenAI draft generation failed, using intelligent template fallback:', err?.message || err);
    }
  }

  // Intelligent Fallback Template Generator (Extracts first name & uses complete program facts)
  const firstName = candidateName ? candidateName.trim().split(' ')[0] : 'Candidate';

  if (tonePreset === 'welcome' || intent === 'ACCEPTED') {
    return `Dear ${firstName},

Thank you for accepting our offer for the ${domain} Internship (ChangeMaker Program)! We are thrilled to welcome you to Team DataCrumbs.

During this 6-week remote program, you will be working on real-world AI projects and marketing niches under the direct mentorship of our Manager and Senior Manager.

Our team will follow up shortly with your onboarding details and next steps. In the meantime, please feel free to reach out if you have any immediate questions.

We look forward to working with you!

Warm regards,
Team DataCrumbs`;
  } else if (tonePreset === 'decline' || intent === 'DECLINED') {
    return `Dear ${firstName},

Thank you for informing us regarding your decision for the ${domain} Internship.

While we are sorry to miss the opportunity to work together, we truly appreciate your time and interest in DataCrumbs and wish you all the best in your future endeavors.

Warm regards,
Team DataCrumbs`;
  } else {
    // Detailed 5-Point Question Answer Fallback
    return `Dear ${firstName},

Thank you for your response and interest in the ${domain} Internship (ChangeMaker Program)! We are happy to clarify all your questions below:

1. Stipend & Compensation: This is an unpaid 6-week learning and project-based internship focused on gaining hands-on experience working on real-world AI projects and marketing niches.
2. Work Structure & Location: The role is 100% remote with flexible timings to easily manage your university schedule.
3. Mentorship & Deliverables: You will report directly to our Manager and Senior Manager, who will guide you on your weekly project tasks and deliverables.
4. Certification & Documentation: Upon successful completion of the 6-week program, you will receive an official Certificate of Completion along with an Experience Letter (plus university/transcript documentation verified if required).
5. Program Fees: There are absolutely zero fees, deposits, or payments required from your side at any point.

Please review the attached offer letter, sign and reply with your signed copy by your start date to confirm your spot. We look forward to having you on board!

Warm regards,
Team DataCrumbs`;
  }
}
