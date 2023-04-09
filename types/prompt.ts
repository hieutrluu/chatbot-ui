import { OpenAIModel } from './openai';

export interface Prompt {
  name: string;
  doc_name: string;
  description: string;
  content: string;
  model?: string;
  folderId: string | null;
}
