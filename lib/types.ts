// lib/types.ts
export interface CompletionRequest {
  chatId: string;
  model: string;
  modelCount: number;
  assetIds: string[];
  type: string;
  groupId: string;
  prompt: string;
  assistantMessageId: string;
}

export interface ChatRequest {
  id: string;
  title: string;
  folderId: string | null;
}

export interface ProxyRequest {
  url: string;
  method: string;
  data: any;
  authToken: string;
}

export type ResponseType = 'success' | 'error' | '';

export interface AIModel {
  value: string;
  label: string;
  category: 'premium' | 'free';
  icon: string;
}

export const AI_MODELS: AIModel[] = [
  { value: 'claude', label: 'Claude Sonnet 4', category: 'premium', icon: '🤖' },
  { value: 'gpt-4', label: 'GPT-4', category: 'premium', icon: '🧠' },
  { value: 'gpt-3.5', label: 'ChatGPT 3.5', category: 'free', icon: '💬' },
  { value: 'gemini', label: 'Gemini Pro', category: 'premium', icon: '✨' },
  { value: 'deepseek', label: 'DeepSeek', category: 'free', icon: '🔍' },
  { value: 'perplexity', label: 'Perplexity Sonar Pro', category: 'premium', icon: '🔮' },
  { value: 'grok', label: 'Grok 4', category: 'premium', icon: '⚡' }
];
