'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useParams } from 'next/navigation';
import StartChat from './StartChat';
import { useAgentStream } from '@/lib/ai_service/use-agent-stream';
import { useGetAvailableModelsQuery, useGetMessageByChatIdQuery } from '@/store/slices/chatSlice/api.chat';
import ChatHeader from './ChatHeader';

export default function ChatWindow() {
  const params = useParams();
  const chatId = params?.chatId as string;

  const [inputValue, setInputValue] = useState('');
  const [currentMessage, setCurrentMessage] = useState('');
  const [tokenUsage, setTokenUsage] = useState<{ input: number; output: number; total: number } | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gh/gpt-5.4-nano');
  const hasStreamedInitialRef = useRef(false);

  const { data: modelsData } = useGetAvailableModelsQuery();
  const availableModels = useMemo(() => modelsData?.data || [], [modelsData?.data]);

  const { data, refetch: refetchMessage } = useGetMessageByChatIdQuery(
    { id: chatId },
    { skip: !chatId }
  );

  useEffect(() => {
    hasStreamedInitialRef.current = false;
  }, [chatId]);

  // Sync selectedModel with conversation's stored model
  useEffect(() => {
    if (data?.chat?.model) {
      setSelectedModel(data.chat.model);
    }
  }, [data?.chat?.model]);

  // Align with first available model if current not set or default and models loaded
  useEffect(() => {
    if (availableModels.length > 0 && !selectedModel) {
      setSelectedModel(availableModels[0]);
    }
  }, [availableModels, selectedModel]);

  // Custom hook for NDJSON streaming
  const { runAgentStream, events, loading: streamLoading } = useAgentStream();

  useEffect(() => {
    if (data?.data?.length === 1 && !streamLoading && !hasStreamedInitialRef.current) {
      hasStreamedInitialRef.current = true;
      runAgentStream(chatId, '', selectedModel);
    }
  }, [data?.data?.length, streamLoading, chatId, runAgentStream, selectedModel]);

  useEffect(() => {
    const isDone = events.find((item) => item.type == 'done') as
      | { type: 'done'; input_tokens?: number; output_tokens?: number; total_tokens?: number }
      | undefined;
    const isMessage = events.find((item) => item.type == 'message');
    const isThinking = events.find((item) => item.type == 'thinking');
    if (isThinking) setTokenUsage(null);
    if (isDone) {
      refetchMessage();
      if (isDone.input_tokens !== undefined) {
        setTokenUsage({ input: isDone.input_tokens, output: isDone.output_tokens, total: isDone.total_tokens });
      } else {
        setTokenUsage(null);
      }
    }
    if (isMessage) setCurrentMessage('');
  }, [events, refetchMessage]);

  const handleExamplePrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleSend = async (targetChatId: string, text: string) => {
    return await runAgentStream(targetChatId, text, selectedModel);
  };

  return (
    <div className="flex relative h-full flex-col overflow-hidden rounded-xl border bg-transparent shadow-md w-[calc(100vw-16rem)]">
      <ChatHeader
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        availableModels={availableModels}
      />
      {tokenUsage && (
        <div className="px-4 py-1.5 border border-[var(--agent-bg-sunken)]/30 bg-[var(--agent-bg-sunken)]/50 rounded-lg text-[11px] text-[var(--agent-text-muted)] flex items-center gap-4">
          <span className="flex items-center gap-1">↑ Input: {tokenUsage.input}</span>
          <span className="flex items-center gap-1">↓ Output: {tokenUsage.output}</span>
          <span className="flex items-center gap-1 font-semibold">Total: {tokenUsage.total}</span>
        </div>
      )}
      {streamLoading && <div className="p-4 text-sm text-gray-500">Loading...</div>}
      {chatId && data && <MessageList events={events} messages={data.data} currentMessage={currentMessage} />}
      {!chatId && <StartChat onExamplePrompt={handleExamplePrompt} />}
      <MessageInput
        onSend={handleSend}
        value={inputValue}
        setCurrentMessage={setCurrentMessage}
        onChange={setInputValue}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        availableModels={availableModels}
      />
    </div>
  );
}
