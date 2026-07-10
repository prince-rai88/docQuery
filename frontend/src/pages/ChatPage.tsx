import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocument } from '../hooks/useDocument';
import { useChat } from '../hooks/useChat';
import { ChatBubble } from '../components/ChatBubble';
import { StatusBadge } from '../components/StatusBadge';
import { ChatPageSkeleton } from '../components/ChatPageSkeleton';
import { ChatMessagesSkeleton } from '../components/ChatMessagesSkeleton';
import { Spinner } from '../components/Spinner';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const docId = id ? parseInt(id, 10) : undefined;

  const { document, isLoading: isDocLoading, error: docError } = useDocument(docId);
  const { messages, isLoading: isChatLoading, isSending, error: chatError, sendError, sendMessage } = useChat(docId);

  const [question, setQuestion] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isSending || document?.status !== 'ready') return;
    const currentQuestion = question;
    setQuestion('');
    await sendMessage(currentQuestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (isDocLoading) {
    return <ChatPageSkeleton />;
  }

  if (docError || !document) {
    return (
      <div className="alert-error">
        {docError || 'Document not found'}
      </div>
    );
  }

  const isProcessing = document.status === 'processing';
  const isFailed = document.status === 'failed';
  const isReady = document.status === 'ready';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="card border-b-0 rounded-b-none px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex flex-col overflow-hidden">
          <Link to="/" className="link-accent text-xs mb-1 inline-flex items-center">
            &larr; Back to Dashboard
          </Link>
          <h2 className="text-xl font-semibold text-ink truncate pr-4 tracking-tight" title={document.title}>
            {document.title}
          </h2>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <div className="flex-1 bg-canvas overflow-y-auto p-6 border-x border-border">
        {isChatLoading ? (
          <ChatMessagesSkeleton />
        ) : chatError ? (
          <div className="text-center text-red-400 py-8 text-sm">{chatError}</div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-ink-faint">
            <div className="w-12 h-12 mb-4 rounded-full bg-surface border border-border flex items-center justify-center">
              <svg className="w-6 h-6 text-accent opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-ink-muted">Ask a question about this document to get started</p>
          </div>
        ) : (
          <div className="flex flex-col max-w-3xl mx-auto">
            {messages.map(msg => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isSending && (
              <div className="flex w-full mb-6 gap-3 flex-row-reverse animate-message-in">
                <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="max-w-[80%] rounded-card px-4 py-4 bg-accent text-white inline-flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  <span className="text-sm opacity-90">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="card border-t-0 rounded-t-none p-4 shrink-0">
        {sendError && (
          <div className="mb-3 text-xs text-red-400 bg-red-500/10 p-3 rounded-card border border-red-500/20 flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {sendError}
          </div>
        )}

        {isProcessing && (
          <div className="mb-3 text-xs text-ink-muted bg-surface p-3 rounded-card border border-border flex items-center gap-2">
            <Spinner className="w-4 h-4 text-accent" />
            Document is still processing. Chat unlocks when ready.
          </div>
        )}

        {isFailed && (
          <div className="mb-3 text-xs text-red-400 bg-red-500/10 p-3 rounded-card border border-red-500/20">
            Document processing failed. Chat is disabled.
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto flex items-end">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isReady || isSending}
            placeholder={
              !isReady ? 'Chat disabled…' :
              'Ask a question… (Shift+Enter for new line)'
            }
            className="input-field resize-none py-3 pl-4 pr-12 text-sm disabled:bg-surface-raised disabled:text-ink-faint max-h-32"
            rows={1}
            style={{
              minHeight: '48px',
              height: question.split('\n').length > 1 ? `${Math.min(question.split('\n').length * 24 + 24, 128)}px` : '48px',
            }}
          />
          <button
            type="submit"
            disabled={!question.trim() || !isReady || isSending}
            className="absolute right-2 bottom-2 p-2 text-white bg-accent rounded-card
                       hover:bg-accent-hover active:bg-accent-active
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface
                       disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 ease-out"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
