import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Message } from './dummyData';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { MessageDoc } from '@/models/Message';
export default function MessageBubble({ message }: { message: MessageDoc }) {
  const isAssistant:boolean = (message.role=='assistant')
  return (
    <div className={`flex items-end gap-2 ${!isAssistant ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${!isAssistant ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
        {isAssistant ? (
          <div className="prose dark:prose-invert max-w-none break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {message.message}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.message}</p>
        )}
        {/* <span className={`mt-1 block text-[10px] ${!isAssistant ? 'text-blue-100' : 'text-gray-400'}`}>{message.created_at.toLocaleDateString()}</span> */}
      </div>
    </div>
  );
}
