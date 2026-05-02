export interface Profile {
  id: string;
  name: string;
  mbti?: string;
  persona?: string;
  temperature: number; // 1 to 5
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  isImage?: boolean;
}

export interface CoachingResult {
  analysis: string;
  image_analysis?: string;
  guidelines: string[];
  cautions: string[];
  recommendations: string[];
}

export interface CoachingLog {
  id: string;
  profile_id: string;
  situation: string;
  result: CoachingResult;
  created_at: string;
}
