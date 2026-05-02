import { GoogleGenAI } from '@google/genai';
import type { ChatMessage, CoachingResult } from '../types';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const extractJSON = (text: string): string => {
  const match = text.match(/```(?:json)?\n([\s\S]*?)\n```/);
  if (match) return match[1].trim();
  return text.replace(/```json|```/g, '').trim();
};

export interface CoachingContext {
  relation: string;
  goal: string;
  situation: string;
  history: string;
  personas: string[];
  temperature: number;
}

export const getCoachingResult = async (context: CoachingContext, history: ChatMessage[], images: File[] = [], pastLogs: any[] = []): Promise<CoachingResult> => {
  if (!ai) throw new Error("환경변수 VITE_GEMINI_API_KEY가 설정되지 않았습니다.");
  
  let parts: any[] = [];
  
  if (images.length > 0) {
    for (const file of images) {
       const base64 = await new Promise<string>((resolve) => {
         const reader = new FileReader();
         reader.onloadend = () => {
           resolve((reader.result as string).split(',')[1]);
         };
         reader.readAsDataURL(file);
       });
       parts.push({ inlineData: { data: base64, mimeType: file.type } });
    }
  }
  
  const historyText = history.map(h => `${h.role === 'user' ? '나' : '상대방'}: ${h.content}`).join('\n');
  const promptText = `
당신은 최고의 소통 코치입니다.
다음 상황과 대화 내역을 분석하여 가장 지혜로운 대처 방안을 제시해주세요.

[상황 분석 데이터]
- 대상과의 관계: ${context.relation}
- 소통 목표: ${context.goal}
- 서로의 히스토리 (과거 서사): ${context.history || '없음'}
- 구체적인 상황: ${context.situation}
- 나의 페르소나 (보여지고 싶은 이미지): ${context.personas.length > 0 ? context.personas.join(', ') : '특별히 없음'}
- 메시지 온도 (1 차가움 ~ 5 우호적): ${context.temperature}단계

[과거 코칭 이력 (장기 기억)]:
${pastLogs.length > 0 ? pastLogs.map(l => `- [${new Date(l.created_at).toLocaleDateString()}] 상황: ${l.situation}\n  AI 분석: ${l.result.analysis}`).join('\n') : '없음'}

[대화 내역 (시뮬레이터 내역 포함)]:
${historyText ? historyText : '(대화 내역 없음)'}

반드시 아래 JSON 형식으로만 응답하세요. 다른 설명은 포함하지 마세요.
{
  "analysis": "상황에 대한 핵심 분석",
  "image_analysis": "첨부된 이미지가 있다면 이미지 속 대화 내용 요약 및 분석 (없으면 null)",
  "guidelines": ["행동 지침 1", "행동 지침 2"],
  "cautions": ["주의해야 할 점 1", "주의해야 할 점 2"],
  "recommendations": ["추천하는 메시지 답변 1", "추천하는 메시지 답변 2"]
}
`;
  parts.push({ text: promptText });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: parts }],
      config: {
         temperature: 0.7
      }
    });
    
    const jsonStr = extractJSON(response.text || "{}");
    return JSON.parse(jsonStr) as CoachingResult;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`AI 오류: ${error.message || "응답 형식이 올바르지 않거나 네트워크 오류가 발생했습니다."}`);
  }
};

export const simulateChat = async (history: ChatMessage[], newMessage: string, profile: any, pastLogs: any[] = []): Promise<string> => {
    if (!ai) throw new Error("환경변수 VITE_GEMINI_API_KEY가 설정되지 않았습니다.");
    
    try {
      const systemPrompt = `당신은 다음 프로필을 가진 사람을 연기하는 롤플레잉 챗봇입니다:
이름: ${profile.name}
MBTI: ${profile.mbti || '알 수 없음'}
페르소나/특징: ${profile.persona || '평범함'}

[과거 대화 맥락 및 히스토리]:
${pastLogs.length > 0 ? pastLogs.map(l => `- 상황: ${l.situation}`).join('\n') : '없음'}

상대방의 평소 말투와 이모티콘 습관을 반영하여 짧고 자연스럽게 대답하세요. 절대로 AI라는 것을 티내지 마세요.`;

    const contents = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
    }));
    contents.push({ role: 'user', parts: [{ text: newMessage }] });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{text: systemPrompt}] },
            ...contents
        ],
    });

    return response.text || '';
  } catch (error: any) {
    console.error("Simulate Chat Error:", error);
    throw new Error(`AI 오류: ${error.message}`);
  }
};
