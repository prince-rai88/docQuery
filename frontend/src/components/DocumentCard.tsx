import { Link } from 'react-router-dom';
import type { Document } from '../types';
import { StatusBadge } from './StatusBadge';
import { useState } from 'react';

interface DocumentCardProps {
  document: Document;
  onDelete: (id: number) => Promise<void>;
}

export const DocumentCard = ({ document, onDelete }: DocumentCardProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    setIsDeleting(true);
    try {
      await onDelete(document.id);
    } catch (e) {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium text-slate-900 truncate" title={document.title}>
          {document.title}
        </h3>
        <StatusBadge status={document.status} />
      </div>
      
      <div className="text-sm text-slate-500 mb-6 flex-1 space-y-1">
        <p>Uploaded: {new Date(document.uploaded_at).toLocaleDateString()}</p>
        {document.status === 'ready' && <p>Chunks: {document.chunk_count}</p>}
        {document.status === 'failed' && <p className="text-red-500 text-xs mt-2 truncate" title={document.error_message || ''}>{document.error_message || 'Processing failed'}</p>}
      </div>

      <div className="flex space-x-3 mt-auto">
        <Link
          to={`/documents/${document.id}/chat`}
          className={`flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 
            ${document.status === 'failed' ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          Chat
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex justify-center items-center px-4 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {isDeleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};
