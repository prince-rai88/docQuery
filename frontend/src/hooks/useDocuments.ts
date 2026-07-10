import { useState, useEffect, useCallback } from 'react';
import { documentsApi } from '../api/documents';
import type { Document } from '../types';

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await documentsApi.list();
      setDocuments(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to loaded documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const deleteDocument = async (id: number) => {
    await documentsApi.delete(id);
    setDocuments(docs => docs.filter(d => d.id !== id));
  };

  return { documents, setDocuments, isLoading, error, refetch: fetchDocuments, deleteDocument };
};
