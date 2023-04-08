import { Conversation } from './chat';
import { Folder } from './folder';
import { PluginKey } from './plugin';
import { Prompt } from './prompt';

// keep track of local storage schema
export interface LocalStorage {
  apiKey: string;
  conversation_history: Conversation[];
  selected_conversation: Conversation;
  theme: 'light' | 'dark';
  // added folders (3/23/23)
  folders: Folder[];
  // added prompts (3/26/23)
  prompts: Prompt[];
  // added show_chatbar and show_promptbar (3/26/23)
  show_chatbar: boolean;
  show_promptbar: boolean;
  // added plugin keys (4/3/23)
  plugin_keys: PluginKey[];
}
