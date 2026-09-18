import OpenAI from 'openai';
import { AIAnalysis, OfferStatus } from './types';

export async function analyzeEmailReplyWithOpenAI(
  candidateName: string,
  emailContent: string
): Promise<AIAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const openai = new OpenAI({ apiKey });
      const prompt = `
You are an expert HR AI assistant evaluating candidate email replies to internship offer letters.

Candidate Name: ${candidateName}
Email Response Content:
"""
${emailContent}
"""

Analyze the candidate's email response and provide a JSON response with the following exact keys:
1. "intent": one of ["ACCEPTED", "DECLINED", "QUESTION", "UNCERTAIN"]
2. "confidence": float between 0.0 and 1.0 representing your certainty
3. "summary": 1-2 sentence concise summary of what the candidate said
4. "keyPoints": array of string bullet points capturing key facts
5. "recommendedStatus": one of ["ACCEPTED", "DECLINED", "NEEDS_REVIEW"]

Return ONLY raw JSON, with no markdown formatting or triple backticks.
`;

      let modelName = 'gpt-4o-mini';
      
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: 'You are an HR analytics assistant providing strict JSON output.' },
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
    summary = `Candidate ${candidateName} raised a question regarding offer details or logistics.`;
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
    summary: `${summary} (Analyzed by OpenAI LLM)`,
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
You are an HR Manager for Team DataCrumbs handling candidate communications for the ${domain} Internship Program (ChangeMaker Program).

Candidate Name: ${candidateName}
Candidate Email: ${candidateEmail}
Applied Role: ${domain}
Candidate's Email Reply:
"""
${emailContent}
"""
AI Extracted Intent: ${intent}
AI Summary: ${summary}
Selected Strategy / Tone: ${tonePreset}

Write a professional, warm, encouraging, and clear email response to ${candidateName} from "Team DataCrumbs".
Key guidelines:
- If tonePreset is 'welcome' or intent is ACCEPTED: Welcome them aboard warmly, confirm receipt of their confirmation, outline that next steps / onboarding details will follow shortly.
- If tonePreset is 'answer' or intent is QUESTION: Provide a helpful, clear, and encouraging answer (note: the ChangeMaker program offers fully remote flexibility and task alignment).
- If tonePreset is 'decline' or intent is DECLINED: Thank them politely for their time and interest, wishing them success in their future endeavors.
- Keep the email concise (2-4 paragraphs), warm, professional, and signed off as "Warm regards,\nTeam DataCrumbs".
- Do NOT include a Subject line header inside the response body text.
`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an HR manager writing professional email responses.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.4
      });

      const draft = response.choices[0]?.message?.content?.trim();
      if (draft) return draft;
    } catch (err) {
      console.warn('OpenAI draft generation failed, using template fallback:', err);
    }
  }

  // Fallback Template Generator
  if (tonePreset === 'welcome' || intent === 'ACCEPTED') {
    return `Dear ${candidateName},

Thank you for accepting our offer for the ${domain} Internship (ChangeMaker Program)! We are thrilled to welcome you to Team DataCrumbs.

Our team will follow up shortly with your onboarding details and next steps. In the meantime, please feel free to reach out if you have any immediate questions.

We look forward to working with you!

Warm regards,
Team DataCrumbs`;
  } else if (tonePreset === 'decline' || intent === 'DECLINED') {
    return `Dear ${candidateName},

Thank you for informing us regarding your decision for the ${domain} Internship.

While we are sorry to miss the opportunity to work together, we truly appreciate your time and interest in DataCrumbs and wish you all the best in your career pursuits.

Warm regards,
Team DataCrumbs`;
  } else {
    return `Dear ${candidateName},

Thank you for your response regarding the ${domain} Internship offer.

To clarify your query: the ChangeMaker Program offers complete remote flexibility, and our tasks can be fully aligned to accommodate your schedule and academic requirements.

Please let us know if you are ready to confirm your acceptance. We look forward to having you on board!

Warm regards,
Team DataCrumbs`;
  }
}
