'use client';
import { useState } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { chatPartner, initialMessages, Message } from './dummyData';
import { useParams } from 'next/navigation';
import StartChat from './StartChat';
import { useGetMessageByChatIdQuery } from '@/store/slices/chatSlice/api.chat';

export default function ChatWindow() {
  const params = useParams()
  const chatId = params.chatId as string

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const { data } = useGetMessageByChatIdQuery({id:chatId})
  console.log(data);
  const handleSend = (text: string) => {
    const msg: Message = {
      id: `m-${Date.now()}`,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'me',
      date: 'Today',
    };
    setMessages((prev) => [...prev, msg]);
    setInputValue('');
  };

  const handleExamplePrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <div className="flex relative h-full flex-col overflow-hidden rounded-xl border bg-transparent shadow-md">
      <ChatHeader partner={chatPartner} />
      {chatId && <MessageList messages={messages} partner={chatPartner} />}
      {!chatId && <StartChat onExamplePrompt={handleExamplePrompt} />}
      <MessageInput onSend={handleSend} value={inputValue} onChange={setInputValue} />
    </div>
  );
}
