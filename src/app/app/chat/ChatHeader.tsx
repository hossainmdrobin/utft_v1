import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreVertical } from 'lucide-react';
import { User } from './dummyData';

export default function ChatHeader({ partner }: { partner: User }) {
  return (
    <div className="flex items-center justify-between border-b bg-transparent px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={partner.avatar} alt={partner.name} />
          <AvatarFallback>{partner.name[0]}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{partner.name}</h2>
          <p className="text-xs text-gray-500">{partner.online ? 'Online' : 'Offline'}</p>
        </div>
      </div>
      <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
        <MoreVertical className="h-5 w-5" />
      </button>
    </div>
  );
}
