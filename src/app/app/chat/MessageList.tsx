'use client';
import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { AgentEvent } from '@/lib/ai_service/events';
import { ChatPanel } from './chat-panel';
import { MessageDoc } from '@/models/Message';


export default function MessageList({ messages, events,currentMessage }: { messages: MessageDoc[]; events: AgentEvent[],currentMessage:string }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages?.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-gray-400">No messages yet</div>;
  }
  const currentMessageObj:MessageDoc = {message:currentMessage || "",role:'user'}

  return (
    <div className="flex-1 overflow-y-auto bg-transparent px-4 py-4">
      <div className="space-y-4">
        <div className="space-y-3">
          {messages && messages?.map((m,i) => (
            <MessageBubble key={i} message={m} />
          ))}
        </div>
        {currentMessage && <MessageBubble message={currentMessageObj} />}

        <ChatPanel events={events} />

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
