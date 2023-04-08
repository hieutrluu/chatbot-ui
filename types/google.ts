import { ChatBody, Message } from './chat';

export interface GoogleBody extends ChatBody {
  google_api_key: string;
  google_cse_id: string;
}

export interface GoogleResponse {
  message: Message;
}

export interface GoogleSource {
  title: string;
  link: string;
  displayLink: string;
  snippet: string;
  image: string;
  text: string;
}
