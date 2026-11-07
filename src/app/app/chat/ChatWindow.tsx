'use client';
import { useState, useEffect } from 'react';
import ChatHeader from './ChatHeader';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { chatPartner, Message } from './dummyData';
import { useParams } from 'next/navigation';
import StartChat from './StartChat';
import { useAgentStream } from '@/lib/ai_service/use-agent-stream';

export default function ChatWindow() {
  const params = useParams()
  const chatId = params.chatId as string

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  //CUSTOM HOOK
  const {runAgentStream, events, loading:streamLoading} = useAgentStream()
  console.log(events)

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    fetch(`/api/chat/${chatId}`)
      .then((r) => r.json())
      .then((json) => {
        const data = json?.data ?? [];
        const mapped: Message[] = data.map((m: any, i: number) => ({
          id: m._id ?? `m-${i}`,
          text: m.message,
          timestamp: new Date(m.createdAt ?? m.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sender: m.role === 'user' ? 'me' : 'them',
          date: 'Today',
        }));
        setMessages(mapped);
      })
      .finally(() => setLoading(false));
  }, [chatId]);

  if(!chatId) return <div> Loading</div>

  useEffect(()=>{
    if(messages.length == 1) runAgentStream(chatId,"")
  },[messages])

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
      {loading && <div className="p-4 text-sm text-gray-500">Loading...</div>}
      {chatId && <MessageList messages={messages} partner={chatPartner} />}
      {!chatId && <StartChat onExamplePrompt={handleExamplePrompt} />}
      <MessageInput onSend={handleSend} value={inputValue} onChange={setInputValue} />
    </div>
  );
}
