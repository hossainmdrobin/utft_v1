import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Message } from './dummyData';

export default function MessageBubble({ message, partner }: { message: Message; partner: User }) {
  const isMe = message.sender === 'me';
  return (
    <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={partner.avatar} alt={partner.name} />
          <AvatarFallback>{partner.name[0]}</AvatarFallback>
        </Avatar>
      )}
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <p>{message.text}</p>
        <span className={`mt-1 block text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>{message.timestamp}</span>
      </div>
    </div>
  );
}
