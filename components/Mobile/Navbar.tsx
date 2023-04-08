import { Conversation } from '@/types/chat';
import { IconPlus } from '@tabler/icons-react';
import { FC } from 'react';

interface Props {
  selected_conversation: Conversation;
  onNewConversation: () => void;
}

export const Navbar: FC<Props> = ({
  selected_conversation,
  onNewConversation,
}) => {
  return (
    <nav className="flex w-full justify-between bg-[#202123] py-3 px-4">
      <div className="mr-4"></div>

      <div className="max-w-[240px] overflow-hidden text-ellipsis whitespace-nowrap">
        {selected_conversation.name}
      </div>

      <IconPlus
        className="cursor-pointer hover:text-neutral-400 mr-8"
        onClick={onNewConversation}
      />
    </nav>
  );
};
