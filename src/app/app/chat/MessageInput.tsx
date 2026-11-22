'use client';

import { useState, KeyboardEvent, useEffect } from 'react';
import { Send } from 'lucide-react';
import { redirect, useParams } from 'next/navigation';
import { useCreateConversationMutation } from '@/store/slices/chatSlice/api.chat';
import ModelSelector from './ModelSelector';

export default function MessageInput({
  onSend,
  value,
  onChange,
  setCurrentMessage,
  selectedModel,
  onSelectModel,
  availableModels,
}: {
  onSend: (chatId: string, text: string) => Promise<boolean>;
  value?: string;
  onChange?: (text: string) => void;
  setCurrentMessage: (text: string) => void;
  selectedModel?: string;
  onSelectModel?: (model: string) => void;
  availableModels?: string[];
}) {
  const params = useParams();
  const chatId = params?.chatId as string;
  const [createChat, { data }] = useCreateConversationMutation();
  const [internalText, setInternalText] = useState('');
  const text = value !== undefined ? value : internalText;
  const setText = onChange || setInternalText;

  const handleSend = () => {
    if (!text.trim()) return;

    if (!chatId) createChat({ prompt: text, model: selectedModel });
    if (chatId) {
      onSend(chatId, text.trim());
    }
    if (value === undefined) {
      setInternalText('');
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const callAgent = () => {
    if (chatId) onSend(chatId, text);
    if (!chatId) createChat({ prompt: text, model: selectedModel });
    setCurrentMessage(text);
    setInternalText('');
  };

  useEffect(() => {
    if (data) redirect(`/app/chat/${data?.data?._id}`);
  }, [data]);

  return (
    <div className="flex flex-col gap-1.5 border-t bg-background/95 backdrop-blur-sm px-4 py-2.5 absolute bottom-0 right-0 left-0">
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Type a message..."
            className="max-h-32 w-full resize-none bg-transparent text-sm focus:outline-none text-gray-700 placeholder:text-gray-400"
          />
          {onSelectModel && selectedModel && (
            <div className="flex items-center pt-1">
              <ModelSelector
                selectedModel={selectedModel}
                onSelectModel={onSelectModel}
                availableModels={availableModels || []}
                compact
              />
            </div>
          )}
        </div>
        <button
          onClick={() => callAgent()}
          disabled={!text.trim()}
          className="rounded-full bg-blue-600 p-2.5 text-white disabled:opacity-40 transition-colors hover:bg-blue-700"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
