'use client';
import { useEffect, useRef } from 'react';
import { Message } from './dummyData';
import { User } from './dummyData';
import MessageBubble from './MessageBubble';

export default function MessageList({ messages, partner }: { messages: Message[]; partner: User }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return <div className="flex flex-1 items-center justify-center text-sm text-gray-400">No messages yet</div>;
  }

  const groups: { date: string; items: Message[] }[] = [];
  messages.forEach((m) => {
    const last = groups[groups.length - 1];
    if (!last || last.date !== m.date) groups.push({ date: m.date, items: [m] });
    else last.items.push(m);
  });

  return (
    <div className="flex-1 overflow-y-auto bg-transparent px-4 py-4">
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.date} className="space-y-3">
            <div className="flex justify-center">
              <span className="rounded-full bg-gray-200 px-3 py-1 text-xs text-gray-600">{g.date}</span>
            </div>
            {g.items.map((m) => (
              <MessageBubble key={m.id} message={m} partner={partner} />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
