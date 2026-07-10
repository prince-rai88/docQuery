import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../types';

const UserAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  </div>
);

const AssistantAvatar = () => (
  <div className="w-8 h-8 rounded-full bg-surface-raised border border-border flex items-center justify-center shrink-0">
    <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  </div>
);

export const ChatBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex w-full mb-6 gap-3 animate-message-in ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {isUser ? <UserAvatar /> : <AssistantAvatar />}

      <div
        className={`max-w-[80%] rounded-card px-4 py-4 text-sm ${
          isUser
            ? 'bg-accent text-white'
            : 'bg-surface-raised border border-border text-ink'
        }`}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="markdown-body">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <div className={`text-xs mt-2 ${isUser ? 'text-white/60 text-right' : 'text-ink-faint'}`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
