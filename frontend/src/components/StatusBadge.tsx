import type { Document } from '../types';
import { Spinner } from './Spinner';

interface StatusBadgeProps {
  status: Document['status'];
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border';

  switch (status) {
    case 'uploaded':
      return (
        <span className={`${baseClasses} bg-white/5 text-ink-faint border-border`}>
          Uploaded
        </span>
      );
    case 'processing':
      return (
        <span className={`${baseClasses} bg-white/5 text-ink-muted border-border`}>
          <Spinner className="w-3 h-3 mr-2 text-accent" />
          Processing
        </span>
      );
    case 'ready':
      return (
        <span className={`${baseClasses} bg-accent/10 text-accent border-accent/20`}>
          Ready
        </span>
      );
    case 'failed':
      return (
        <span className={`${baseClasses} bg-red-500/10 text-red-400 border-red-500/20`}>
          Failed
        </span>
      );
    default:
      return null;
  }
};
