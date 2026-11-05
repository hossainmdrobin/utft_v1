'use client';
import { useState, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCreateConversationMutation } from '@/store/slices/chatSlice/api.chat';
import { useAgentStream } from '@/lib/ai_service/use-agent-stream';
import { createAgent } from 'langchain';

export default function MessageInput({
  onSend,
  value,
  onChange
}: {
  onSend: (text: string) => void;
  value?: string;
  onChange?: (text: string) => void;
}) {
  const params = useParams()
  const chatId = params.chatId as string
  const [createChat, { data, isLoading }] = useCreateConversationMutation();
  const { runAgentStream } = useAgentStream();
  const [internalText, setInternalText] = useState('');
  const text = value !== undefined ? value : internalText;
  const setText = onChange || setInternalText;

  const handleSend = () => {
    if (!text.trim()) return;

    if (!chatId) createChat({ message: text })
    if (chatId)
      onSend(text.trim());
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
    if(chatId) runAgentStream(chatId,text)
      if(!chatId) createChat({prompt:text})
  }

  return (
    <div className="flex items-end gap-2 border-t bg-transparent px-4 py-3 absolute bottom-0 right-0 left-0">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
        rows={1}
        placeholder="Type a message..."
        className="max-h-32 flex-1 py-3 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
      />
      <button
        onClick={() => callAgent()}
        disabled={!text.trim()}
        className="rounded-full bg-blue-600 p-2 text-white disabled:opacity-40"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
}
