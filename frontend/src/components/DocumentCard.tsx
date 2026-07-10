import { Link } from 'react-router-dom';
import type { Document } from '../types';
import { StatusBadge } from './StatusBadge';
import { useState } from 'react';

interface DocumentCardProps {
  document: Document;
  onDelete: (id: number) => Promise<void>;
  className?: string;
  featured?: boolean;
}

export const DocumentCard = ({ document, onDelete, className = '', featured = false }: DocumentCardProps) => {
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
    <div className={`card-interactive p-6 flex flex-col h-full ${className}`}>
      <div className="flex justify-between items-start mb-4 gap-3">
        <h3
          className={`font-medium text-ink truncate ${featured ? 'text-xl' : 'text-base'}`}
          title={document.title}
        >
          {document.title}
        </h3>
        <StatusBadge status={document.status} />
      </div>

      <div className={`text-sm text-ink-muted flex-1 space-y-1 ${featured ? 'mb-8' : 'mb-6'}`}>
        <p>Uploaded {new Date(document.uploaded_at).toLocaleDateString()}</p>
        {document.status === 'ready' && <p>{document.chunk_count} chunks indexed</p>}
        {featured && document.message_count > 0 && (
          <p>{document.message_count} messages</p>
        )}
        {document.status === 'failed' && (
          <p className="text-red-400 text-xs mt-2 truncate" title={document.error_message || ''}>
            {document.error_message || 'Processing failed'}
          </p>
        )}
      </div>

      <div className="flex gap-3 mt-auto">
        <Link
          to={`/documents/${document.id}/chat`}
          className={`btn-primary flex-1 ${
            document.status === 'failed' ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
          }`}
        >
          Chat
        </Link>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="btn-secondary"
        >
          {isDeleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

function getBentoClass(index: number): string {
  const patterns = [
    'md:col-span-2 md:row-span-2',
    '',
    '',
    'md:col-span-2',
    'md:row-span-2',
    '',
  ];
  return patterns[index % patterns.length];
}

export { getBentoClass };
