import type { Document } from '../types';
import { Spinner } from './Spinner';

interface StatusBadgeProps {
  status: Document['status'];
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  switch (status) {
    case 'uploaded':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
          Uploaded
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <Spinner className="w-3 h-3 mr-1.5 text-amber-700" />
          Processing
        </span>
      );
    case 'ready':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          Ready
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Failed
        </span>
      );
    default:
      return null;
  }
};
