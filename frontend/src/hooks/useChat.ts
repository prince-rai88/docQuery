import { useState, useEffect, useCallback } from 'react';
import { documentsApi } from '../api/documents';
import type { ChatMessage } from '../types';

export const useChat = (id: number | undefined) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await documentsApi.getChat(id);
      setMessages(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (question: string) => {
    if (!id) return;
    setIsSending(true);
    setSendError(null);
    try {
      // Optimistic update for UX
      const tempIdUser = Date.now();
      const userMessage: ChatMessage = {
          id: tempIdUser,
          role: 'user',
          content: question,
          created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      await documentsApi.sendChat(id, question);
      
      // We could ideally return the complete message objects from the backend,
      // but since it returns { question, answer }, we mock the structure 
      // or re-fetch messages. Let's just refetch to get accurate IDs and timestamps.
      // A faster way is to append manually, but standard behavior here:
      await fetchMessages();
    } catch (err: any) {
      let msg = err.response?.data?.detail || 'Failed to send message';
      if (err.response?.status === 409) {
          msg = 'Document is still being processed. Please wait a moment.';
      }
      setSendError(msg);
      // Remove optimistic user message if failed
      setMessages(prev => prev.filter(m => m.content !== question || m.role !== 'user'));
    } finally {
      setIsSending(false);
    }
  };

  return { messages, isLoading, isSending, error, sendError, sendMessage };
};
