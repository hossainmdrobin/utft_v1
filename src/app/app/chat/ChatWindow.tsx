'use client';
import { useState } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { chatPartner, initialMessages, Message } from './dummyData';

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const handleSend = (text: string) => {
    const msg: Message = {
      id: `m-${Date.now()}`,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender: 'me',
      date: 'Today',
    };
    setMessages((prev) => [...prev, msg]);
  };
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-transparent shadow-md">
      <ChatHeader partner={chatPartner} />
      <MessageList messages={messages} partner={chatPartner} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
