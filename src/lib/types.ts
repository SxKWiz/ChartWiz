
export interface RecommendationItem {
  value: string;
  reason: string;
}

export interface Recommendation {
  entryPrice: RecommendationItem;
  takeProfit: RecommendationItem[];
  stopLoss: RecommendationItem;
  riskRewardRatio?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content?: React.ReactNode;
  imagePreviews?: string[];
  imageFiles?: File[];
  recommendation?: Recommendation;
  alternativeScenario?: string;
  audioDataUri?: string;
  isSoundEnabled?: boolean;
  personaDescription?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  isCustom: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  personaId: string;
  timestamp: number;
}
