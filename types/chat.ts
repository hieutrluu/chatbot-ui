import { OpenAIModel } from './openai';

export interface Message {
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
}

export interface Conversation {
  name: string;
  doc_name: string;
  messages: Message[];
  model: OpenAIModel;
  prompt: string;
  folderId: string | null;
}
