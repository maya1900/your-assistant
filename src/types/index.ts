export type Role = 'system' | 'user' | 'assistant';

export type MessageStatus = 'streaming' | 'done' | 'error' | 'aborted';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  status?: MessageStatus;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  systemPrompt?: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  baseURL: string;
  apiKey: string;
  model: string;
  temperature: number;
  defaultSystemPrompt: string;
}
