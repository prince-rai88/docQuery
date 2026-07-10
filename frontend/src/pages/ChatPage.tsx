import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDocument } from '../hooks/useDocument';
import { useChat } from '../hooks/useChat';
import { ChatBubble } from '../components/ChatBubble';
import { StatusBadge } from '../components/StatusBadge';
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
    return <div className="p-8 flex justify-center"><Spinner className="w-8 h-8 text-indigo-600" /></div>;
  }

  if (docError || !document) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg shadow-sm">
        {docError || 'Document not found'}
      </div>
    );
  }

  const isProcessing = document.status === 'processing';
  const isFailed = document.status === 'failed';
  const isReady = document.status === 'ready';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-lg shadow-sm shrink-0">
        <div className="flex flex-col overflow-hidden">
          <Link to="/" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mb-1 inline-flex items-center">
            &larr; Back to Dashboard
          </Link>
          <h2 className="text-lg font-bold text-slate-900 truncate pr-4" title={document.title}>
            {document.title}
          </h2>
        </div>
        <StatusBadge status={document.status} />
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-slate-50 overflow-y-auto p-6 border-x border-slate-200">
        {isChatLoading ? (
          <div className="flex justify-center py-8"><Spinner className="w-6 h-6 text-indigo-400" /></div>
        ) : chatError ? (
          <div className="text-center text-red-500 py-8 text-sm">{chatError}</div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <svg className="w-12 h-12 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <p className="text-sm">No messages yet. Ask a question about the document!</p>
          </div>
        ) : (
          <div className="flex flex-col max-w-3xl mx-auto">
            {messages.map(msg => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            {isSending && (
              <div className="flex w-full mb-6 justify-end">
                <div className="max-w-[85%] rounded-2xl px-5 py-3.5 shadow-sm bg-indigo-600 text-white rounded-br-sm inline-flex items-center">
                  <Spinner className="w-4 h-4 mr-2" />
                  <span className="text-sm opacity-90">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border border-t-0 border-slate-200 p-4 rounded-b-lg shadow-sm shrink-0">
        {sendError && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-center">
             <svg className="w-4 h-4 mr-1.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
             {sendError}
          </div>
        )}
        
        {isProcessing && (
          <div className="mb-3 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-center">
            <Spinner className="w-4 h-4 mr-2 text-amber-600" />
            Document is still processing. You cannot chat until it's ready.
          </div>
        )}

        {isFailed && (
          <div className="mb-3 text-xs text-red-700 bg-red-50 p-2 rounded border border-red-200 flex items-center">
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
              !isReady ? 'Chat disabled...' : 
              'Ask a question... (Shift+Enter for new line)'
            }
            className="block w-full resize-none rounded-lg border border-slate-300 py-3 pl-4 pr-12 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm disabled:bg-slate-50 disabled:text-slate-500 max-h-32"
            rows={1}
            style={{ 
              minHeight: '44px', 
              height: question.split('\n').length > 1 ? `${Math.min(question.split('\n').length * 20 + 24, 128)}px` : '44px' 
            }}
          />
          <button
            type="submit"
            disabled={!question.trim() || !isReady || isSending}
            className="absolute right-2 bottom-2 p-1.5 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
          </button>
        </form>
      </div>
    </div>
  );
}
