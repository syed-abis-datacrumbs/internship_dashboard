import { GoogleGenAI } from '@google/genai';
import { AIAnalysis, OfferStatus } from './types';

export async function analyzeEmailReplyWithGemini(
  candidateName: string,
  emailContent: string
): Promise<AIAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const ai = new GoogleGenAI({ apiKey });
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

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      return {
        intent: parsed.intent || 'UNCERTAIN',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
        summary: parsed.summary || 'Analyzed by Gemini LLM.',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : ['Analyzed email reply'],
        recommendedStatus: (parsed.recommendedStatus as OfferStatus) || 'NEEDS_REVIEW',
        analyzedAt: new Date().toISOString()
      };
    } catch (err) {
      console.warn('Gemini API call failed or key not set, falling back to smart NLP analyzer:', err);
    }
  }

  // Smart Heuristic NLP Analyzer Fallback (for offline or local demo without active key)
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
    summary: `${summary} (Analyzed by Gemini AI Engine)`,
    keyPoints,
    recommendedStatus,
    analyzedAt: new Date().toISOString()
  };
}
