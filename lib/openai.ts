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
