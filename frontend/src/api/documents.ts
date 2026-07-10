import { apiClient } from './client';
import type { Document, ChatMessage, DocumentStatus } from '../types';

export const documentsApi = {
  list: async () => {
    // Note: Django default pagination usually returns { count, next, previous, results }
    // Let's assume pagination is configured; we'll return results
    const response = await apiClient.get<{ results: Document[] }>('/documents/');
    return response.data.results;
  },
  get: async (id: number) => {
    const response = await apiClient.get<Document>(`/documents/${id}/`);
    return response.data;
  },
  upload: async (file: File, title: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    const response = await apiClient.post<Document>('/documents/', formData);
    return response.data;
  },
  delete: async (id: number) => {
    await apiClient.delete(`/documents/${id}/`);
  },
  getStatus: async (id: number) => {
    const response = await apiClient.get<DocumentStatus>(`/documents/${id}/status/`);
    return response.data;
  },
  getChat: async (id: number) => {
    const response = await apiClient.get<ChatMessage[]>(`/documents/${id}/chat/`);
    return response.data;
  },
  sendChat: async (id: number, question: string) => {
    const response = await apiClient.post<{ question: string, answer: string }>(`/documents/${id}/chat/`, { question });
    return response.data;
  }
};
