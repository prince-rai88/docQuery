import type { ChatMessage } from '../types';

export const ChatBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm text-sm ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-sm' 
            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        <div className={`text-[10px] mt-2 text-right ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
