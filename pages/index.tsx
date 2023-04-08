import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import { Promptbar } from '@/components/Promptbar/Promptbar';
import { ChatBody, Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { ErrorMessage } from '@/types/error';
import { LatestExportFormat, SupportedExportFormats } from '@/types/export';
import { Folder, FolderType } from '@/types/folder';
import {
  OpenAIModel,
  OpenAIModelID,
  OpenAIModels,
  fallbackModelID,
} from '@/types/openai';
import { Plugin, PluginKey } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { getEndpoint } from '@/utils/app/api';
import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { exportData, importData } from '@/utils/app/importExport';
import { savePrompts } from '@/utils/app/prompts';
import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface HomeProps {
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  defaultModelId: OpenAIModelID;
}

const Home: React.FC<HomeProps> = ({
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
  defaultModelId,
}) => {
  const { t } = useTranslation('chat');

  // STATE ----------------------------------------------

  const [apiKey, setApiKey] = useState<string>('');
  const [plugin_keys, setPluginKeys] = useState<PluginKey[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lightMode, setLightMode] = useState<'dark' | 'light'>('dark');
  const [messageIsStreaming, setMessageIsStreaming] = useState<boolean>(false);

  const [modelError, setModelError] = useState<ErrorMessage | null>(null);

  const [models, setModels] = useState<OpenAIModel[]>([]);

  const [folders, setFolders] = useState<Folder[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected_conversation, setSelectedConversation] =
    useState<Conversation>();
  const [currentMessage, setCurrentMessage] = useState<Message>();

  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [show_promptbar, setShowPromptbar] = useState<boolean>(true);

  // REFS ----------------------------------------------

  const stopConversationRef = useRef<boolean>(false);

  // FETCH RESPONSE ----------------------------------------------

  const handleSend = async (
    message: Message,
    deleteCount = 0,
    plugin: Plugin | null = null,
  ) => {
    if (selected_conversation) {
      let updatedConversation: Conversation;

      if (deleteCount) {
        const updatedMessages = [...selected_conversation.messages];
        for (let i = 0; i < deleteCount; i++) {
          updatedMessages.pop();
        }

        updatedConversation = {
          ...selected_conversation,
          messages: [...updatedMessages, message],
        };
      } else {
        updatedConversation = {
          ...selected_conversation,
          messages: [...selected_conversation.messages, message],
        };
      }

      setSelectedConversation(updatedConversation);
      setLoading(true);
      setMessageIsStreaming(true);

      const chatBody: ChatBody = {
        model: updatedConversation.model,
        messages: updatedConversation.messages,
        key: apiKey,
        prompt: updatedConversation.prompt,
      };

      const endpoint = getEndpoint(plugin);
      let body;

      if (!plugin) {
        body = JSON.stringify(chatBody);
      } else {
        body = JSON.stringify({
          ...chatBody,
          google_api_key: plugin_keys
            .find((key) => key.pluginId === 'google-search')
            ?.required_keys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
          google_cse_id: plugin_keys
            .find((key) => key.pluginId === 'google-search')
            ?.required_keys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
        });
      }

      const controller = new AbortController();
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body,
      });

      if (!response.ok) {
        setLoading(false);
        setMessageIsStreaming(false);
        toast.error(response.statusText);
        return;
      }

      const data = response.body;

      if (!data) {
        setLoading(false);
        setMessageIsStreaming(false);
        return;
      }

      if (!plugin) {
        if (updatedConversation.messages.length === 1) {
          const { content } = message;
          const customName =
            content.length > 30 ? content.substring(0, 30) + '...' : content;

          updatedConversation = {
            ...updatedConversation,
            name: customName,
          };
        }

        setLoading(false);

        const reader = data.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let isFirst = true;
        let text = '';

        while (!done) {
          if (stopConversationRef.current === true) {
            controller.abort();
            done = true;
            break;
          }
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          const chunkValue = decoder.decode(value);

          text += chunkValue;

          if (isFirst) {
            isFirst = false;
            const updatedMessages: Message[] = [
              ...updatedConversation.messages,
              { role: 'assistant', content: chunkValue },
            ];

            updatedConversation = {
              ...updatedConversation,
              messages: updatedMessages,
            };

            setSelectedConversation(updatedConversation);
          } else {
            const updatedMessages: Message[] = updatedConversation.messages.map(
              (message, index) => {
                if (index === updatedConversation.messages.length - 1) {
                  return {
                    ...message,
                    content: text,
                  };
                }

                return message;
              },
            );

            updatedConversation = {
              ...updatedConversation,
              messages: updatedMessages,
            };

            setSelectedConversation(updatedConversation);
          }
        }

        saveConversation(updatedConversation);

        const updatedConversations: Conversation[] = conversations.map(
          (conversation) => {
            if (conversation.id === selected_conversation.id) {
              return updatedConversation;
            }

            return conversation;
          },
        );

        if (updatedConversations.length === 0) {
          updatedConversations.push(updatedConversation);
        }

        setConversations(updatedConversations);
        saveConversations(updatedConversations);

        setMessageIsStreaming(false);
      } else {
        const { answer } = await response.json();

        const updatedMessages: Message[] = [
          ...updatedConversation.messages,
          { role: 'assistant', content: answer },
        ];

        updatedConversation = {
          ...updatedConversation,
          messages: updatedMessages,
        };

        setSelectedConversation(updatedConversation);
        saveConversation(updatedConversation);

        const updatedConversations: Conversation[] = conversations.map(
          (conversation) => {
            if (conversation.id === selected_conversation.id) {
              return updatedConversation;
            }

            return conversation;
          },
        );

        if (updatedConversations.length === 0) {
          updatedConversations.push(updatedConversation);
        }

        setConversations(updatedConversations);
        saveConversations(updatedConversations);

        setLoading(false);
        setMessageIsStreaming(false);
      }
    }
  };

  // FETCH MODELS ----------------------------------------------

  const fetchModels = async (key: string) => {
    const error = {
      title: t('Error fetching models.'),
      code: null,
      message_lines: [
        t(
          'Make sure your OpenAI API key is set in the bottom left of the sidebar.',
        ),
        t('If you completed this step, OpenAI may be experiencing issues.'),
      ],
    } as ErrorMessage;

    const response = await fetch('/api/models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
      }),
    });

    if (!response.ok) {
      try {
        const data = await response.json();
        Object.assign(error, {
          code: data.error?.code,
          message_lines: [data.error?.message],
        });
      } catch (e) {}
      setModelError(error);
      return;
    }

    const data = await response.json();

    if (!data) {
      setModelError(error);
      return;
    }

    setModels(data);
    setModelError(null);
  };

  // BASIC HANDLERS --------------------------------------------

  const handleLightMode = (mode: 'dark' | 'light') => {
    setLightMode(mode);
    localStorage.setItem('theme', mode);
  };

  const handleApiKeyChange = (apiKey: string) => {
    setApiKey(apiKey);
    localStorage.setItem('apiKey', apiKey);
  };

  const handlePluginKeyChange = (pluginKey: PluginKey) => {
    if (plugin_keys.some((key) => key.pluginId === pluginKey.pluginId)) {
      const updatedPluginKeys = plugin_keys.map((key) => {
        if (key.pluginId === pluginKey.pluginId) {
          return pluginKey;
        }

        return key;
      });

      setPluginKeys(updatedPluginKeys);

      localStorage.setItem('plugin_keys', JSON.stringify(updatedPluginKeys));
    } else {
      setPluginKeys([...plugin_keys, pluginKey]);

      localStorage.setItem(
        'plugin_keys',
        JSON.stringify([...plugin_keys, pluginKey]),
      );
    }
  };

  const handleClearPluginKey = (pluginKey: PluginKey) => {
    const updatedPluginKeys = plugin_keys.filter(
      (key) => key.pluginId !== pluginKey.pluginId,
    );

    if (updatedPluginKeys.length === 0) {
      setPluginKeys([]);
      localStorage.removeItem('plugin_keys');
      return;
    }

    setPluginKeys(updatedPluginKeys);

    localStorage.setItem('plugin_keys', JSON.stringify(updatedPluginKeys));
  };

  const handleToggleChatbar = () => {
    setShowSidebar(!showSidebar);
    localStorage.setItem('show_chatbar', JSON.stringify(!showSidebar));
  };

  const handleTogglePromptbar = () => {
    setShowPromptbar(!show_promptbar);
    localStorage.setItem('show_promptbar', JSON.stringify(!show_promptbar));
  };

  const handleExportData = () => {
    exportData();
  };

  const handleImportConversations = (data: SupportedExportFormats) => {
    const { history, folders, prompts }: LatestExportFormat = importData(data);

    setConversations(history);
    setSelectedConversation(history[history.length - 1]);
    setFolders(folders);
    setPrompts(prompts);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    saveConversation(conversation);
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];

    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folder_id: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folder_id);
    setFolders(updatedFolders);
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folder_id === folder_id) {
        return {
          ...c,
          folder_id: null,
        };
      }

      return c;
    });
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    const updatedPrompts: Prompt[] = prompts.map((p) => {
      if (p.folder_id === folder_id) {
        return {
          ...p,
          folder_id: null,
        };
      }

      return p;
    });
    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  const handleUpdateFolder = (folder_id: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folder_id) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: uuidv4(),
      name: `${t('New Conversation')}`,
      messages: [],
      model: lastConversation?.model || {
        id: OpenAIModels[defaultModelId].id,
        name: OpenAIModels[defaultModelId].name,
        max_length: OpenAIModels[defaultModelId].max_length,
        token_limit: OpenAIModels[defaultModelId].token_limit,
      },
      prompt: DEFAULT_SYSTEM_PROMPT,
      folder_id: null,
    };

    const updatedConversations = [...conversations, newConversation];

    setSelectedConversation(newConversation);
    setConversations(updatedConversations);

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    setLoading(false);
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    const updatedConversations = conversations.filter(
      (c) => c.id !== conversation.id,
    );
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    if (updatedConversations.length > 0) {
      setSelectedConversation(
        updatedConversations[updatedConversations.length - 1],
      );
      saveConversation(updatedConversations[updatedConversations.length - 1]);
    } else {
      setSelectedConversation({
        id: uuidv4(),
        name: 'New conversation',
        messages: [],
        model: OpenAIModels[defaultModelId],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folder_id: null,
      });
      localStorage.removeItem('selected_conversation');
    }
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    setSelectedConversation(single);
    setConversations(all);
  };

  const handleClearConversations = () => {
    setConversations([]);
    localStorage.removeItem('conversation_history');

    setSelectedConversation({
      id: uuidv4(),
      name: 'New conversation',
      messages: [],
      model: OpenAIModels[defaultModelId],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folder_id: null,
    });
    localStorage.removeItem('selected_conversation');

    const updatedFolders = folders.filter((f) => f.type !== 'chat');
    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  const handleEditMessage = (message: Message, messageIndex: number) => {
    if (selected_conversation) {
      const updatedMessages = selected_conversation.messages
        .map((m, i) => {
          if (i < messageIndex) {
            return m;
          }
        })
        .filter((m) => m) as Message[];

      const updatedConversation = {
        ...selected_conversation,
        messages: updatedMessages,
      };

      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      );

      setSelectedConversation(single);
      setConversations(all);

      setCurrentMessage(message);
    }
  };

  // PROMPT OPERATIONS --------------------------------------------

  const handleCreatePrompt = () => {
    const newPrompt: Prompt = {
      id: uuidv4(),
      name: `Prompt ${prompts.length + 1}`,
      description: '',
      content: '',
      model: OpenAIModels[defaultModelId],
      folder_id: null,
    };

    const updatedPrompts = [...prompts, newPrompt];

    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  const handleUpdatePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.map((p) => {
      if (p.id === prompt.id) {
        return prompt;
      }

      return p;
    });

    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.filter((p) => p.id !== prompt.id);
    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (currentMessage) {
      handleSend(currentMessage);
      setCurrentMessage(undefined);
    }
  }, [currentMessage]);

  useEffect(() => {
    if (window.innerWidth < 640) {
      setShowSidebar(false);
    }
  }, [selected_conversation]);

  useEffect(() => {
    if (apiKey) {
      fetchModels(apiKey);
    }
  }, [apiKey]);

  // ON LOAD --------------------------------------------

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme) {
      setLightMode(theme as 'dark' | 'light');
    }

    const apiKey = localStorage.getItem('apiKey');
    if (serverSideApiKeyIsSet) {
      fetchModels('');
      setApiKey('');
      localStorage.removeItem('apiKey');
    } else if (apiKey) {
      setApiKey(apiKey);
      fetchModels(apiKey);
    }

    const plugin_keys = localStorage.getItem('plugin_keys');
    if (serverSidePluginKeysSet) {
      setPluginKeys([]);
      localStorage.removeItem('plugin_keys');
    } else if (plugin_keys) {
      setPluginKeys(JSON.parse(plugin_keys));
    }

    if (window.innerWidth < 640) {
      setShowSidebar(false);
    }

    const show_chatbar = localStorage.getItem('show_chatbar');
    if (show_chatbar) {
      setShowSidebar(show_chatbar === 'true');
    }

    const show_promptbar = localStorage.getItem('show_promptbar');
    if (show_promptbar) {
      setShowPromptbar(show_promptbar === 'true');
    }

    const folders = localStorage.getItem('folders');
    if (folders) {
      setFolders(JSON.parse(folders));
    }

    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      setPrompts(JSON.parse(prompts));
    }

    const conversation_history = localStorage.getItem('conversation_history');
    if (conversation_history) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversation_history);
      const cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );
      setConversations(cleanedConversationHistory);
    }

    const selected_conversation = localStorage.getItem('selected_conversation');
    if (selected_conversation) {
      const parsedSelectedConversation: Conversation =
        JSON.parse(selected_conversation);
      const cleanedSelectedConversation = cleanSelectedConversation(
        parsedSelectedConversation,
      );
      setSelectedConversation(cleanedSelectedConversation);
    } else {
      setSelectedConversation({
        id: uuidv4(),
        name: 'New conversation',
        messages: [],
        model: OpenAIModels[defaultModelId],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folder_id: null,
      });
    }
  }, [serverSideApiKeyIsSet]);

  return (
    <>
      <Head>
        <title>Chatbot UI</title>
        <meta name="description" content="ChatGPT but better." />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {selected_conversation && (
        <main
          className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
        >
          <div className="fixed top-0 w-full sm:hidden">
            <Navbar
              selected_conversation={selected_conversation}
              onNewConversation={handleNewConversation}
            />
          </div>

          <div className="flex h-full w-full pt-[48px] sm:pt-0">
            {showSidebar ? (
              <div>
                <Chatbar
                  loading={messageIsStreaming}
                  conversations={conversations}
                  lightMode={lightMode}
                  selected_conversation={selected_conversation}
                  apiKey={apiKey}
                  serverSideApiKeyIsSet={serverSideApiKeyIsSet}
                  plugin_keys={plugin_keys}
                  serverSidePluginKeysSet={serverSidePluginKeysSet}
                  folders={folders.filter((folder) => folder.type === 'chat')}
                  onToggleLightMode={handleLightMode}
                  onCreateFolder={(name) => handleCreateFolder(name, 'chat')}
                  onDeleteFolder={handleDeleteFolder}
                  onUpdateFolder={handleUpdateFolder}
                  onNewConversation={handleNewConversation}
                  onSelectConversation={handleSelectConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onUpdateConversation={handleUpdateConversation}
                  onApiKeyChange={handleApiKeyChange}
                  onClearConversations={handleClearConversations}
                  onExportConversations={handleExportData}
                  onImportConversations={handleImportConversations}
                  onPluginKeyChange={handlePluginKeyChange}
                  onClearPluginKey={handleClearPluginKey}
                />

                <button
                  className="fixed top-5 left-[270px] z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:left-[270px] sm:h-8 sm:w-8 sm:text-neutral-700"
                  onClick={handleToggleChatbar}
                >
                  <IconArrowBarLeft />
                </button>
                <div
                  onClick={handleToggleChatbar}
                  className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-70 sm:hidden"
                ></div>
              </div>
            ) : (
              <button
                className="fixed top-2.5 left-4 z-50 h-7 w-7 text-white hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:left-4 sm:h-8 sm:w-8 sm:text-neutral-700"
                onClick={handleToggleChatbar}
              >
                <IconArrowBarRight />
              </button>
            )}

            <div className="flex flex-1">
              <Chat
                conversation={selected_conversation}
                messageIsStreaming={messageIsStreaming}
                apiKey={apiKey}
                serverSideApiKeyIsSet={serverSideApiKeyIsSet}
                defaultModelId={defaultModelId}
                modelError={modelError}
                models={models}
                loading={loading}
                prompts={prompts}
                onSend={handleSend}
                onUpdateConversation={handleUpdateConversation}
                onEditMessage={handleEditMessage}
                stopConversationRef={stopConversationRef}
              />
            </div>

            {show_promptbar ? (
              <div>
                <Promptbar
                  prompts={prompts}
                  folders={folders.filter((folder) => folder.type === 'prompt')}
                  onCreatePrompt={handleCreatePrompt}
                  onUpdatePrompt={handleUpdatePrompt}
                  onDeletePrompt={handleDeletePrompt}
                  onCreateFolder={(name) => handleCreateFolder(name, 'prompt')}
                  onDeleteFolder={handleDeleteFolder}
                  onUpdateFolder={handleUpdateFolder}
                />
                <button
                  className="fixed top-5 right-[270px] z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:right-[270px] sm:h-8 sm:w-8 sm:text-neutral-700"
                  onClick={handleTogglePromptbar}
                >
                  <IconArrowBarRight />
                </button>
                <div
                  onClick={handleTogglePromptbar}
                  className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-70 sm:hidden"
                ></div>
              </div>
            ) : (
              <button
                className="fixed top-2.5 right-4 z-50 h-7 w-7 text-white hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:right-4 sm:h-8 sm:w-8 sm:text-neutral-700"
                onClick={handleTogglePromptbar}
              >
                <IconArrowBarLeft />
              </button>
            )}
          </div>
        </main>
      )}
    </>
  );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
      ) &&
      process.env.DEFAULT_MODEL) ||
    fallbackModelID;

  let serverSidePluginKeysSet = false;

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const google_cse_id = process.env.GOOGLE_CSE_ID;

  if (googleApiKey && google_cse_id) {
    serverSidePluginKeysSet = true;
  }

  return {
    props: {
      serverSideApiKeyIsSet: !!process.env.OPENAI_API_KEY,
      defaultModelId,
      serverSidePluginKeysSet,
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'markdown',
        'promptbar',
      ])),
    },
  };
};
