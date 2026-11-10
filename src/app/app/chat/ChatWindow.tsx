'use client';
import { useState, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useParams } from 'next/navigation';
import StartChat from './StartChat';
import { useAgentStream } from '@/lib/ai_service/use-agent-stream';
import { useGetMessageByChatIdQuery } from '@/store/slices/chatSlice/api.chat';
import ChatHeader from './ChatHeader';


export default function ChatWindow() {
  const params = useParams()
  const chatId = params.chatId as string

  const [inputValue, setInputValue] = useState('');
  const [currentMessage, setCurrentMessage] = useState("");
  const { data, refetch: refetchMessage } = useGetMessageByChatIdQuery({ id: chatId })
  //CUSTOM HOOK
  const { runAgentStream, events, loading: streamLoading } = useAgentStream()

  useEffect(() => {
    if (data?.data?.length == 1 && !streamLoading) runAgentStream(chatId, "")
  }, [data])

  useEffect(() => {
    const isDone = events.find(item => item.type == 'done')
    const isMessage = events.find(item=>item.type=='message')
    if (isDone) {
      refetchMessage()
    }
    if(isMessage) setCurrentMessage("")
  }, [events])

  const handleExamplePrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <div className="flex relative h-full flex-col overflow-hidden rounded-xl border bg-transparent shadow-md">
      <ChatHeader />
      {streamLoading && <div className="p-4 text-sm text-gray-500">Loading...</div>}
      {chatId && data && <MessageList events={events} messages={data.data} currentMessage={currentMessage} />}
      {!chatId && <StartChat onExamplePrompt={handleExamplePrompt} />}
      <MessageInput onSend={runAgentStream} value={inputValue} setCurrentMessage={setCurrentMessage} onChange={setInputValue}/>
    </div>
  );
}
