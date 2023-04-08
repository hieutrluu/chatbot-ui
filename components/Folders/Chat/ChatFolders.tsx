import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { Folder } from '@/types/folder';
import { FC } from 'react';
import { ChatFolder } from './ChatFolder';

interface Props {
  searchTerm: string;
  conversations: Conversation[];
  folders: Folder[];
  onDeleteFolder: (folder: string) => void;
  onUpdateFolder: (folder: string, name: string) => void;
  // conversation props
  selected_conversation: Conversation;
  loading: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
}

export const ChatFolders: FC<Props> = ({
  searchTerm,
  conversations,
  folders,
  onDeleteFolder,
  onUpdateFolder,
  // conversation props
  selected_conversation,
  loading,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversation,
}) => {
  return (
    <div className="flex w-full flex-col pt-2">
      {folders.map((folder, index) => (
        <ChatFolder
          key={index}
          searchTerm={searchTerm}
          conversations={conversations.filter((c) => c.folder_id)}
          currentFolder={folder}
          onDeleteFolder={onDeleteFolder}
          onUpdateFolder={onUpdateFolder}
          // conversation props
          selected_conversation={selected_conversation}
          loading={loading}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
          onUpdateConversation={onUpdateConversation}
        />
      ))}
    </div>
  );
};
