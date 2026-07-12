import { useState, useEffect, useCallback, useRef } from 'react';
import { documentsApi } from '../api/documents';
import type { Document } from '../types';

export const useDocument = (id: number | undefined) => {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const documentStatus = document?.status;

  const fetchDocument = useCallback(async () => {
    if (!id) return;
    try {
      const doc = await documentsApi.get(id);
      setDocument(doc);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load document');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      fetchDocument();
    }
  }, [id, fetchDocument]);

  useEffect(() => {
    if (documentStatus && ['uploaded', 'processing'].includes(documentStatus) && id) {
      timerRef.current = window.setInterval(async () => {
        try {
          const statusResult = await documentsApi.getStatus(id);
          setDocument(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              status: statusResult.status,
              processed_at: statusResult.processed_at,
              error_message: statusResult.error_message
            };
          });
          if (statusResult.status !== 'processing') {
             if (timerRef.current) clearInterval(timerRef.current);
          }
        } catch {
             // Handle poll error silently
        }
      }, 3000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [documentStatus, id]);

  return { document, isLoading, error, refetch: fetchDocument };
};
